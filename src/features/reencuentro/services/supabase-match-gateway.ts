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
      .select("involucra_fallecido, reporte_buscada_id")
      .eq("id", id)
      .single();
    const nuevoEstado = data?.involucra_fallecido ? "CONFIRMADA" : "PENDIENTE_NOTIFICACION";
    const { error } = await supabase
      .from("reencuentro_coincidencias")
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);

    // Si NO involucra fallecido y pasa a PENDIENTE_NOTIFICACION, notificar al creador de la búsqueda original de forma PRIVADA
    if (!data?.involucra_fallecido && data?.reporte_buscada_id) {
      try {
        const { data: repData } = await supabase
          .from("reencuentro_reportes")
          .select("nombre, creado_por_id")
          .eq("id", data.reporte_buscada_id)
          .single();

        if (repData?.creado_por_id) {
          const nombreBuscado = repData.nombre || "tu búsqueda";
          await supabase.from("notificaciones").insert([
            {
              titulo: "👀 Posible coincidencia encontrada",
              mensaje: `👀 Posible coincidencia encontrada para tu búsqueda de ${nombreBuscado}`,
              tipo: "CONTRIBUCION", // Privado para el creador de la búsqueda original
              creado_por: repData.creado_por_id,
            },
          ]);
        }
      } catch (notifErr) {
        console.warn("Info notificación coincidencia reencuentro:", notifErr);
      }
    }
  }

  async rechazar(id: string, motivo: string): Promise<void> {
    const { error } = await supabase
      .from("reencuentro_coincidencias")
      .update({ estado: "RECHAZADA", motivo_rechazo: motivo, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
