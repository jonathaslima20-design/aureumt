import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getGeminiKey(admin: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data: own } = await admin
    .from("api_configs")
    .select("gemini_key")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (own?.gemini_key) return own.gemini_key;

  const { data: global } = await admin
    .from("api_configs")
    .select("gemini_key")
    .is("user_id", null)
    .eq("is_active", true)
    .maybeSingle();

  return global?.gemini_key || "";
}

async function verifyKnowledgeBaseOwnership(
  admin: ReturnType<typeof createClient>,
  knowledgeBaseId: string,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from("knowledge_bases")
    .select("user_id")
    .eq("id", knowledgeBaseId)
    .maybeSingle();
  return !!data && data.user_id === userId;
}

async function extractTextWithGemini(
  apiKey: string,
  base64Data: string,
  mimeType: string,
  instruction: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: instruction },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 16000 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .trim();
}

async function scrapeUrlDirect(sourceUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`Nao foi possivel acessar a URL (status ${res.status})`);

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/pdf")) {
      throw new Error("URLs de PDF nao sao suportadas. Faca upload do arquivo na aba Arquivo.");
    }

    const html = await res.text();
    if (!html || html.length < 50) throw new Error("A pagina retornou conteudo vazio");

    const stripped = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
      .replace(/<dialog[^>]*>[\s\S]*?<\/dialog>/gi, "")
      .replace(/<[^>]*class="[^"]*(?:cookie|popup|banner|modal|overlay)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    return stripped.slice(0, 80000);
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeUrlViaJina(sourceUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const jinaUrl = `https://r.jina.ai/${sourceUrl}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "User-Agent": "Mozilla/5.0",
      },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Jina error: ${res.status}`);
    const text = await res.text();
    return text.slice(0, 80000);
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeUrl(sourceUrl: string): Promise<string> {
  const direct = await scrapeUrlDirect(sourceUrl);
  if (direct.length >= 500) return direct;

  try {
    const jina = await scrapeUrlViaJina(sourceUrl);
    if (jina.length > direct.length) return jina;
  } catch {
    // fallback to direct result
  }

  return direct;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return jsonResponse({ error: "unauthorized" }, 401);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── scrape_url ────────────────────────────────────────────────────────────
    if (action === "scrape_url") {
      const body = await req.json();
      const { knowledge_base_id, source_url, title } = body;

      if (!source_url || typeof source_url !== "string") {
        return jsonResponse({ error: "URL e obrigatoria" }, 400);
      }
      if (!source_url.startsWith("http://") && !source_url.startsWith("https://")) {
        return jsonResponse({ error: "URL deve comecar com http:// ou https://" }, 400);
      }
      if (!knowledge_base_id) {
        return jsonResponse({ error: "knowledge_base_id e obrigatorio" }, 400);
      }

      const allowed = await verifyKnowledgeBaseOwnership(admin, knowledge_base_id, user.id);
      if (!allowed) return jsonResponse({ error: "forbidden" }, 403);

      const content = await scrapeUrl(source_url);
      if (!content || content.length < 20) {
        return jsonResponse({ error: "Nao foi possivel extrair conteudo significativo desta URL." }, 400);
      }

      const cleanedContent = cleanExtractedText(content);

      const { data: source, error: insertErr } = await admin
        .from("knowledge_sources")
        .insert({
          knowledge_base_id,
          type: "url",
          title: title || source_url,
          content: cleanedContent,
          metadata: { url: source_url, char_count: cleanedContent.length },
        })
        .select()
        .single();

      if (insertErr) return jsonResponse({ error: insertErr.message }, 500);
      return jsonResponse({ ok: true, source });
    }

    // ── process_file ──────────────────────────────────────────────────────────
    if (action === "process_file") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const knowledgeBaseId = formData.get("knowledge_base_id") as string;
      const title = formData.get("title") as string;

      if (!file || !knowledgeBaseId) {
        return jsonResponse({ error: "missing file or knowledge_base_id" }, 400);
      }

      if (file.size > 15 * 1024 * 1024) {
        return jsonResponse({ error: "Arquivo muito grande. Limite: 15MB" }, 400);
      }

      const allowed = await verifyKnowledgeBaseOwnership(admin, knowledgeBaseId, user.id);
      if (!allowed) return jsonResponse({ error: "forbidden" }, 403);

      const geminiKey = await getGeminiKey(admin, user.id);
      if (!geminiKey) return jsonResponse({ error: "No Gemini API key configured" }, 400);

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);

      const mime = file.type || "application/octet-stream";
      let content: string;

      if (mime === "text/plain" || file.name.endsWith(".txt")) {
        content = new TextDecoder().decode(buffer);
      } else {
        content = await extractTextWithGemini(
          geminiKey,
          base64,
          mime,
          "Extract ALL text content from this document. Return only the raw text, preserving structure with line breaks. Do not add commentary or summaries."
        );
      }

      if (!content || content.length < 10) {
        return jsonResponse({ error: "Nao foi possivel extrair texto do arquivo" }, 400);
      }

      const cleanedContent = cleanExtractedText(content).slice(0, 150000);

      const { data: source, error: insertErr } = await admin
        .from("knowledge_sources")
        .insert({
          knowledge_base_id: knowledgeBaseId,
          type: "file",
          title: title || file.name,
          content: cleanedContent,
          metadata: { filename: file.name, mime_type: mime, size_bytes: buffer.byteLength, char_count: cleanedContent.length },
        })
        .select()
        .single();

      if (insertErr) return jsonResponse({ error: insertErr.message }, 500);
      return jsonResponse({ ok: true, source });
    }

    // ── transcribe_audio ──────────────────────────────────────────────────────
    if (action === "transcribe_audio") {
      const formData = await req.formData();
      const audio = formData.get("audio") as File | null;
      const knowledgeBaseId = formData.get("knowledge_base_id") as string;
      const title = formData.get("title") as string;

      if (!audio || !knowledgeBaseId) {
        return jsonResponse({ error: "missing audio or knowledge_base_id" }, 400);
      }

      const allowed = await verifyKnowledgeBaseOwnership(admin, knowledgeBaseId, user.id);
      if (!allowed) return jsonResponse({ error: "forbidden" }, 403);

      const geminiKey = await getGeminiKey(admin, user.id);
      if (!geminiKey) return jsonResponse({ error: "No Gemini API key configured" }, 400);

      const buffer = await audio.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      const mime = audio.type || "audio/webm";

      const content = await extractTextWithGemini(
        geminiKey,
        base64,
        mime,
        "Transcribe this audio completely in the original language spoken. Return only the transcription text, no timestamps or speaker labels."
      );

      if (!content || content.length < 5) {
        return jsonResponse({ error: "Nao foi possivel transcrever o audio" }, 400);
      }

      const cleanedContent = cleanExtractedText(content);

      const { data: source, error: insertErr } = await admin
        .from("knowledge_sources")
        .insert({
          knowledge_base_id: knowledgeBaseId,
          type: "audio",
          title: title || "Gravacao de voz",
          content: cleanedContent,
          metadata: { mime_type: mime, size_bytes: buffer.byteLength, char_count: cleanedContent.length },
        })
        .select()
        .single();

      if (insertErr) return jsonResponse({ error: insertErr.message }, 500);
      return jsonResponse({ ok: true, source });
    }

    return jsonResponse({ error: "invalid action" }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    console.error("Knowledge function error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
