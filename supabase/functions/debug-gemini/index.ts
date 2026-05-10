import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config } = await admin
      .from("api_configs")
      .select("gemini_key")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const apiKey = config?.gemini_key || "";
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "No Gemini key found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash-latest"];
    const results: Record<string, unknown>[] = [];

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = {
        systemInstruction: { parts: [{ text: "You are a helpful assistant. Reply briefly." }] },
        contents: [{ role: "user", parts: [{ text: "Say hello in one word" }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 50 },
      };

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        results.push({
          model,
          status: res.status,
          ok: res.ok,
          text: data?.candidates?.[0]?.content?.parts?.[0]?.text || null,
          error: data?.error || null,
          raw: JSON.stringify(data).slice(0, 500),
        });
      } catch (e) {
        results.push({
          model,
          status: 0,
          ok: false,
          error: e instanceof Error ? e.message : "fetch_error",
        });
      }
    }

    return new Response(JSON.stringify({ keyPrefix: apiKey.slice(0, 10) + "...", results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
