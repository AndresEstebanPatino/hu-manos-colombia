import { supabase } from "../../../lib/supabase";

/**
 * Canal B2 (coordinación interna): al CONFIRMAR una coincidencia, avisa por push a
 * los COORDINADORES para que la revisen/actúen. Invoca la Edge Function del servidor
 * con service_role. Nunca lanza.
 */
export async function notificarCoordinadoresCoincidencia(
  coincidenciaId: string,
  nombre?: string
): Promise<void> {
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        type: "MATCH_CONFIRMED",
        coincidenciaId,
        nombre,
      },
    });
  } catch (err) {
    console.log("notificarCoordinadoresCoincidencia info:", err);
  }
}

