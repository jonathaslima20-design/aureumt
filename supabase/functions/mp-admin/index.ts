import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mask(token: string | null | undefined): string {
  if (!token) return "";
  if (token.length <= 12) return token.slice(0, 4) + "***";
  return token.slice(0, 8) + "***" + token.slice(-4);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || profile.role !== "admin") {
      return json({ error: "Forbidden" }, 403);
    }

    const { action, payload } = await req.json();

    if (action === "getConfig") {
      const { data } = await admin
        .from("mercadopago_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (!data) {
        return json({
          config: {
            environment: "test",
            public_key_test: "",
            access_token_test_masked: "",
            public_key_prod: "",
            access_token_prod_masked: "",
            webhook_secret_masked: "",
            notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
          },
        });
      }
      return json({
        config: {
          id: data.id,
          environment: data.environment,
          public_key_test: data.public_key_test || "",
          access_token_test_masked: mask(data.access_token_test),
          has_access_token_test: !!data.access_token_test,
          public_key_prod: data.public_key_prod || "",
          access_token_prod_masked: mask(data.access_token_prod),
          has_access_token_prod: !!data.access_token_prod,
          webhook_secret_masked: mask(data.webhook_secret),
          has_webhook_secret: !!data.webhook_secret,
          notification_url: data.notification_url ||
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
        },
      });
    }

    if (action === "saveConfig") {
      const {
        environment,
        public_key_test,
        access_token_test,
        public_key_prod,
        access_token_prod,
        webhook_secret,
      } = payload || {};

      // Validate credential prefixes to prevent "Unauthorized use of live credentials"
      // which occurs when test/prod credentials are mixed.
      if (typeof public_key_test === "string" && public_key_test.length > 0 &&
          !public_key_test.startsWith("TEST-")) {
        return json({
          error: "Public Key de teste deve comecar com TEST-. Verifique se voce nao colou uma credencial de producao.",
        }, 400);
      }
      if (typeof access_token_test === "string" && access_token_test.length > 0 &&
          !access_token_test.startsWith("TEST-")) {
        return json({
          error: "Access Token de teste deve comecar com TEST-. Verifique se voce nao colou uma credencial de producao (APP_USR-).",
        }, 400);
      }
      if (typeof public_key_prod === "string" && public_key_prod.length > 0 &&
          !public_key_prod.startsWith("APP_USR-")) {
        return json({
          error: "Public Key de producao deve comecar com APP_USR-.",
        }, 400);
      }
      if (typeof access_token_prod === "string" && access_token_prod.length > 0 &&
          !access_token_prod.startsWith("APP_USR-")) {
        return json({
          error: "Access Token de producao deve comecar com APP_USR-.",
        }, 400);
      }

      const { data: existing } = await admin
        .from("mercadopago_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      const notification_url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`;

      const updates: Record<string, unknown> = {
        environment: environment || "test",
        notification_url,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (typeof public_key_test === "string") updates.public_key_test = public_key_test;
      if (typeof access_token_test === "string" && access_token_test.length > 0)
        updates.access_token_test = access_token_test;
      if (typeof public_key_prod === "string") updates.public_key_prod = public_key_prod;
      if (typeof access_token_prod === "string" && access_token_prod.length > 0)
        updates.access_token_prod = access_token_prod;
      if (typeof webhook_secret === "string" && webhook_secret.length > 0)
        updates.webhook_secret = webhook_secret;

      // Determine effective credentials AFTER applying this save, to validate
      // we are not switching to production without valid prod credentials.
      const effectivePubProd = typeof public_key_prod === "string" && public_key_prod.length > 0
        ? public_key_prod
        : existing?.public_key_prod || "";
      const effectiveTokenProd = typeof access_token_prod === "string" && access_token_prod.length > 0
        ? access_token_prod
        : existing?.access_token_prod || "";
      const effectivePubTest = typeof public_key_test === "string" && public_key_test.length > 0
        ? public_key_test
        : existing?.public_key_test || "";
      const effectiveTokenTest = typeof access_token_test === "string" && access_token_test.length > 0
        ? access_token_test
        : existing?.access_token_test || "";

      if (environment === "production" && (!effectivePubProd || !effectiveTokenProd)) {
        return json({
          error: "Para ativar o ambiente de producao, salve antes a Public Key e o Access Token de producao.",
        }, 400);
      }
      if (environment === "test" && (!effectivePubTest || !effectiveTokenTest)) {
        return json({
          error: "Para ativar o ambiente de teste, salve antes a Public Key e o Access Token de teste.",
        }, 400);
      }

      if (existing) {
        await admin.from("mercadopago_config").update(updates).eq("id", existing.id);
      } else {
        await admin.from("mercadopago_config").insert({
          public_key_test: public_key_test || "",
          access_token_test: access_token_test || "",
          public_key_prod: public_key_prod || "",
          access_token_prod: access_token_prod || "",
          webhook_secret: webhook_secret || "",
          ...updates,
        });
      }
      return json({ ok: true });
    }

    if (action === "testCredentials") {
      const { data: cfg } = await admin
        .from("mercadopago_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (!cfg) return json({ error: "Sem credenciais salvas" }, 400);

      const token = cfg.environment === "production"
        ? cfg.access_token_prod
        : cfg.access_token_test;
      if (!token) return json({ error: "Access Token nao configurado" }, 400);

      const resp = await fetch("https://api.mercadopago.com/users/me", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const body = await resp.json();
      if (!resp.ok) {
        return json({
          ok: false,
          error: body?.message || "Falha ao validar credenciais",
          details: body,
        }, 400);
      }
      return json({
        ok: true,
        account: {
          id: body.id,
          nickname: body.nickname,
          email: body.email,
          site_id: body.site_id,
          first_name: body.first_name,
          last_name: body.last_name,
        },
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500);
  }
});
