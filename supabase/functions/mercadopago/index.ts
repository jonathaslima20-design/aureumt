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

type Cfg = {
  id: string;
  environment: "test" | "production";
  public_key_test: string;
  access_token_test: string;
  public_key_prod: string;
  access_token_prod: string;
  notification_url: string;
};

async function loadConfig(admin: ReturnType<typeof createClient>): Promise<Cfg | null> {
  const { data } = await admin
    .from("mercadopago_config")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  return (data as Cfg) || null;
}

function tokenOf(cfg: Cfg): string {
  return cfg.access_token_prod;
}

function publicKeyOf(cfg: Cfg): string {
  return cfg.public_key_prod;
}

function priceCentsFor(plan: any, cycle: string): number {
  const v = cycle === "annual"
    ? plan.price_annual
    : cycle === "semiannual"
    ? plan.price_semiannual
    : plan.price_monthly;
  return Math.round(Number(v) * 100);
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

    const cfg = await loadConfig(admin);
    if (!cfg) return json({ error: "Mercado Pago nao configurado" }, 400);

    const { action, payload } = await req.json();

    if (action === "getPublicKey") {
      return json({
        public_key: publicKeyOf(cfg),
        environment: "production",
      });
    }

    if (action === "createPixPayment" || action === "createCardPayment") {
      const { plan_id, billing_cycle, payer } = payload || {};
      if (!plan_id || !billing_cycle) return json({ error: "plan_id e billing_cycle obrigatorios" }, 400);
      if (!["monthly", "semiannual", "annual"].includes(billing_cycle))
        return json({ error: "billing_cycle invalido" }, 400);

      const { data: plan } = await admin.from("plans").select("*").eq("id", plan_id).maybeSingle();
      if (!plan) return json({ error: "Plano nao encontrado" }, 404);

      const cents = priceCentsFor(plan, billing_cycle);
      if (cents <= 0) return json({ error: "Valor invalido" }, 400);
      const amount = cents / 100;

      const { data: paymentRow, error: insErr } = await admin.from("payments").insert({
        user_id: user.id,
        plan_id,
        billing_cycle,
        amount_cents: cents,
        currency: "BRL",
        payment_method: action === "createPixPayment" ? "pix" : "credit_card",
        status: "pending",
        environment: "production",
        payer_email: payer?.email || user.email || "",
        payer_doc: payer?.doc || "",
      }).select().maybeSingle();
      if (insErr || !paymentRow) return json({ error: "Falha ao registrar pagamento" }, 500);

      const idempotencyKey = paymentRow.id;
      const token = tokenOf(cfg);

      if (action === "createPixPayment") {
        const body = {
          transaction_amount: amount,
          description: `${plan.name} - ${billing_cycle}`,
          payment_method_id: "pix",
          payer: {
            email: payer?.email || user.email,
            first_name: payer?.first_name || "Cliente",
            last_name: payer?.last_name || "",
            identification: payer?.doc
              ? { type: payer.doc.length > 11 ? "CNPJ" : "CPF", number: String(payer.doc).replace(/\D/g, "") }
              : undefined,
          },
          notification_url: cfg.notification_url,
          external_reference: paymentRow.id,
        };

        const resp = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(body),
        });
        const mp = await resp.json();
        if (!resp.ok) {
          await admin.from("payments").update({
            status: "rejected",
            status_detail: mp?.message || "Erro Pix",
            raw_response: mp,
          }).eq("id", paymentRow.id);
          return json({ error: mp?.message || "Falha ao criar Pix", details: mp }, 400);
        }

        const qr = mp?.point_of_interaction?.transaction_data?.qr_code || "";
        const qr64 = mp?.point_of_interaction?.transaction_data?.qr_code_base64 || "";
        const ticket = mp?.point_of_interaction?.transaction_data?.ticket_url || "";

        await admin.from("payments").update({
          mp_payment_id: String(mp.id),
          status: mp.status || "pending",
          status_detail: mp.status_detail || "",
          pix_qr_code: qr,
          pix_qr_code_base64: qr64,
          pix_ticket_url: ticket,
          pix_expires_at: mp.date_of_expiration || null,
          raw_response: mp,
        }).eq("id", paymentRow.id);

        return json({
          payment_id: paymentRow.id,
          mp_payment_id: String(mp.id),
          status: mp.status,
          pix_qr_code: qr,
          pix_qr_code_base64: qr64,
          pix_ticket_url: ticket,
          expires_at: mp.date_of_expiration,
        });
      }

      // createCardPayment
      const { token: cardToken, installments, payment_method_id, issuer_id } = payload || {};
      if (!cardToken || !payment_method_id) return json({ error: "Dados do cartao incompletos" }, 400);

      const body = {
        transaction_amount: amount,
        token: cardToken,
        description: `${plan.name} - ${billing_cycle}`,
        installments: Number(installments || 1),
        payment_method_id,
        issuer_id,
        payer: {
          email: payer?.email || user.email,
          identification: payer?.doc
            ? { type: payer.doc.length > 11 ? "CNPJ" : "CPF", number: String(payer.doc).replace(/\D/g, "") }
            : undefined,
        },
        notification_url: cfg.notification_url,
        external_reference: paymentRow.id,
      };

      const resp = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      });
      const mp = await resp.json();
      if (!resp.ok) {
        await admin.from("payments").update({
          status: "rejected",
          status_detail: mp?.message || "Erro cartao",
          raw_response: mp,
        }).eq("id", paymentRow.id);
        return json({ error: mp?.message || "Falha ao processar cartao", details: mp }, 400);
      }

      await admin.from("payments").update({
        mp_payment_id: String(mp.id),
        status: mp.status || "pending",
        status_detail: mp.status_detail || "",
        installments: Number(installments || 1),
        card_last4: mp?.card?.last_four_digits || "",
        card_brand: mp?.payment_method_id || "",
        raw_response: mp,
      }).eq("id", paymentRow.id);

      // If approved synchronously, activate plan
      if (mp.status === "approved") {
        await activatePlan(admin, user.id, plan_id, billing_cycle);
      }

      return json({
        payment_id: paymentRow.id,
        mp_payment_id: String(mp.id),
        status: mp.status,
        status_detail: mp.status_detail,
        card_last4: mp?.card?.last_four_digits || "",
      });
    }

    if (action === "getPaymentStatus") {
      const { payment_id } = payload || {};
      if (!payment_id) return json({ error: "payment_id obrigatorio" }, 400);
      const { data: row } = await admin
        .from("payments")
        .select("*")
        .eq("id", payment_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!row) return json({ error: "Pagamento nao encontrado" }, 404);

      if (row.mp_payment_id && row.status !== "approved" && row.status !== "rejected") {
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${row.mp_payment_id}`, {
          headers: { "Authorization": `Bearer ${tokenOf(cfg)}` },
        });
        if (resp.ok) {
          const mp = await resp.json();
          if (mp.status && mp.status !== row.status) {
            await admin.from("payments").update({
              status: mp.status,
              status_detail: mp.status_detail || "",
              raw_response: mp,
            }).eq("id", row.id);
            row.status = mp.status;
            row.status_detail = mp.status_detail;
            if (mp.status === "approved") {
              await activatePlan(admin, user.id, row.plan_id, row.billing_cycle);
            }
          }
        }
      }

      return json({
        payment_id: row.id,
        status: row.status,
        status_detail: row.status_detail,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500);
  }
});

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
