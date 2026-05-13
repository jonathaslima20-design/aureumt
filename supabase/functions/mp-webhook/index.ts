import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Signature, X-Request-Id",
};

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function verifySignature(
  signatureHeader: string,
  requestId: string,
  dataId: string,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",").map((p) => p.trim());
  let ts = "";
  let v1 = "";
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

async function activatePlan(
  admin: ReturnType<typeof createClient>,
  userId: string,
  planId: string,
  cycle: string,
) {
  const months = cycle === "annual" ? 12 : cycle === "semiannual" ? 6 : 1;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  const { data: existing } = await admin
    .from("user_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (existing) {
    await admin.from("user_plans").update({
      plan_id: planId,
      billing_cycle: cycle,
      status: "active",
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }).eq("id", existing.id);
  } else {
    await admin.from("user_plans").insert({
      user_id: userId,
      plan_id: planId,
      billing_cycle: cycle,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });
  }
  await admin.from("profiles").update({
    plan_id: planId,
    plan_status: "active",
  }).eq("id", userId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cfg } = await admin
      .from("mercadopago_config")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (!cfg) return ok();

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({} as any));
    const dataId = String(body?.data?.id || url.searchParams.get("data.id") || "");
    const eventType = String(body?.type || body?.action || url.searchParams.get("type") || "");
    if (!dataId) return ok();

    // Signature validation (skip if no secret configured to allow simple testing)
    if (cfg.webhook_secret) {
      const sigHeader = req.headers.get("x-signature") || "";
      const reqId = req.headers.get("x-request-id") || "";
      const valid = verifySignature(sigHeader, reqId, dataId, cfg.webhook_secret);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Idempotency
    const eventKey = `${dataId}:${body?.id || eventType || "evt"}`;
    const { error: dupErr } = await admin.from("payment_webhook_events").insert({
      mp_event_id: eventKey,
      event_type: eventType,
      mp_payment_id: dataId,
      payload: body,
    });
    if (dupErr && (dupErr.code === "23505" || String(dupErr.message).includes("duplicate"))) {
      return ok();
    }

    if (!eventType.startsWith("payment")) return ok();

    const token = cfg.environment === "production" ? cfg.access_token_prod : cfg.access_token_test;
    if (!token) return ok();

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!resp.ok) return ok();
    const mp = await resp.json();

    const { data: row } = await admin
      .from("payments")
      .select("*")
      .eq("mp_payment_id", String(dataId))
      .maybeSingle();
    if (!row) return ok();

    await admin.from("payments").update({
      status: mp.status || row.status,
      status_detail: mp.status_detail || "",
      raw_response: mp,
      card_last4: mp?.card?.last_four_digits || row.card_last4 || "",
      card_brand: mp?.payment_method_id || row.card_brand || "",
    }).eq("id", row.id);

    if (mp.status === "approved" && row.user_id && row.plan_id) {
      await activatePlan(admin, row.user_id, row.plan_id, row.billing_cycle);
    }

    await admin.from("payment_webhook_events")
      .update({ processed: true })
      .eq("mp_event_id", eventKey);

    return ok();
  } catch {
    return ok();
  }
});
