import { supabase } from "../../../lib/supabase";
import { Coincidencia, MatchBoardService } from "../domain";
import { rowACoincidencia, CoincidenciaRow } from "./coincidencia-row";

/**
 * Implementación real del tablero contra Supabase.
 * La RLS ya limita la lectura de coincidencias a roles privilegiados;
 * la RPC de matching valida COORDINADOR/service_role en el servidor.
 */
export class SupabaseMatchGateway implements MatchBoardService {
  async listar(): Promise<Coincidencia[]> {
    const { data, error } = await supabase
      .from("reencuentro_coincidencias")
      .select("*")
      .in("estado", ["SUGERIDA", "EN_REVISION", "INFO_INSUFICIENTE"]);
    if (error) throw new Error(error.message);
    return ((data ?? []) as CoincidenciaRow[]).map(rowACoincidencia);
  }

  async generar(): Promise<number> {
    const { data, error } = await supabase.rpc("reencuentro_generar_coincidencias");
    if (error) throw new Error(error.message);
    return typeof data === "number" ? data : 0;
  }

  async confirmar(id: string): Promise<void> {
    // Al confirmar: los casos SIN fallecido pasan directo a PENDIENTE_NOTIFICACION
    // (listos para avisar a la familia). Los casos con fallecido quedan CONFIRMADA
    // y NO se notifican por la app (protocolo oficial reforzado).
    const { data } = await supabase
      .from("reencuentro_coincidencias")
      .select("involucra_fallecido")
      .eq("id", id)
      .single();
    const nuevoEstado = data?.involucra_fallecido ? "CONFIRMADA" : "PENDIENTE_NOTIFICACION";
    const { error } = await supabase
      .from("reencuentro_coincidencias")
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async rechazar(id: string, motivo: string): Promise<void> {
    const { error } = await supabase
      .from("reencuentro_coincidencias")
      .update({ estado: "RECHAZADA", motivo_rechazo: motivo, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
