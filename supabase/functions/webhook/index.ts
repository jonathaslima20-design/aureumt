import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Creds = { url: string; key: string; gemini: string };

async function loadCreds(
  admin: ReturnType<typeof createClient>,
  userId: string
): Promise<Creds> {
  const { data: own } = await admin
    .from("api_configs")
    .select("gemini_key, evolution_url, evolution_key")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const { data: global } = await admin
    .from("api_configs")
    .select("gemini_key, evolution_url, evolution_key")
    .is("user_id", null)
    .eq("is_active", true)
    .maybeSingle();

  return {
    gemini: own?.gemini_key || global?.gemini_key || "",
    url: own?.evolution_url || global?.evolution_url || "",
    key: own?.evolution_key || global?.evolution_key || "",
  };
}

type MediaInfo = { type: "audio" | "image"; mimetype: string } | null;

function extractText(msg: Record<string, unknown> | null | undefined): string {
  if (!msg) return "";
  const m = msg as Record<string, unknown>;
  if (typeof m.conversation === "string") return m.conversation;
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  if (ext && typeof ext.text === "string") return ext.text;
  const imgMsg = m.imageMessage as Record<string, unknown> | undefined;
  if (imgMsg) return (imgMsg.caption as string) || "[imagem]";
  if (m.audioMessage || m.pttMessage) return "[audio]";
  if (m.stickerMessage) return "[sticker]";
  if (m.videoMessage) return (m.videoMessage as Record<string, unknown>).caption as string || "[video]";
  if (m.documentMessage) return (m.documentMessage as Record<string, unknown>).fileName as string || "[documento]";
  return "";
}

function extractMedia(msg: Record<string, unknown> | null | undefined): MediaInfo {
  if (!msg) return null;
  const m = msg as Record<string, unknown>;
  const audioMsg = (m.audioMessage || m.pttMessage) as Record<string, unknown> | undefined;
  if (audioMsg) {
    return { type: "audio", mimetype: (audioMsg.mimetype as string) || "audio/ogg; codecs=opus" };
  }
  const imgMsg = m.imageMessage as Record<string, unknown> | undefined;
  if (imgMsg) {
    return { type: "image", mimetype: (imgMsg.mimetype as string) || "image/jpeg" };
  }
  return null;
}

async function downloadMedia(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  messageKey: Record<string, unknown>
): Promise<{ base64: string; mimetype: string } | null> {
  const baseUrl = evolutionUrl.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", apikey: evolutionKey };
  const url = `${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
  const payload = { message: { key: messageKey }, convertToMp4: false };

  console.log("[downloadMedia] POST", url, JSON.stringify(payload).slice(0, 300));

  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    const text = await res.text();
    console.log("[downloadMedia] status:", res.status, "body:", text.slice(0, 500));
    if (!res.ok) return null;

    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch { return null; }

    const base64 = (
      data?.base64 ||
      data?.data ||
      (data?.message as Record<string, unknown>)?.base64MediaMessage ||
      ""
    ) as string;
    const mimetype = (
      data?.mimetype ||
      data?.mimeType ||
      (data?.message as Record<string, unknown>)?.mimetype ||
      ""
    ) as string;

    if (!base64) {
      console.log("[downloadMedia] no base64. Keys:", Object.keys(data));
      return null;
    }

    return { base64: base64.replace(/^data:[^;]+;base64,/, ""), mimetype };
  } catch (e) {
    console.error("[downloadMedia] fetch error:", e instanceof Error ? e.message : e);
    return null;
  }
}

function normalizeAudioMime(mimetype: string): string {
  const base = mimetype.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/ogg": "audio/ogg",
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mpeg",
    "audio/mp4": "audio/mp4",
    "audio/m4a": "audio/mp4",
    "audio/webm": "audio/webm",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
  };
  return map[base] || "audio/ogg";
}

// Transcribe audio or describe image using Gemini multimodal
async function processMediaWithGemini(
  apiKey: string,
  base64: string,
  mimetype: string,
  instruction: string
): Promise<string> {
  const gemMime = mimetype.startsWith("audio/")
    ? normalizeAudioMime(mimetype)
    : mimetype.split(";")[0].trim();

  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType: gemMime, data: base64 } },
        { text: instruction },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
  };

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { console.error(`[processMedia] ${model} error:`, res.status); continue; }
      const result = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      if (result) return result;
    } catch (e) {
      console.error(`[processMedia] ${model} error:`, e instanceof Error ? e.message : e);
    }
  }
  return "";
}

// Main Gemini call using systemInstruction for the knowledge base
async function callGemini(
  apiKey: string,
  systemInstruction: string,
  history: { role: string; text: string }[]
) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  const rawContents = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.text }],
  }));

  // Merge consecutive same-role messages, ensure first is "user"
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const item of rawContents) {
    if (contents.length === 0 && item.role === "model") continue;
    const last = contents[contents.length - 1];
    if (last && last.role === item.role) {
      last.parts[0].text += "\n" + item.parts[0].text;
    } else {
      contents.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
    }
  }

  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "oi" }] });
  }

  // Cap systemInstruction at 200k chars to avoid payload-too-large errors
  const cappedInstruction = systemInstruction.length > 200000
    ? systemInstruction.slice(0, 200000) + "\n\n[contexto truncado por limite de tamanho]"
    : systemInstruction;

  const body = {
    // systemInstruction carries the full KB context — Gemini treats it as the highest-priority context
    systemInstruction: { parts: [{ text: cappedInstruction }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
  };

  let lastError = "";
  for (const model of models) {
    // Retry once on 429 (rate limit) with a short backoff
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
          const waitMs = Math.min((retryAfter || 5) * 1000, 8000);
          lastError = `[${model}] 429 rate_limit — retrying after ${waitMs}ms`;
          console.warn("Gemini rate limit", lastError);
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          break;
        }

        if (!res.ok) {
          const errDetail = JSON.stringify(data?.error || data).slice(0, 400);
          lastError = `[${model}] HTTP ${res.status}: ${errDetail}`;
          console.error("Gemini API error", lastError);
          break;
        }

        const candidate = data?.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const text = candidate?.content?.parts?.[0]?.text;
        if (typeof text === "string" && text.trim().length > 0) {
          const tokens = data?.usageMetadata?.totalTokenCount || 0;
          return { text: text.trim(), tokens, error: "" };
        }
        if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
          console.warn(`[callGemini] ${model} finishReason=${finishReason}`);
          return { text: "Não consigo responder a isso.", tokens: 0, error: "" };
        }
        lastError = `[${model}] empty response finishReason=${finishReason ?? "null"}`;
        console.error("Gemini empty", lastError);
        break;
      } catch (e) {
        lastError = `[${model}] fetch_error: ${e instanceof Error ? e.message : String(e)}`;
        console.error("Gemini fetch failed", lastError);
        break;
      }
    }
  }

  console.error("[callGemini] all models failed. lastError:", lastError);
  return {
    text: "Desculpe, estou com uma instabilidade momentânea. Tente novamente em instantes.",
    tokens: 0,
    error: lastError,
  };
}

async function sendPresence(creds: Creds, instanceName: string, number: string, durationMs: number) {
  const url = `${creds.url.replace(/\/$/, "")}/chat/sendPresence/${instanceName}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.key },
      body: JSON.stringify({ number, presence: "composing", delay: durationMs + 500 }),
    });
  } catch (e) {
    console.error("[sendPresence] error:", e instanceof Error ? e.message : e);
  }
}

// Dynamic delay: 1 second per 50 characters, clamped between minDelay and maxDelay
function calcTypingDelay(text: string, minDelay: number, maxDelay: number): number {
  const MS_PER_CHAR = 1000 / 50; // 20ms per char → 1s per 50 chars
  const raw = Math.round(text.length * MS_PER_CHAR);
  return Math.max(minDelay, Math.min(maxDelay, raw));
}

async function simulateTyping(
  creds: Creds,
  instanceName: string,
  number: string,
  totalMs: number
) {
  const REFRESH_INTERVAL = 3800;
  await sendPresence(creds, instanceName, number, totalMs);
  let elapsed = 0;
  while (elapsed + REFRESH_INTERVAL < totalMs) {
    await new Promise((r) => setTimeout(r, REFRESH_INTERVAL));
    elapsed += REFRESH_INTERVAL;
    await sendPresence(creds, instanceName, number, totalMs - elapsed);
  }
  const remaining = totalMs - elapsed;
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

async function sendText(creds: Creds, instanceName: string, number: string, text: string) {
  const url = `${creds.url.replace(/\/$/, "")}/message/sendText/${instanceName}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.key },
      body: JSON.stringify({ number, text }),
    });
    const body = await res.text();
    if (!res.ok) console.error("[sendText] FAILED:", res.status, body.slice(0, 300));
  } catch (e) {
    console.error("[sendText] error:", e instanceof Error ? e.message : e);
  }
}

// Clean extracted text: normalize whitespace, strip control chars, collapse blank lines
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")         // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n")        // max 2 consecutive newlines
    .replace(/[ \t]+\n/g, "\n")        // trailing spaces before newline
    .replace(/\x00-\x08\x0b\x0c\x0e-\x1f\x7f/g, "") // control chars
    .trim();
}

const processedMessages = new Set<string>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = (payload?.event as string) || "";
  const instanceName = (payload?.instance || payload?.instanceName) as string;

  if (
    !event.toLowerCase().includes("messages.upsert") &&
    !event.toLowerCase().includes("messages_upsert")
  ) {
    return new Response(JSON.stringify({ ok: true, ignored: "event" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = (payload?.data || {}) as Record<string, unknown>;
  const key = data?.key as Record<string, unknown> | undefined;
  if (key?.fromMe === true) {
    return new Response(JSON.stringify({ ok: true, ignored: "fromMe" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messageId = (key?.id as string) || "";
  if (messageId && processedMessages.has(messageId)) {
    return new Response(JSON.stringify({ ok: true, ignored: "duplicate" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (messageId) {
    processedMessages.add(messageId);
    if (processedMessages.size > 1000) {
      const first = processedMessages.values().next().value;
      if (first) processedMessages.delete(first);
    }
  }

  const msgObj = data?.message as Record<string, unknown> | null | undefined;
  const messageType = (data?.messageType as string) || "";

  console.log("[webhook] event:", event, "instance:", instanceName, "messageType:", messageType);

  const text = extractText(msgObj);
  let media = extractMedia(msgObj);
  if (!media && (messageType === "audioMessage" || messageType === "pttMessage")) {
    media = { type: "audio", mimetype: "audio/ogg; codecs=opus" };
  }
  if (!media && messageType === "imageMessage") {
    media = { type: "image", mimetype: "image/jpeg" };
  }

  if (!text && !media) {
    return new Response(JSON.stringify({ ok: true, ignored: "no_text" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const remoteJid: string = (key?.remoteJid as string) || "";
  const customerNumber = remoteJid.replace(/@.*/, "");

  const task = (async () => {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // ── Resolve connection and agent ───────────────────────────────────────
      const { data: connection } = await admin
        .from("whatsapp_connections")
        .select("*, instances(*)")
        .eq("evolution_instance_id", instanceName)
        .maybeSingle();

      let instance: Record<string, unknown> | null = null;
      let connectionId: string | null = null;

      if (connection) {
        connectionId = connection.id;
        instance = connection.agent_id ? (connection.instances as Record<string, unknown>) : null;
        await admin.from("whatsapp_connections").update({ status: "open" }).eq("id", connection.id);
      } else {
        const { data: legacyInstance } = await admin
          .from("instances")
          .select("*")
          .eq("instance_name", instanceName)
          .maybeSingle();
        instance = legacyInstance;
      }

      if (!instance && !connectionId) return;

      // ── Log incoming message ───────────────────────────────────────────────
      await admin.from("chat_logs").insert({
        instance_id: instance?.id || null,
        whatsapp_connection_id: connectionId,
        customer_number: customerNumber,
        direction: "in",
        message_body: text,
        knowledge_hit: false,
      });

      if (!instance) return;

      // ── Overflow keyword check ─────────────────────────────────────────────
      const overflow = ((instance.overflow_keyword as string) || "").trim().toLowerCase();
      if (overflow && text.toLowerCase().includes(overflow)) {
        await admin.from("instances").update({ flow_status: "paused" }).eq("id", instance.id);
        return;
      }

      if (instance.flow_status !== "active") return;

      // ── Manual override check ──────────────────────────────────────────────
      const { data: convState } = await admin
        .from("conversation_states")
        .select("manual_override")
        .eq("instance_id", instance.id)
        .eq("customer_number", customerNumber)
        .maybeSingle();

      if (convState?.manual_override === true) return;

      const creds = await loadCreds(admin, instance.user_id as string);
      if (!creds.gemini || !creds.url || !creds.key) return;

      // ── Media processing (audio transcription / image description) ─────────
      let mediaContext = "";
      if (media && instance.is_multimodal_active !== false) {
        const rawKey = key as Record<string, unknown>;
        console.log("[webhook] media:", media.type);

        const MEDIA_TIMEOUT_MS = 15000;
        const downloaded = await Promise.race([
          downloadMedia(creds.url, creds.key, instanceName, rawKey),
          new Promise<null>((r) => setTimeout(() => r(null), MEDIA_TIMEOUT_MS)),
        ]);

        if (!downloaded) {
          const retryMsg = "Não consegui ouvir o áudio. Pode me enviar em texto?";
          const typingMs = calcTypingDelay(retryMsg, 800, 4000);
          await simulateTyping(creds, instanceName, remoteJid, typingMs);
          await sendText(creds, instanceName, remoteJid, retryMsg);
          await admin.from("chat_logs").insert({
            instance_id: instance.id,
            whatsapp_connection_id: connectionId,
            customer_number: customerNumber,
            direction: "out",
            message_body: retryMsg,
            tokens_used: 0,
            knowledge_hit: false,
          });
          return;
        }

        const instruction = media.type === "audio"
          ? "Transcreva este áudio fielmente. Retorne apenas a transcrição, sem comentários ou explicações."
          : "Descreva esta imagem de forma detalhada. Se houver produtos, preços, números, texto visível ou qualquer informação relevante, inclua tudo na descrição.";

        const processed = await Promise.race([
          processMediaWithGemini(
            creds.gemini,
            downloaded.base64,
            downloaded.mimetype || (media.type === "audio" ? "audio/ogg" : "image/jpeg"),
            instruction
          ),
          new Promise<string>((r) => setTimeout(() => r(""), MEDIA_TIMEOUT_MS)),
        ]);

        if (!processed && media.type === "audio") {
          const retryMsg = "Não consegui ouvir o áudio. Pode me enviar em texto?";
          const typingMs = calcTypingDelay(retryMsg, 800, 4000);
          await simulateTyping(creds, instanceName, remoteJid, typingMs);
          await sendText(creds, instanceName, remoteJid, retryMsg);
          await admin.from("chat_logs").insert({
            instance_id: instance.id,
            whatsapp_connection_id: connectionId,
            customer_number: customerNumber,
            direction: "out",
            message_body: retryMsg,
            tokens_used: 0,
            knowledge_hit: false,
          });
          return;
        }

        mediaContext = processed;
        console.log("[webhook] mediaContext length:", mediaContext.length);
      }

      // ── Load ALL active knowledge sources via instance_knowledge_bases ─────
      // RAG v2: full context loading — no keyword filtering, pass everything as
      // systemInstruction so Gemini can reason over the complete KB.
      let knowledgeContent = "";
      let knowledgeHit = false;

      const { data: kbLinks } = await admin
        .from("instance_knowledge_bases")
        .select("knowledge_base_id")
        .eq("instance_id", instance.id);

      const kbIds = (kbLinks || []).map((l: { knowledge_base_id: string }) => l.knowledge_base_id);

      if (kbIds.length > 0) {
        const { data: kbSources } = await admin
          .from("knowledge_sources")
          .select("content, title, type")
          .in("knowledge_base_id", kbIds)
          .eq("is_active", true)
          .limit(30);

        if (kbSources && kbSources.length > 0) {
          const chunks = kbSources.map((s: { title: string; type: string; content: string }) => {
            const cleaned = cleanText(s.content);
            return `### ${s.title} (${s.type.toUpperCase()})\n${cleaned}`;
          });
          // Cap total KB content at 80k chars — well within Gemini's 1M context window
          knowledgeContent = chunks.join("\n\n---\n\n").slice(0, 80000);
          knowledgeHit = true;
          console.log("[webhook] KB: loaded", kbSources.length, "sources,", knowledgeContent.length, "chars");
        }
      }

      // Also check legacy knowledge_sources linked directly to instance_id
      if (!knowledgeContent) {
        const { data: legacySources } = await admin
          .from("knowledge_sources")
          .select("content, title, type")
          .eq("instance_id", instance.id)
          .eq("is_active", true)
          .limit(20);

        if (legacySources && legacySources.length > 0) {
          const chunks = legacySources.map((s: { title: string; type: string; content: string }) => {
            const cleaned = cleanText(s.content);
            return `### ${s.title} (${s.type.toUpperCase()})\n${cleaned}`;
          });
          knowledgeContent = chunks.join("\n\n---\n\n").slice(0, 80000);
          knowledgeHit = true;
          console.log("[webhook] KB (legacy): loaded", legacySources.length, "sources");
        }
      }

      // ── Conversation history ───────────────────────────────────────────────
      const { data: history } = await admin
        .from("chat_logs")
        .select("direction, message_body")
        .eq("instance_id", instance.id)
        .eq("customer_number", customerNumber)
        .order("created_at", { ascending: false })
        .limit(10);

      const ordered = (history || []).reverse().map((h: { direction: string; message_body: string }) => ({
        role: h.direction === "in" ? "user" : "assistant",
        text: h.message_body.slice(0, 500),
      }));

      // If audio was transcribed, replace the placeholder "[audio]" in the last user turn
      if (mediaContext) {
        const lastMsg = ordered[ordered.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          lastMsg.text = mediaContext;
        }
      }

      // ── Build system instruction ───────────────────────────────────────────
      const lang = ((instance.language as string) || "pt-BR") as "pt-BR" | "en-US" | "es";

      const langLock: Record<string, string> = {
        "pt-BR": "Responda SEMPRE em português do Brasil.",
        "en-US": "ALWAYS reply in English (US).",
        "es": "Responde SIEMPRE en español.",
      };
      const formatRule: Record<string, string> = {
        "pt-BR": "Regras de formato: sem Markdown; texto puro; respostas curtas e humanas; saudação simples na primeira mensagem; use | apenas para separar ideias distintas; sem frases genéricas.",
        "en-US": "Format rules: no Markdown; plain text; short human answers; simple greeting on first message; use | only for distinct ideas; no generic phrases.",
        "es": "Reglas de formato: sin Markdown; texto puro; respuestas cortas y humanas; saludo simple en primer mensaje; usa | solo para ideas distintas; sin frases genéricas.",
      };
      const noKbInstruction: Record<string, string> = {
        "pt-BR": "Se a pergunta não puder ser respondida com as informações acima, diga gentilmente que não possui essa informação específica e pergunte se o cliente deseja falar com um consultor humano.",
        "en-US": "If the question cannot be answered with the information above, kindly say you don't have that specific information and ask if they'd like to speak with a human consultant.",
        "es": "Si la pregunta no puede responderse con la información anterior, di amablemente que no tienes esa información específica y pregunta si desea hablar con un consultor humano.",
      };

      const userPrompt = ((instance.system_prompt as string) || "").trim();
      const parts: string[] = [];

      if (knowledgeContent) {
        // RAG v2: KB-first system instruction structure
        if (userPrompt) {
          parts.push(userPrompt);
        } else {
          const who = (instance.persona_name as string) || "assistente";
          const co = instance.company_name ? `, da empresa ${instance.company_name}` : "";
          parts.push(`Você é ${who}${co}.`);
        }
        if (instance.signature) parts.push(`Sempre encerre com: "${instance.signature}".`);
        parts.push(langLock[lang] || langLock["pt-BR"]);
        parts.push(formatRule[lang] || formatRule["pt-BR"]);
        parts.push("BASE DE CONHECIMENTO OFICIAL:\n\nAs informações abaixo são a única fonte de verdade que você deve usar para responder. Priorize sempre este conteúdo.\n\n" + knowledgeContent);
        parts.push(noKbInstruction[lang] || noKbInstruction["pt-BR"]);
      } else {
        // No KB: use agent prompt only
        if (userPrompt) {
          parts.push(userPrompt);
        } else {
          const who = (instance.persona_name as string) || "assistente";
          const co = instance.company_name ? `, da empresa ${instance.company_name}` : "";
          parts.push(`Você é ${who}${co}.`);
        }
        if (instance.signature) parts.push(`Sempre encerre com: "${instance.signature}".`);
        parts.push(langLock[lang] || langLock["pt-BR"]);
        parts.push(formatRule[lang] || formatRule["pt-BR"]);
      }

      const systemInstruction = parts.join("\n\n");

      // ── Response delay: initial read simulation ────────────────────────────
      const rawDelay = (instance.response_delay as number) || 3000;
      const readDelayMs = rawDelay > 100 ? Math.round(rawDelay) : Math.round(rawDelay * 1000);
      await new Promise((r) => setTimeout(r, readDelayMs));

      // ── Gemini call ────────────────────────────────────────────────────────
      const { text: reply, tokens, error: gemErr } = await callGemini(
        creds.gemini,
        systemInstruction,
        ordered
      );
      if (gemErr) console.error("Gemini final error", gemErr);

      // ── Fragment and send with dynamic typing delay ────────────────────────
      const fragments = reply
        .split(/\||\n/)
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);

      const toSend = fragments.length > 0 ? fragments : [reply];

      // Dynamic delay per fragment: 1s per 50 chars, clamped to [2s, 15s]
      const minTyping = 2000;
      const maxTyping = 15000;

      for (const fragment of toSend) {
        const typingMs = calcTypingDelay(fragment, minTyping, maxTyping);
        console.log("[webhook] fragment:", fragment.length, "chars →", typingMs, "ms typing");
        await simulateTyping(creds, instanceName, remoteJid, typingMs);
        await sendText(creds, instanceName, remoteJid, fragment);
      }

      await admin.from("chat_logs").insert({
        instance_id: instance.id,
        whatsapp_connection_id: connectionId,
        customer_number: customerNumber,
        direction: "out",
        message_body: reply,
        tokens_used: tokens,
        knowledge_hit: knowledgeHit,
      });

    } catch (e) {
      console.error("Background task error:", e instanceof Error ? e.message : e);
    }
  })();

  EdgeRuntime.waitUntil(task);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
