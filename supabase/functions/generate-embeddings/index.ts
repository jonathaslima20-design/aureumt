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

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;
const EMBEDDING_BATCH_SIZE = 8;
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const sections = text.split(/\n\n---\n\n/);
  const chunks: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length === 0) continue;

    if (trimmed.length <= CHUNK_SIZE) {
      chunks.push(trimmed);
      continue;
    }

    const paragraphs = trimmed.split(/\n\n+/);
    let current = "";

    for (const para of paragraphs) {
      const p = para.trim();
      if (!p) continue;

      if (current.length + p.length + 2 <= CHUNK_SIZE) {
        current = current ? current + "\n\n" + p : p;
      } else {
        if (current) {
          chunks.push(current);
          const overlapStart = Math.max(0, current.length - CHUNK_OVERLAP);
          const overlap = current.slice(overlapStart);
          current = overlap + "\n\n" + p;
        } else {
          current = p;
        }

        while (current.length > CHUNK_SIZE) {
          let splitAt = CHUNK_SIZE;
          const lastSentence = current.lastIndexOf(". ", CHUNK_SIZE);
          const lastNewline = current.lastIndexOf("\n", CHUNK_SIZE);
          const lastSpace = current.lastIndexOf(" ", CHUNK_SIZE);

          if (lastSentence > CHUNK_SIZE * 0.4) splitAt = lastSentence + 1;
          else if (lastNewline > CHUNK_SIZE * 0.4) splitAt = lastNewline;
          else if (lastSpace > CHUNK_SIZE * 0.4) splitAt = lastSpace;

          chunks.push(current.slice(0, splitAt).trim());
          const overlapStart = Math.max(0, splitAt - CHUNK_OVERLAP);
          current = current.slice(overlapStart).trim();
        }
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }
  }

  return chunks.filter((c) => c.length >= 20);
}

async function generateEmbedding(
  apiKey: string,
  text: string
): Promise<number[] | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const body = {
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
    await new Promise((r) => setTimeout(r, Math.min(retryAfter * 1000, 10000)));
    const retry = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!retry.ok) return null;
    const retryData = await retry.json();
    return retryData?.embedding?.values || null;
  }

  if (!res.ok) {
    console.error(`Embedding API error: ${res.status}`);
    return null;
  }

  const data = await res.json();
  return data?.embedding?.values || null;
}

async function generateEmbeddingsBatch(
  apiKey: string,
  texts: string[]
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(apiKey, text))
    );
    results.push(...batchResults);

    if (i + EMBEDDING_BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

async function getGeminiKey(
  admin: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
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

    const { knowledge_base_id } = await req.json();
    if (!knowledge_base_id) {
      return jsonResponse({ error: "knowledge_base_id is required" }, 400);
    }

    // Determine user: either from JWT or service-role (internal call)
    let userId = "";
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (isServiceRole) {
      const { data: kb } = await admin
        .from("knowledge_bases")
        .select("user_id")
        .eq("id", knowledge_base_id)
        .maybeSingle();
      if (!kb) return jsonResponse({ error: "knowledge base not found" }, 404);
      userId = kb.user_id;
    } else {
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !user) return jsonResponse({ error: "unauthorized" }, 401);
      userId = user.id;

      const { data: kb } = await admin
        .from("knowledge_bases")
        .select("user_id")
        .eq("id", knowledge_base_id)
        .maybeSingle();
      if (!kb || kb.user_id !== userId) {
        return jsonResponse({ error: "forbidden" }, 403);
      }
    }

    const geminiKey = await getGeminiKey(admin, userId);
    if (!geminiKey) {
      return jsonResponse({ error: "No Gemini API key configured" }, 400);
    }

    // Load consolidated knowledge source content
    const { data: source } = await admin
      .from("knowledge_sources")
      .select("id, content")
      .eq("knowledge_base_id", knowledge_base_id)
      .eq("type", "consolidated")
      .eq("is_active", true)
      .maybeSingle();

    if (!source || !source.content || source.content.trim().length < 20) {
      // No content to index -- clear existing chunks
      await admin
        .from("knowledge_chunks")
        .delete()
        .eq("knowledge_base_id", knowledge_base_id);
      return jsonResponse({ ok: true, chunks_created: 0, message: "No content to index" });
    }

    // Chunk the content
    const chunks = chunkText(source.content);
    if (chunks.length === 0) {
      await admin
        .from("knowledge_chunks")
        .delete()
        .eq("knowledge_base_id", knowledge_base_id);
      return jsonResponse({ ok: true, chunks_created: 0, message: "No viable chunks" });
    }

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddingsBatch(geminiKey, chunks);

    // Filter out chunks where embedding generation failed
    const validChunks: { content: string; embedding: number[]; index: number }[] = [];
    for (let i = 0; i < chunks.length; i++) {
      if (embeddings[i]) {
        validChunks.push({ content: chunks[i], embedding: embeddings[i]!, index: i });
      }
    }

    if (validChunks.length === 0) {
      return jsonResponse({ error: "Failed to generate embeddings for all chunks" }, 502);
    }

    // Clear old chunks for this knowledge base
    await admin
      .from("knowledge_chunks")
      .delete()
      .eq("knowledge_base_id", knowledge_base_id);

    // Insert new chunks
    const rows = validChunks.map((vc) => ({
      knowledge_source_id: source.id,
      knowledge_base_id,
      chunk_index: vc.index,
      content: vc.content,
      token_count: Math.ceil(vc.content.length / 4),
      embedding: JSON.stringify(vc.embedding),
    }));

    // Insert in batches of 50 to avoid payload size limits
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error: insertErr } = await admin.from("knowledge_chunks").insert(batch);
      if (insertErr) {
        console.error("Chunk insert error:", insertErr.message);
        return jsonResponse({ error: "Failed to store chunks: " + insertErr.message }, 500);
      }
    }

    console.log(`[generate-embeddings] kb=${knowledge_base_id} chunks=${validChunks.length}`);
    return jsonResponse({
      ok: true,
      chunks_created: validChunks.length,
      total_chars: chunks.reduce((sum, c) => sum + c.length, 0),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    console.error("generate-embeddings error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
