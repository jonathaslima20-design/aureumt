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

async function processMediaWithGemini(apiKey: string, base64: string, mimetype: string, instruction: string): Promise<string> {
  const gemMime = mimetype.includes("ogg") ? "audio/ogg" : mimetype.split(";")[0].trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType: gemMime, data: base64 } },
        { text: instruction },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
  };

  console.log("[processMediaWithGemini] sending", gemMime, "base64 length:", base64.length);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    console.error("[processMediaWithGemini] error:", res.status, JSON.stringify(data).slice(0, 300));
    return "";
  }

  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("[processMediaWithGemini] result:", result.slice(0, 200));
  return result;
}

async function callGemini(apiKey: string, systemPrompt: string, history: { role: string; text: string }[]) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  // Build contents ensuring: starts with "user", no consecutive same roles
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

  // Ensure it doesn't end with "user" followed by nothing (valid) but at least has content
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
        lastError = `[${model}] ${res.status} ${JSON.stringify(data).slice(0, 300)}`;
        console.error("Gemini API error", lastError);
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const tokens = data?.usageMetadata?.totalTokenCount || 0;
        return { text, tokens, error: "" };
      }
      lastError = `[${model}] empty response ${JSON.stringify(data).slice(0, 300)}`;
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

async function sendPresence(creds: Creds, instanceName: string, number: string) {
  const url = `${creds.url.replace(/\/$/, "")}/chat/sendPresence/${instanceName}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.key },
      body: JSON.stringify({ number, presence: "composing", delay: 5000 }),
    });
    console.log("[sendPresence] status:", res.status, "number:", number);
  } catch (e) {
    console.error("[sendPresence] error:", e instanceof Error ? e.message : e);
  }
}

async function simulateTyping(creds: Creds, instanceName: string, number: string, totalMs: number) {
  const REFRESH_INTERVAL = 4000;
  let elapsed = 0;
  await sendPresence(creds, instanceName, number);
  while (elapsed < totalMs) {
    const wait = Math.min(REFRESH_INTERVAL, totalMs - elapsed);
    await new Promise((r) => setTimeout(r, wait));
    elapsed += wait;
    if (elapsed < totalMs) {
      await sendPresence(creds, instanceName, number);
    }
  }
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

  // Evolution v2.3 payload: data.message contains the message content
  // data.messageType can be "audioMessage", "imageMessage", "conversation", etc.
  const msgObj = data?.message as Record<string, unknown> | null | undefined;
  const messageType = (data?.messageType as string) || "";

  console.log("[webhook] event:", event, "instance:", instanceName, "messageType:", messageType, "dataKeys:", Object.keys(data), "msgKeys:", msgObj ? Object.keys(msgObj) : "null");

  const text = extractText(msgObj);
  // Use messageType as fallback for media detection
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
        // Use the raw key from the webhook payload exactly as Evolution sent it
        const rawKey = key as Record<string, unknown>;
        console.log("[webhook] media detected:", media.type, "rawKey:", JSON.stringify(rawKey));
        const downloaded = await downloadMedia(creds.url, creds.key, instanceName, rawKey);
        if (downloaded) {
          console.log("[webhook] media downloaded, base64 length:", downloaded.base64.length, "mime:", downloaded.mimetype);
          if (media.type === "audio") {
            mediaContext = await processMediaWithGemini(
              creds.gemini, downloaded.base64, downloaded.mimetype || "audio/ogg",
              "Transcribe this audio completely in the original language. Return only the transcription."
            );
          } else if (media.type === "image") {
            mediaContext = await processMediaWithGemini(
              creds.gemini, downloaded.base64, downloaded.mimetype || "image/jpeg",
              "Describe this image in detail. What do you see?"
            );
          }
          console.log("[webhook] mediaContext length:", mediaContext.length, "preview:", mediaContext.slice(0, 100));
        } else {
          console.log("[webhook] downloadMedia returned null - could not fetch base64 from Evolution");
        }
      }

      // Fetch knowledge base context
      const { data: knowledgeSources } = await admin
        .from("knowledge_sources")
        .select("content, title, type")
        .eq("instance_id", instance.id)
        .eq("is_active", true)
        .limit(20);

      let knowledgeContext = "";
      if (knowledgeSources && knowledgeSources.length > 0) {
        const chunks = knowledgeSources.map((s: { title: string; type: string; content: string }) =>
          `[${s.type.toUpperCase()}: ${s.title}]\n${s.content}`
        );
        const joined = chunks.join("\n\n---\n\n");
        knowledgeContext = joined.slice(0, 30000);
      }

      const { data: history } = await admin
        .from("chat_logs")
        .select("direction, message_body")
        .eq("instance_id", instance.id)
        .eq("customer_number", customerNumber)
        .order("created_at", { ascending: false })
        .limit(12);

      const ordered = (history || []).reverse().map((h: { direction: string; message_body: string }) => ({
        role: h.direction === "in" ? "user" : "assistant",
        text: h.message_body,
      }));

      // If media was transcribed, append to the last user message
      if (mediaContext) {
        const lastMsg = ordered[ordered.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          const prefix = media!.type === "audio" ? "[Transcricao do audio]" : "[Descricao da imagem]";
          lastMsg.text = `${lastMsg.text === "[audio]" || lastMsg.text === "[imagem]" ? "" : lastMsg.text + "\n"}${prefix}: ${mediaContext}`;
        }
      }

      const lang = (instance.language || "pt-BR") as "pt-BR" | "en-US" | "es";

      const i18n: Record<string, {
        youAre: (p: string, c: string) => string;
        tone: (t: string) => string;
        emoji: Record<string, string>;
        signature: (s: string) => string;
        langName: string;
        langLock: string;
        fallbackBase: string;
        ragInstruction: string;
        tones: Record<string, string>;
      }> = {
        "pt-BR": {
          youAre: (p, c) => `Você é ${p || "um assistente"}${c ? `, da empresa ${c}` : ""}.`,
          tone: (t) => `Mantenha um tom ${t}.`,
          emoji: {
            none: "Não utilize emojis.",
            moderate: "Use emojis com moderação.",
            expressive: "Use emojis de forma expressiva.",
          },
          signature: (s) => `Encerre suas mensagens com: "${s}".`,
          langName: "português do Brasil",
          langLock:
            "IMPORTANTE: Responda SEMPRE em português do Brasil, independentemente do idioma em que o cliente escrever. Nunca responda em outro idioma.",
          fallbackBase: "Você é um assistente prestativo.",
          ragInstruction: "Sua ÚNICA fonte de verdade é o CONTEXTO abaixo. Se a informação não estiver no contexto, diga que não possui essa informação e sugira falar com um atendente humano.",
          tones: {
            friendly: "amigável",
            professional: "profissional",
            casual: "descontraído",
            technical: "técnico",
            warm: "acolhedor",
          },
        },
        "en-US": {
          youAre: (p, c) => `You are ${p || "an assistant"}${c ? `, from ${c}` : ""}.`,
          tone: (t) => `Keep a ${t} tone.`,
          emoji: {
            none: "Do not use emojis.",
            moderate: "Use emojis sparingly.",
            expressive: "Use emojis expressively.",
          },
          signature: (s) => `Always end your messages with: "${s}".`,
          langName: "English (US)",
          langLock:
            "IMPORTANT: ALWAYS reply in English (US), regardless of the language the customer writes in. Never reply in another language.",
          fallbackBase: "You are a helpful assistant.",
          ragInstruction: "Your ONLY source of truth is the CONTEXT below. If the information is not in the context, say you don't have that information and suggest speaking with a human agent.",
          tones: {
            friendly: "friendly",
            professional: "professional",
            casual: "casual",
            technical: "technical",
            warm: "warm",
          },
        },
        es: {
          youAre: (p, c) => `Eres ${p || "un asistente"}${c ? `, de la empresa ${c}` : ""}.`,
          tone: (t) => `Mantén un tono ${t}.`,
          emoji: {
            none: "No uses emojis.",
            moderate: "Usa emojis con moderación.",
            expressive: "Usa emojis de forma expresiva.",
          },
          signature: (s) => `Termina siempre tus mensajes con: "${s}".`,
          langName: "español",
          langLock:
            "IMPORTANTE: Responde SIEMPRE en español, sin importar en qué idioma escriba el cliente. Nunca respondas en otro idioma.",
          fallbackBase: "Eres un asistente servicial.",
          ragInstruction: "Tu UNICA fuente de verdad es el CONTEXTO a continuacion. Si la informacion no esta en el contexto, di que no tienes esa informacion y sugiere hablar con un agente humano.",
          tones: {
            friendly: "amigable",
            professional: "profesional",
            casual: "relajado",
            technical: "técnico",
            warm: "acogedor",
          },
        },
      };

      const t = i18n[lang] || i18n["pt-BR"];

      // The user's system_prompt is the PRIMARY instruction - it takes absolute priority
      const userPrompt = (instance.system_prompt || "").trim();

      // Build supplementary context (only adds what user didn't explicitly define)
      const supplementLines: string[] = [];
      if (!userPrompt) {
        supplementLines.push(t.fallbackBase);
        if (instance.persona_name || instance.company_name) {
          supplementLines.push(t.youAre(instance.persona_name || "", instance.company_name || ""));
        }
        supplementLines.push(t.tone(t.tones[instance.tone] || t.tones.friendly));
        supplementLines.push(t.emoji[instance.emoji_usage] || t.emoji.moderate);
      }
      if (instance.signature) {
        supplementLines.push(t.signature(instance.signature));
      }
      supplementLines.push(t.langLock);

      // Anti-markdown, minimalist behavior, greeting control, and anti-repetition rules
      const formatRule = lang === "pt-BR"
        ? `REGRAS DE COMPORTAMENTO OBRIGATORIAS:
1. FORMATO: NUNCA use Markdown (nada de **, ##, -, *, listas). Escreva texto puro.
2. MINIMALISMO: Seja extremamente breve. Responda APENAS o que foi perguntado. Nao explique o que nao foi pedido. Nao ofereca informacoes extras. Economize palavras como um atendente real no celular.
3. SAUDACAO: Se o cliente enviar apenas uma saudacao (oi, ola, bom dia, boa tarde, boa noite, e ai, hey), responda SOMENTE com uma saudacao curta + uma pergunta simples de disponibilidade. Exemplo: "oi! como posso te ajudar?" NUNCA apresente a empresa, servicos ou resumos na primeira mensagem.
4. FRAGMENTACAO: Use | APENAS se tiver duas ideias realmente distintas. Nao fragmente uma unica ideia em varios baloes.
5. ANTI-REPETICAO: Nunca repita a mesma informacao em baloes diferentes. Cada parte deve ter conteudo novo e unico.
6. PROIBIDO: Nao diga "estou aqui para ajudar", "fico a disposicao", "fique a vontade" ou frases genericas de atendimento. Va direto ao ponto.`
        : lang === "es"
          ? `REGLAS DE COMPORTAMIENTO OBLIGATORIAS:
1. FORMATO: NUNCA uses Markdown (nada de **, ##, -, *, listas). Solo texto puro.
2. MINIMALISMO: Se extremadamente breve. Responde SOLO lo que se pregunto. No expliques lo que no se pidio. No ofrezcas info extra. Economiza palabras como un atendente real en el celular.
3. SALUDO: Si el cliente envia solo un saludo (hola, buenas, buen dia, buenas tardes), responde SOLAMENTE con un saludo corto + una pregunta simple. Ejemplo: "hola! en que te puedo ayudar?" NUNCA presentes la empresa o servicios en el primer mensaje.
4. FRAGMENTACION: Usa | SOLO si tienes dos ideas realmente distintas. No fragmentes una sola idea.
5. ANTI-REPETICION: Nunca repitas la misma info en diferentes mensajes. Cada parte debe tener contenido nuevo.
6. PROHIBIDO: No digas "estoy aqui para ayudarte", "quedo a tu disposicion" o frases genericas. Ve directo al punto.`
          : `MANDATORY BEHAVIOR RULES:
1. FORMAT: NEVER use Markdown (no **, ##, -, *, lists). Plain text only.
2. MINIMALISM: Be extremely brief. Answer ONLY what was asked. Do not explain what was not requested. Do not offer extra info. Save words like a real person texting on a phone.
3. GREETING: If the customer sends only a greeting (hi, hello, good morning, hey), reply ONLY with a short greeting + a simple availability question. Example: "hey! how can I help?" NEVER introduce the company or services in the first message.
4. FRAGMENTATION: Use | ONLY if you have two truly distinct ideas. Do not fragment a single idea into multiple bubbles.
5. ANTI-REPETITION: Never repeat the same info in different messages. Each part must have unique new content.
6. FORBIDDEN: Do not say "I'm here to help", "feel free to ask", or generic support phrases. Get to the point.`;
      supplementLines.push(formatRule);

      let finalPrompt: string;
      if (userPrompt) {
        // User prompt is the absolute authority - place it first and reinforce obedience
        const obey = lang === "pt-BR"
          ? "INSTRUCAO CRITICA: Voce DEVE obedecer fielmente a TODAS as instrucoes abaixo. Nao ignore nenhuma regra."
          : lang === "es"
            ? "INSTRUCCION CRITICA: DEBES obedecer fielmente TODAS las instrucciones a continuacion. No ignores ninguna regla."
            : "CRITICAL INSTRUCTION: You MUST faithfully obey ALL instructions below. Do not ignore any rule.";

        if (knowledgeContext) {
          finalPrompt = `${obey}\n\n${userPrompt}\n\n${supplementLines.join("\n")}\n\n${t.ragInstruction}\n\nCONTEXTO:\n${knowledgeContext}`;
        } else {
          finalPrompt = `${obey}\n\n${userPrompt}\n\n${supplementLines.join("\n")}`;
        }
      } else {
        if (knowledgeContext) {
          finalPrompt = `${supplementLines.join("\n")}\n\n${t.ragInstruction}\n\nCONTEXTO:\n${knowledgeContext}`;
        } else {
          finalPrompt = supplementLines.join("\n");
        }
      }

      const { text: reply, tokens, error: gemErr } = await callGemini(creds.gemini, finalPrompt, ordered);
      if (gemErr) console.error("Gemini final error", gemErr);

      // Fragment the reply by | or newlines into separate messages
      const fragments = reply
        .split(/\||\n/)
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);

      console.log("[webhook] reply length:", reply.length, "fragments:", fragments.length, "remoteJid:", remoteJid);
      console.log("[webhook] full reply:", reply.slice(0, 300));

      const rawDelay = (instance.response_delay as number) || 3;
      // response_delay may be stored in seconds (e.g. 3) or milliseconds (e.g. 3000)
      const typingMs = rawDelay > 100 ? Math.round(rawDelay) : Math.round(rawDelay * 1000);

      // Send first fragment with configured delay
      await simulateTyping(creds, instanceName, remoteJid, typingMs);
      await sendText(creds, instanceName, remoteJid, fragments[0] || reply);

      // Send remaining fragments with same configured delay
      for (let i = 1; i < fragments.length; i++) {
        await simulateTyping(creds, instanceName, remoteJid, typingMs);
        await sendText(creds, instanceName, remoteJid, fragments[i]);
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
