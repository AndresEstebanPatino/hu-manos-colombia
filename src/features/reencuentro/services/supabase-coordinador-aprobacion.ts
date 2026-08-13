import { supabase } from "../../../lib/supabase";
import { CoordinadorAprobacionPort } from "../domain";

/**
 * Aprobación/rechazo de solicitudes vía RPC atómico (SECURITY DEFINER). La
 * autorización (rol COORDINADOR) se valida dentro de la función en Postgres.
 */
export class SupabaseCoordinadorAprobacion implements CoordinadorAprobacionPort {
  async aprobar(solicitudId: string): Promise<void> {
    const { error } = await supabase.rpc("reencuentro_aprobar_coordinador", {
      p_solicitud_id: solicitudId,
    });
    if (error) throw new Error(error.message);
  }

  async rechazar(solicitudId: string, motivo: string): Promise<void> {
    const { error } = await supabase.rpc("reencuentro_rechazar_coordinador", {
      p_solicitud_id: solicitudId,
      p_motivo: motivo,
    });
    if (error) throw new Error(error.message);
  }
}
