import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function loadGeminiKey(admin: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data: own } = await admin.from("api_configs").select("gemini_key").eq("user_id", userId).eq("is_active", true).maybeSingle();
  const { data: global } = await admin.from("api_configs").select("gemini_key").is("user_id", null).eq("is_active", true).maybeSingle();
  return (own?.gemini_key || global?.gemini_key || "") as string;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
        }),
      });
      const data = await res.json();
      if (!res.ok) continue;
      const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      if (text) return text;
    } catch { /* try next */ }
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { instance_id, customer_number } = await req.json();
    if (!instance_id || !customer_number) {
      return new Response(JSON.stringify({ ok: false, error: "missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: instance } = await admin.from("instances").select("user_id, persona_name").eq("id", instance_id).maybeSingle();
    if (!instance) return new Response(JSON.stringify({ ok: false, error: "instance not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const geminiKey = await loadGeminiKey(admin, instance.user_id);
    if (!geminiKey) return new Response(JSON.stringify({ ok: false, error: "no gemini key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Load last 30 messages
    const { data: history } = await admin.from("chat_logs").select("direction, message_body, created_at").eq("instance_id", instance_id).eq("customer_number", customer_number).order("created_at", { ascending: false }).limit(30);
    if (!history || history.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no history" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const conversation = history.reverse().map((h: { direction: string; message_body: string }) => `${h.direction === "in" ? "Cliente" : "Atendente"}: ${h.message_body.slice(0, 300)}`).join("\n");

    const prompt = `Analise a conversa abaixo entre um atendente e um cliente. Extraia em JSON puro (sem markdown):
- customer_name: nome do cliente se mencionado, senao ""
- facts: lista (max 8) de fatos importantes sobre o cliente (profissao, familia, preferencias, problemas, objetivos)
- last_topics: principais topicos discutidos (string curta separada por virgula)
- preferences: objeto com preferencias detectadas (ex: {"formal": true, "prefere_audio": false})

Conversa:
${conversation}

Retorne APENAS o JSON, sem texto antes ou depois. Exemplo:
{"customer_name":"Joao","facts":["dentista","2 filhos","prefere ser chamado de dr"],"last_topics":"orcamento, prazo","preferences":{"formal":true}}`;

    const result = await callGemini(geminiKey, prompt);
    if (!result) return new Response(JSON.stringify({ ok: false, error: "gemini failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let parsed: { customer_name?: string; facts?: string[]; last_topics?: string; preferences?: Record<string, unknown> };
    try {
      const cleaned = result.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "parse failed", raw: result.slice(0, 200) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const update: Record<string, unknown> = {};
    if (parsed.customer_name) update.customer_name = parsed.customer_name;
    if (Array.isArray(parsed.facts)) update.facts = parsed.facts.slice(0, 12);
    if (parsed.last_topics) update.last_topics = String(parsed.last_topics).slice(0, 500);
    if (parsed.preferences && typeof parsed.preferences === "object") update.preferences = parsed.preferences;

    if (Object.keys(update).length > 0) {
      const { data: existing } = await admin.from("customer_memory").select("id").eq("instance_id", instance_id).eq("customer_number", customer_number).maybeSingle();
      if (existing) {
        await admin.from("customer_memory").update(update).eq("id", existing.id);
      } else {
        await admin.from("customer_memory").insert({ instance_id, customer_number, ...update });
      }
    }

    return new Response(JSON.stringify({ ok: true, extracted: update }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
