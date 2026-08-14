import { supabase } from "../../../lib/supabase";
import { sendExpoPushNotifications } from "../../../services/pushNotifications";

/**
 * Canal B2 (coordinación interna): al CONFIRMAR una coincidencia, avisa por push a
 * los COORDINADORES para que la revisen/actúen. Client-side y best-effort — reutiliza
 * la infra de push existente (`sendExpoPushNotifications` + `user_push_tokens`); no
 * necesita edge function ni despliegue. Nunca lanza.
 */
export async function notificarCoordinadoresCoincidencia(
  coincidenciaId: string,
  nombre?: string
): Promise<void> {
  try {
    // user_ids con rol COORDINADOR (la RLS permite a un coordinador leer los roles).
    const { data: roles } = await supabase
      .from("reencuentro_roles")
      .select("user_id")
      .eq("rol", "COORDINADOR");
    const userIds = [...new Set(((roles ?? []) as { user_id: string }[]).map((r) => r.user_id))];
    if (userIds.length === 0) return;

    const { data: tokens } = await supabase
      .from("user_push_tokens")
      .select("push_token")
      .in("user_id", userIds);
    const pushTokens = ((tokens ?? []) as { push_token: string | null }[])
      .map((t) => t.push_token)
      .filter((t): t is string => Boolean(t));
    if (pushTokens.length === 0) return;

    await sendExpoPushNotifications(
      pushTokens,
      "🔔 Coincidencia confirmada — Reencuentro",
      nombre
        ? `Revisa la coincidencia de ${nombre} en Coordinación.`
        : "Hay una coincidencia confirmada por revisar en Coordinación.",
      { coincidenciaId, type: "MATCH_CONFIRMED" }
    );
  } catch (err) {
    console.log("notificarCoordinadoresCoincidencia info:", err);
  }
}
