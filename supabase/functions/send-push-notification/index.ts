// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface DatabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    titulo: string;
    categoria: string;
    ubicacion: string;
    creador_id: string;
  };
  schema: string;
  old_record: null | Record<string, any>;
}

serve(async (req) => {
  try {
    // 1. Validar que la petición sea de un Webhook de Supabase (POST)
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: DatabaseWebhookPayload = await req.json();

    // 2. Procesar solo eventos INSERT en la tabla necesidades
    if (payload.type !== "INSERT" || payload.table !== "necesidades") {
      return new Response(JSON.stringify({ message: "Ignored event type" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: needId, titulo, categoria, ubicacion, creador_id: creatorId } = payload.record;

    // 3. Inicializar cliente Supabase con Service Role (bypassea RLS para leer todos los tokens)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Consultar tokens en user_push_tokens (excluyendo al creador)
    const { data: tokenRows, error: tokenError } = await supabase
      .from("user_push_tokens")
      .select("push_token, user_id")
      .neq("user_id", creatorId || "");

    if (tokenError) {
      console.error("Error al consultar user_push_tokens:", tokenError);
      return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
    }

    if (!tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ message: "No recipient tokens found" }), { status: 200 });
    }

    // 5. Filtrar solo tokens válidos de Expo
    const validTokens = tokenRows
      .map((row) => row.push_token)
      .filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));

    if (validTokens.length === 0) {
      return new Response(JSON.stringify({ message: "No valid ExponentPushTokens found" }), { status: 200 });
    }

    // 6. Formatear notificaciones push y agrupar en lotes de máximo 100 (límite de Expo API)
    const categoryEmojis: Record<string, string> = {
      BEBES_LACTANCIA: "👶",
      ALIMENTOS: "🍲",
      ROPA_COBIJAS: "🧥",
      MANO_DE_OBRA: "👥",
      SALUD: "🏥",
      OTRO: "📌",
    };

    const emoji = categoryEmojis[categoria] || "🚨";
    const pushTitle = `${emoji} Nueva solicitud en ${ubicacion || "Colombia"}`;
    const pushBody = titulo;

    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title: pushTitle,
      body: pushBody,
      data: { needId, type: "NEW_NEED" },
      priority: "high",
    }));

    // Dividir en lotes de 100
    const BATCH_SIZE = 100;
    const chunks = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      chunks.push(messages.slice(i, i + BATCH_SIZE));
    }

    // 7. Enviar notificaciones a la API pública de Expo Push
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
