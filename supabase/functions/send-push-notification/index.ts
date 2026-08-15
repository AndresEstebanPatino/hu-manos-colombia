// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface DatabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE" | "CONTRIBUCION";
  table?: string;
  record: {
    id?: string;
    necesidad_id?: string;
    titulo: string;
    categoria?: string;
    ubicacion?: string;
    creador_id: string;
    modo?: string;
  };
  schema?: string;
  old_record?: null | Record<string, any>;
}

serve(async (req) => {
  try {
    // 1. Validar que la petición sea de tipo POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: DatabaseWebhookPayload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let validTokens: string[] = [];
    let pushTitle = "";
    let pushBody = "";
    let dataType = "NEW_NEED";
    let needId = "";

    // ── TIPO 1: CONTRIBUCION (Notificación directa al creador) ────────────
    if (payload.type === "CONTRIBUCION") {
      const { necesidad_id, id, titulo, creador_id: creatorId, modo } = payload.record;
      needId = necesidad_id || id || "";

      if (!creatorId) {
        return new Response(JSON.stringify({ message: "No creator_id provided for CONTRIBUCION" }), { status: 200 });
      }

      // Consultar token de push SOLO del creador de la necesidad
      const { data: tokenRows, error: tokenError } = await supabase
        .from("user_push_tokens")
        .select("push_token, user_id")
        .eq("user_id", creatorId);

      if (tokenError) {
        console.error("Error al consultar user_push_tokens para creador:", tokenError);
        return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
      }

      if (!tokenRows || tokenRows.length === 0) {
        return new Response(JSON.stringify({ message: "No recipient token found for creator" }), { status: 200 });
      }

      validTokens = tokenRows
        .map((row) => row.push_token)
        .filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));

      dataType = "CONTRIBUCION";
      const isOferta = modo === "OFERTA";
      pushTitle = isOferta ? "📥 Reserva en tu oferta" : "🙋 Confirmación de ayuda";
      pushBody = isOferta
        ? `📥 Alguien necesita tu oferta de "${titulo}"`
        : `🙋 Alguien confirmó que va a ayudarte con "${titulo}"`;

    // ── TIPO 2: INSERT (Broadcast de nueva solicitud a toda la comunidad) ──
    } else if (payload.type === "INSERT" && payload.table === "necesidades") {
      const { id: needIdRecord, titulo, categoria, ubicacion, creador_id: creatorId } = payload.record;
      needId = needIdRecord || "";

      // Consultar tokens excluyendo al creador
      const { data: tokenRows, error: tokenError } = await supabase
        .from("user_push_tokens")
        .select("push_token, user_id")
        .neq("user_id", creatorId || "");

      if (tokenError) {
        console.error("Error al consultar user_push_tokens para broadcast:", tokenError);
        return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
      }

      if (!tokenRows || tokenRows.length === 0) {
        return new Response(JSON.stringify({ message: "No recipient tokens found" }), { status: 200 });
      }

      validTokens = tokenRows
        .map((row) => row.push_token)
        .filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));

      const categoryEmojis: Record<string, string> = {
        BEBES_LACTANCIA: "👶",
        ALIMENTOS: "🍲",
        ROPA_COBIJAS: "🧥",
        MANO_DE_OBRA: "👥",
        SALUD: "🏥",
        OTRO: "📌",
      };

      const emoji = categoryEmojis[categoria || ""] || "🚨";
      dataType = "NEW_NEED";
      pushTitle = `${emoji} Nueva solicitud en ${ubicacion || "Colombia"}`;
      pushBody = titulo;
    } else {
      return new Response(JSON.stringify({ message: "Ignored event type or table" }), { status: 200 });
    }

    if (validTokens.length === 0) {
      return new Response(JSON.stringify({ message: "No valid ExponentPushTokens found" }), { status: 200 });
    }

    // 2. Formatear mensajes para la API de Expo Push
    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title: pushTitle,
      body: pushBody,
      data: { needId, type: dataType },
      priority: "high",
    }));

    // 3. Enviar en lotes de 100
    const BATCH_SIZE = 100;
    const chunks = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      chunks.push(messages.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    for (const chunk of chunks) {
      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      const resData = await expoRes.json();
      console.log("Respuesta de Expo Push API:", resData);
      totalSent += chunk.length;
    }

    return new Response(
      JSON.stringify({ success: true, sent_count: totalSent }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error en send-push-notification function:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
