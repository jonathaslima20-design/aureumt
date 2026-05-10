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

async function downloadMedia(evolutionUrl: string, evolutionKey: string, instanceName: string, messageKey: Record<string, unknown>): Promise<{ base64: string; mimetype: string } | null> {
  const baseUrl = evolutionUrl.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", apikey: evolutionKey };
  const url = `${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`;

  const payload = {
    message: { key: messageKey },
    convertToMp4: false,
  };

  console.log("[downloadMedia] POST", url, JSON.stringify(payload).slice(0, 300));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log("[downloadMedia] status:", res.status, "body:", text.slice(0, 500));

    if (!res.ok) return null;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }

    const base64 = (data?.base64 || data?.data || (data?.message as Record<string, unknown>)?.base64MediaMessage || "") as string;
    const mimetype = (data?.mimetype || data?.mimeType || (data?.message as Record<string, unknown>)?.mimetype || "") as string;

    if (!base64) {
      console.log("[downloadMedia] no base64 in response. Keys:", Object.keys(data));
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

async function processMediaWithGemini(apiKey: string, base64: string, mimetype: string, instruction: string): Promise<string> {
  const gemMime = mimetype.startsWith("audio/") ? normalizeAudioMime(mimetype) : mimetype.split(";")[0].trim();
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

  console.log("[processMediaWithGemini] sending", gemMime, "base64 length:", base64.length);

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error(`[processMediaWithGemini] ${model} error:`, res.status, JSON.stringify(data).slice(0, 300));
        continue;
      }

      const result = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      if (result) {
        console.log("[processMediaWithGemini] transcription ok, model:", model, "length:", result.length, "preview:", result.slice(0, 150));
        return result;
      }
    } catch (e) {
      console.error(`[processMediaWithGemini] ${model} fetch error:`, e instanceof Error ? e.message : e);
    }
  }

  return "";
}

async function callGemini(apiKey: string, systemPrompt: string, history: { role: string; text: string }[]) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  const rawContents = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.text }],
  }));

  // Merge consecutive same-role messages and ensure first is "user"
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

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
  };

  let lastError = "";
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        lastError = `[${model}] ${res.status} ${JSON.stringify(data).slice(0, 400)}`;
        console.error("Gemini API error", lastError);
        continue;
      }
      console.log("[callGemini] raw response:", JSON.stringify(data).slice(0, 600));
      const candidate = data?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const text = candidate?.content?.parts?.[0]?.text;
      if (typeof text === "string" && text.trim().length > 0) {
        const tokens = data?.usageMetadata?.totalTokenCount || 0;
        return { text: text.trim(), tokens, error: "" };
      }
      // Handle safety/recitation blocks — return a neutral message instead of the error string
      if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
        console.warn(`[callGemini] ${model} finishReason=${finishReason}`);
        return { text: "Não consigo responder a isso.", tokens: 0, error: "" };
      }
      lastError = `[${model}] empty text finishReason=${finishReason} data=${JSON.stringify(data).slice(0, 400)}`;
      console.error("Gemini empty", lastError);
    } catch (e) {
      lastError = `[${model}] ${e instanceof Error ? e.message : "fetch_error"}`;
      console.error("Gemini fetch failed", lastError);
    }
  }

  return {
    text: "Desculpe, estou com uma instabilidade momentânea. Tente novamente em instantes.",
    tokens: 0,
    error: lastError,
  };
}

async function sendPresence(creds: Creds, instanceName: string, number: string, durationMs: number) {
  const url = `${creds.url.replace(/\/$/, "")}/chat/sendPresence/${instanceName}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.key },
      // delay tells Evolution how long to show "composing" — keep it slightly over durationMs
      body: JSON.stringify({ number, presence: "composing", delay: durationMs + 500 }),
    });
    console.log("[sendPresence] status:", res.status, "number:", number, "durationMs:", durationMs);
  } catch (e) {
    console.error("[sendPresence] error:", e instanceof Error ? e.message : e);
  }
}

// ~800 chars/min typing speed, capped between 800ms and 8s.
function typingDurationForText(text: string): number {
  const CHARS_PER_MS = 800 / 60000;
  const raw = text.length / CHARS_PER_MS;
  return Math.max(800, Math.min(8000, raw));
}

async function simulateTyping(creds: Creds, instanceName: string, number: string, totalMs: number) {
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
  const payload = { number, text };
  console.log("[sendText] POST", url, "number:", number, "text:", text.slice(0, 80));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.key },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    console.log("[sendText] status:", res.status, "body:", body.slice(0, 200));
    if (!res.ok) {
      console.error("[sendText] FAILED:", res.status, body.slice(0, 500));
    }
  } catch (e) {
    console.error("[sendText] fetch error:", e instanceof Error ? e.message : e);
  }
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

  if (!event.toLowerCase().includes("messages.upsert") && !event.toLowerCase().includes("messages_upsert")) {
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

  console.log("[webhook] event:", event, "instance:", instanceName, "messageType:", messageType, "dataKeys:", Object.keys(data), "msgKeys:", msgObj ? Object.keys(msgObj) : "null");

  const text = extractText(msgObj);
  let media = extractMedia(msgObj);
  if (!media && (messageType === "audioMessage" || messageType === "pttMessage")) {
    media = { type: "audio", mimetype: "audio/ogg; codecs=opus" };
  }
  if (!media && messageType === "imageMessage") {
    media = { type: "image", mimetype: "image/jpeg" };
  }

  console.log("[webhook] extracted text:", JSON.stringify(text?.slice(0, 50)), "media:", media ? media.type : "none");

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

      const { data: instance } = await admin
        .from("instances")
        .select("*")
        .eq("instance_name", instanceName)
        .maybeSingle();

      if (!instance) return;

      await admin.from("chat_logs").insert({
        instance_id: instance.id,
        customer_number: customerNumber,
        direction: "in",
        message_body: text,
      });

      const overflow = (instance.overflow_keyword || "").trim().toLowerCase();
      if (overflow && text.toLowerCase().includes(overflow)) {
        await admin.from("instances").update({ flow_status: "paused" }).eq("id", instance.id);
        return;
      }

      if (instance.flow_status !== "active") return;

      const { data: convState } = await admin
        .from("conversation_states")
        .select("manual_override")
        .eq("instance_id", instance.id)
        .eq("customer_number", customerNumber)
        .maybeSingle();

      if (convState?.manual_override === true) return;

      const creds = await loadCreds(admin, instance.user_id);
      if (!creds.gemini || !creds.url || !creds.key) return;

      // Handle media: transcribe audio or describe image
      let mediaContext = "";
      if (media && instance.is_multimodal_active !== false) {
        const rawKey = key as Record<string, unknown>;
        console.log("[webhook] media detected:", media.type, "rawKey:", JSON.stringify(rawKey));

        const MEDIA_TIMEOUT_MS = 15000;
        const downloadPromise = downloadMedia(creds.url, creds.key, instanceName, rawKey);
        const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), MEDIA_TIMEOUT_MS));
        const downloaded = await Promise.race([downloadPromise, timeoutPromise]);

        if (!downloaded) {
          console.log("[webhook] downloadMedia failed or timed out — asking user to resend");
          const retryMsg = "Não consegui ouvir o áudio. Pode me enviar em texto?";
          const typingMs = typingDurationForText(retryMsg);
          await simulateTyping(creds, instanceName, remoteJid, typingMs);
          await sendText(creds, instanceName, remoteJid, retryMsg);
          await admin.from("chat_logs").insert({
            instance_id: instance.id,
            customer_number: customerNumber,
            direction: "out",
            message_body: retryMsg,
            tokens_used: 0,
          });
          return;
        }

        console.log("[webhook] media downloaded, base64 length:", downloaded.base64.length, "mime:", downloaded.mimetype);

        const instruction = media.type === "audio"
          ? "Transcreva este áudio fielmente. Retorne apenas a transcrição, sem comentários ou explicações."
          : "Descreva esta imagem de forma breve e objetiva.";

        const processPromise = processMediaWithGemini(
          creds.gemini,
          downloaded.base64,
          downloaded.mimetype || (media.type === "audio" ? "audio/ogg" : "image/jpeg"),
          instruction
        );
        const processTimeout = new Promise<string>((r) => setTimeout(() => r(""), MEDIA_TIMEOUT_MS));
        mediaContext = await Promise.race([processPromise, processTimeout]);

        if (!mediaContext && media.type === "audio") {
          console.log("[webhook] transcription empty or timed out — asking user to resend");
          const retryMsg = "Não consegui ouvir o áudio. Pode me enviar em texto?";
          const typingMs = typingDurationForText(retryMsg);
          await simulateTyping(creds, instanceName, remoteJid, typingMs);
          await sendText(creds, instanceName, remoteJid, retryMsg);
          await admin.from("chat_logs").insert({
            instance_id: instance.id,
            customer_number: customerNumber,
            direction: "out",
            message_body: retryMsg,
            tokens_used: 0,
          });
          return;
        }

        console.log("[webhook] mediaContext length:", mediaContext.length, "preview:", mediaContext.slice(0, 150));
      }

      // Knowledge base: only fetch sources whose content matches keywords from the user message.
      // Limited to top 4 relevant results, capped at 8k chars total.
      let knowledgeContext = "";
      if (text) {
        const { data: knowledgeSources } = await admin
          .from("knowledge_sources")
          .select("content, title, type")
          .eq("instance_id", instance.id)
          .eq("is_active", true)
          .limit(10);

        if (knowledgeSources && knowledgeSources.length > 0) {
          const userWords = text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
          const scored = knowledgeSources
            .map((s: { title: string; type: string; content: string }) => {
              const haystack = (s.title + " " + s.content).toLowerCase();
              const hits = userWords.filter((w: string) => haystack.includes(w)).length;
              return { ...s, hits };
            })
            .filter((s: { hits: number }) => s.hits > 0)
            .sort((a: { hits: number }, b: { hits: number }) => b.hits - a.hits)
            .slice(0, 4);

          if (scored.length > 0) {
            const chunks = scored.map((s: { title: string; type: string; content: string }) =>
              `[${s.type.toUpperCase()}: ${s.title}]\n${s.content}`
            );
            knowledgeContext = chunks.join("\n\n---\n\n").slice(0, 8000);
          }
        }
      }

      // Last 8 messages, each body truncated to 400 chars to keep history tokens low
      const { data: history } = await admin
        .from("chat_logs")
        .select("direction, message_body")
        .eq("instance_id", instance.id)
        .eq("customer_number", customerNumber)
        .order("created_at", { ascending: false })
        .limit(8);

      const ordered = (history || []).reverse().map((h: { direction: string; message_body: string }) => ({
        role: h.direction === "in" ? "user" : "assistant",
        text: h.message_body.slice(0, 400),
      }));

      // If media was transcribed/described, replace the last user message with the content directly
      // so Gemini receives the transcription as if the user typed it
      if (mediaContext) {
        const lastMsg = ordered[ordered.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          lastMsg.text = mediaContext;
        }
      }

      const lang = (instance.language || "pt-BR") as "pt-BR" | "en-US" | "es";

      // Compact per-language strings — replaces the verbose i18n block
      const langLock: Record<string, string> = {
        "pt-BR": "Responda SEMPRE em português do Brasil.",
        "en-US": "ALWAYS reply in English (US).",
        "es": "Responde SIEMPRE en español.",
      };
      const ragInstruction: Record<string, string> = {
        "pt-BR": "Use APENAS o CONTEXTO abaixo. Se não souber, diga que não tem essa informação.",
        "en-US": "Use ONLY the CONTEXT below. If unknown, say you don't have that info.",
        "es": "Usa SOLO el CONTEXTO abajo. Si no sabes, di que no tienes esa información.",
      };
      const formatRule: Record<string, string> = {
        "pt-BR": "Regras: sem Markdown; texto puro; respostas curtas e diretas; saudacao simples na primeira msg; use | so para ideias distintas; sem frases genericas.",
        "en-US": "Rules: no Markdown; plain text; short direct answers; simple greeting on first msg; use | only for distinct ideas; no generic phrases.",
        "es": "Reglas: sin Markdown; texto puro; respuestas cortas y directas; saludo simple en primer msg; usa | solo para ideas distintas; sin frases genéricas.",
      };

      const userPrompt = (instance.system_prompt || "").trim();

      const parts: string[] = [];
      if (userPrompt) {
        parts.push(userPrompt);
      } else {
        const who = instance.persona_name || "assistente";
        const co = instance.company_name ? `, ${instance.company_name}` : "";
        parts.push(`Você é ${who}${co}.`);
      }
      if (instance.signature) parts.push(`Assine: "${instance.signature}".`);
      parts.push(langLock[lang] || langLock["pt-BR"]);
      parts.push(formatRule[lang] || formatRule["pt-BR"]);
      if (knowledgeContext) {
        parts.push(`${ragInstruction[lang] || ragInstruction["pt-BR"]}\n\nCONTEXTO:\n${knowledgeContext}`);
      }

      const finalPrompt = parts.join("\n");

      // Wait the configured response_delay before calling Gemini — simulates the agent reading the message
      const rawDelay = (instance.response_delay as number) || 3000;
      const readDelayMs = rawDelay > 100 ? Math.round(rawDelay) : Math.round(rawDelay * 1000);
      await new Promise((r) => setTimeout(r, readDelayMs));

      const { text: reply, tokens, error: gemErr } = await callGemini(creds.gemini, finalPrompt, ordered);
      if (gemErr) console.error("Gemini final error", gemErr);

      // Fragment the reply by | or newlines into separate messages
      const fragments = reply
        .split(/\||\n/)
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);

      console.log("[webhook] reply length:", reply.length, "fragments:", fragments.length, "remoteJid:", remoteJid);
      console.log("[webhook] full reply:", reply.slice(0, 300));

      // Each fragment gets a typing duration proportional to its own length
      for (const fragment of (fragments.length > 0 ? fragments : [reply])) {
        const typingMs = typingDurationForText(fragment);
        await simulateTyping(creds, instanceName, remoteJid, typingMs);
        await sendText(creds, instanceName, remoteJid, fragment);
      }

      await admin.from("chat_logs").insert({
        instance_id: instance.id,
        customer_number: customerNumber,
        direction: "out",
        message_body: reply,
        tokens_used: tokens,
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
