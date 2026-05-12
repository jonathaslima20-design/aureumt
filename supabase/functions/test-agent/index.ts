import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function cleanText(raw: string): string {
  return raw
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instance_id, message, conversation_history } = await req.json();

    if (!instance_id || !message) {
      return new Response(
        JSON.stringify({ error: "instance_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: instance } = await admin
      .from("instances")
      .select("*")
      .eq("id", instance_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!instance) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Load knowledge bases (same as webhook) ─────────────────────────────
    let knowledgeContent = "";

    const { data: kbLinks } = await admin
      .from("instance_knowledge_bases")
      .select("knowledge_base_id")
      .eq("instance_id", instance_id);

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
        knowledgeContent = chunks.join("\n\n---\n\n").slice(0, 80000);
      }
    }

    // Legacy knowledge_sources linked directly to instance_id
    if (!knowledgeContent) {
      const { data: legacySources } = await admin
        .from("knowledge_sources")
        .select("content, title, type")
        .eq("instance_id", instance_id)
        .eq("is_active", true)
        .limit(20);

      if (legacySources && legacySources.length > 0) {
        const chunks = legacySources.map((s: { title: string; type: string; content: string }) => {
          const cleaned = cleanText(s.content);
          return `### ${s.title} (${s.type.toUpperCase()})\n${cleaned}`;
        });
        knowledgeContent = chunks.join("\n\n---\n\n").slice(0, 80000);
      }
    }

    // ── Build system instruction (identical to webhook) ────────────────────
    const lang = ((instance.language as string) || "pt-BR") as "pt-BR" | "en-US" | "es";

    const langLock: Record<string, string> = {
      "pt-BR": "Responda SEMPRE em português do Brasil.",
      "en-US": "ALWAYS reply in English (US).",
      "es": "Responde SIEMPRE en español.",
    };
    const formatRule: Record<string, string> = {
      "pt-BR": "Regras de formato: NUNCA use Markdown (nada de **, ##, __, ~~). Para negrito use apenas UM asterisco de cada lado: *texto*. Para itálico use _texto_. Respostas curtas e humanas; saudação simples na primeira mensagem; use | apenas para separar ideias distintas; sem frases genéricas; sem listas com - ou *.",
      "en-US": "Format rules: NEVER use Markdown (no **, ##, __, ~~). For bold use only ONE asterisk on each side: *text*. For italic use _text_. Short human answers; simple greeting on first message; use | only for distinct ideas; no generic phrases; no lists with - or *.",
      "es": "Reglas de formato: NUNCA uses Markdown (nada de **, ##, __, ~~). Para negrita usa solo UN asterisco de cada lado: *texto*. Para cursiva usa _texto_. Respuestas cortas y humanas; saludo simple en primer mensaje; usa | solo para ideas distintas; sin frases genéricas; sin listas con - o *.",
    };
    const noKbInstruction: Record<string, string> = {
      "pt-BR": "Se a pergunta não puder ser respondida com as informações acima, diga gentilmente que não possui essa informação específica e pergunte se o cliente deseja falar com um consultor humano.",
      "en-US": "If the question cannot be answered with the information above, kindly say you don't have that specific information and ask if they'd like to speak with a human consultant.",
      "es": "Si la pregunta no puede responderse con la información anterior, di amablemente que no tienes esa información específica y pregunta si desea hablar con un consultor humano.",
    };

    const userPrompt = ((instance.system_prompt as string) || "").trim();
    const parts: string[] = [];

    if (knowledgeContent) {
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

    const systemInstructionText = parts.join("\n\n");
    const cappedInstruction = systemInstructionText.length > 200000
      ? systemInstructionText.slice(0, 200000) + "\n\n[contexto truncado por limite de tamanho]"
      : systemInstructionText;

    // ── Build conversation history (same merging logic as webhook) ──────────
    const history = (conversation_history || []).slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      text: (m.content || "").slice(0, 500),
    }));

    const rawContents = history.map((h: { role: string; text: string }) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }],
    }));

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

    // ── Load Gemini API key ────────────────────────────────────────────────
    const { data: ownConfig } = await admin
      .from("api_configs")
      .select("gemini_key")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const { data: globalConfig } = await admin
      .from("api_configs")
      .select("gemini_key")
      .is("user_id", null)
      .eq("is_active", true)
      .maybeSingle();

    const geminiKey = ownConfig?.gemini_key || globalConfig?.gemini_key;
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Call Gemini (same params and fallback as webhook) ───────────────────
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    const body = {
      systemInstruction: { parts: [{ text: cappedInstruction }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    };

    let reply = "";
    let lastError = "";

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();

          if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
            const waitMs = Math.min((retryAfter || 5) * 1000, 8000);
            lastError = `[${model}] 429 rate_limit`;
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }
            break;
          }

          if (!res.ok) {
            lastError = `[${model}] HTTP ${res.status}`;
            break;
          }

          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text) {
            reply = text;
            break;
          }
          lastError = `[${model}] empty response`;
          break;
        } catch (e) {
          lastError = `[${model}] ${e instanceof Error ? e.message : "error"}`;
          break;
        }
      }
      if (reply) break;
    }

    if (!reply) {
      return new Response(
        JSON.stringify({ error: lastError || "No response from model" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fragment reply the same way as the webhook does for WhatsApp
    const fragments = reply
      .split(/\||\n/)
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 0);

    return new Response(
      JSON.stringify({ reply: fragments.length > 0 ? fragments[0] : reply, fragments }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
