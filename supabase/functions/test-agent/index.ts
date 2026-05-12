import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const { data: instance } = await supabase
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

    // Load knowledge bases linked to this agent
    const { data: kbLinks } = await supabase
      .from("instance_knowledge_bases")
      .select("knowledge_base_id")
      .eq("instance_id", instance_id);

    let knowledgeContext = "";
    if (kbLinks && kbLinks.length > 0) {
      const baseIds = kbLinks.map((l: { knowledge_base_id: string }) => l.knowledge_base_id);
      const { data: sources } = await supabase
        .from("knowledge_sources")
        .select("content")
        .in("knowledge_base_id", baseIds)
        .eq("is_active", true)
        .limit(5);

      if (sources && sources.length > 0) {
        const combined = sources.map((s: { content: string }) => s.content).join("\n\n---\n\n");
        knowledgeContext = `\n\n[Base de Conhecimento]:\n${combined.slice(0, 8000)}`;
      }
    }

    // Load Gemini API key
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // Build conversation for Gemini
    const systemPrompt = (instance.system_prompt || "") + knowledgeContext;
    const history = (conversation_history || []).slice(-20);
    const contents = history.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Gemini error: ${geminiRes.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const reply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta do modelo.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
