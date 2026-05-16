import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Creds = { url: string; key: string };

async function loadCreds(admin: ReturnType<typeof createClient>, userId: string): Promise<Creds | null> {
  const { data: own } = await admin
    .from("api_configs")
    .select("evolution_url, evolution_key")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (own?.evolution_url && own?.evolution_key) {
    return { url: own.evolution_url, key: own.evolution_key };
  }

  const { data: global } = await admin
    .from("api_configs")
    .select("evolution_url, evolution_key")
    .is("user_id", null)
    .eq("is_active", true)
    .maybeSingle();

  if (global?.evolution_url && global?.evolution_key) {
    return { url: global.evolution_url, key: global.evolution_key };
  }
  return null;
}

async function evoFetch(creds: Creds, path: string, init: RequestInit = {}) {
  const url = `${creds.url.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: creds.key,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userRes } = await admin.auth.getUser(token);
    const user = userRes.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { action, connectionId, instanceId, number, text } = body;

    if (!action) return json({ error: "Missing action" }, 400);

    // Support both connectionId (new: whatsapp_connections.id) and instanceId (legacy: instances.id)
    let evoName: string;
    let userId: string;
    let connectionUuid: string | null = null;
    let agentInstanceId: string | null = null;

    if (connectionId) {
      // New model: look up whatsapp_connections by UUID
      const { data: conn } = await admin
        .from("whatsapp_connections")
        .select("*")
        .eq("id", connectionId)
        .maybeSingle();

      if (!conn) return json({ error: "Connection not found" }, 404);
      if (conn.user_id !== user.id) {
        const { data: prof } = await admin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (prof?.role !== "admin") return json({ error: "Forbidden" }, 403);
      }

      evoName = conn.evolution_instance_id;
      userId = conn.user_id;
      connectionUuid = conn.id;
      agentInstanceId = conn.agent_id || null;
    } else if (instanceId) {
      // Legacy model: look up instances by UUID
      const { data: instance } = await admin
        .from("instances")
        .select("*")
        .eq("id", instanceId)
        .maybeSingle();

      if (!instance) return json({ error: "Instance not found" }, 404);
      if (instance.user_id !== user.id) {
        const { data: prof } = await admin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (prof?.role !== "admin") return json({ error: "Forbidden" }, 403);
      }

      evoName = instance.instance_name;
      userId = instance.user_id;
      agentInstanceId = instance.id;

      // Find matching whatsapp_connection for this instance (agent)
      const { data: conn } = await admin
        .from("whatsapp_connections")
        .select("id")
        .eq("agent_id", instance.id)
        .maybeSingle();
      connectionUuid = conn?.id || null;
    } else {
      return json({ error: "Missing connectionId or instanceId" }, 400);
    }

    const creds = await loadCreds(admin, userId);
    if (!creds) return json({ error: "Evolution credentials not configured" }, 400);

    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook`;

    switch (action) {
      case "createInstance": {
        const res = await evoFetch(creds, "/instance/create", {
          method: "POST",
          body: JSON.stringify({
            instanceName: evoName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
            webhook: {
              url: webhookUrl,
              events: ["MESSAGES_UPSERT"],
              byEvents: false,
            },
          }),
        });
        return json(res.json, res.ok ? 200 : 200);
      }

      case "connectInstance": {
        const res = await evoFetch(creds, `/instance/connect/${evoName}`, { method: "GET" });
        return json(res.json, 200);
      }

      case "instanceStatus": {
        const res = await evoFetch(creds, `/instance/connectionState/${evoName}`, { method: "GET" });
        const j = res.json as { instance?: { state?: string }; state?: string } | null;
        const state = j?.instance?.state || j?.state || "close";
        return json({ state, raw: res.json });
      }

      case "logoutInstance": {
        const res = await evoFetch(creds, `/instance/logout/${evoName}`, { method: "DELETE" });
        return json(res.json, 200);
      }

      case "deleteInstance": {
        const res = await evoFetch(creds, `/instance/delete/${evoName}`, { method: "DELETE" });
        return json(res.json, 200);
      }

      case "sendMessage": {
        if (!number || !text) return json({ error: "Missing number or text" }, 400);
        const res = await evoFetch(creds, `/message/sendText/${evoName}`, {
          method: "POST",
          body: JSON.stringify({ number, text }),
        });
        if (res.ok) {
          const clean = String(number).replace(/@.*/, "");
          await admin.from("chat_logs").insert({
            instance_id: agentInstanceId,
            whatsapp_connection_id: connectionUuid,
            customer_number: clean,
            direction: "out",
            message_body: text,
          });
          if (agentInstanceId) {
            await admin
              .from("conversation_states")
              .upsert(
                {
                  instance_id: agentInstanceId,
                  whatsapp_connection_id: connectionUuid,
                  customer_number: clean,
                  manual_override: true,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "instance_id,customer_number" }
              );
          }
        }
        return json(res.json, 200);
      }

      case "fetchProfilePicture":
      case "fetchContactInfo": {
        if (!number) return json({ error: "Missing number" }, 400);
        const clean = String(number).replace(/@.*/, "");

        const [picRes, contactRes] = await Promise.all([
          evoFetch(creds, `/chat/fetchProfilePictureUrl/${evoName}`, {
            method: "POST",
            body: JSON.stringify({ number: clean }),
          }),
          evoFetch(creds, `/chat/findContacts/${evoName}`, {
            method: "POST",
            body: JSON.stringify({ where: { id: `${clean}@s.whatsapp.net` } }),
          }),
        ]);

        const picData = picRes.json as { profilePictureUrl?: string } | null;
        const pictureUrl = picData?.profilePictureUrl || null;

        const contactArr = contactRes.json as Array<{ pushName?: string; profilePictureUrl?: string }> | null;
        const contactData = Array.isArray(contactArr) ? contactArr[0] : null;
        const contactName = contactData?.pushName || null;
        const contactPicFallback = contactData?.profilePictureUrl || null;
        const finalPicture = pictureUrl || contactPicFallback;

        if (agentInstanceId) {
          const upsertData: Record<string, unknown> = {
            instance_id: agentInstanceId,
            customer_number: clean,
            profile_picture_url: finalPicture,
            profile_picture_fetched_at: new Date().toISOString(),
          };
          if (contactName) {
            upsertData.contact_name = contactName;
          }
          await admin
            .from("conversation_states")
            .upsert(upsertData, { onConflict: "instance_id,customer_number" });
        }
        return json({ profilePictureUrl: finalPicture, contactName });
      }

      case "setManualOverride": {
        if (!number) return json({ error: "Missing number" }, 400);
        const clean = String(number).replace(/@.*/, "");
        const manual = Boolean(body.manual);
        if (agentInstanceId) {
          await admin
            .from("conversation_states")
            .upsert(
              {
                instance_id: agentInstanceId,
                whatsapp_connection_id: connectionUuid,
                customer_number: clean,
                manual_override: manual,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "instance_id,customer_number" }
            );
        }
        return json({ ok: true, manual_override: manual });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
