import { supabase } from "../../../lib/supabase";
import { NotificacionPendiente, NotificacionesBoardPort } from "../domain";

interface CoincRow {
  id: string;
  reporte_buscada_id: string;
}
interface RepRow {
  id: string;
  nombre: string | null;
  reportante_contacto: string | null;
}

/**
 * Canal A (WhatsApp) del tablero. La RLS ya limita coincidencias a coordinadores;
 * el reporte BUSCADA es legible por rol. Usa dos consultas (sin embed) por robustez.
 */
export class SupabaseNotificacionesGateway implements NotificacionesBoardPort {
  async listarPendientes(): Promise<NotificacionPendiente[]> {
    const { data: coincs, error } = await supabase
      .from("reencuentro_coincidencias")
      .select("id, reporte_buscada_id")
      .eq("estado", "PENDIENTE_NOTIFICACION")
      .eq("involucra_fallecido", false);
    if (error) throw new Error(error.message);

    const rows = (coincs ?? []) as CoincRow[];
    if (rows.length === 0) return [];

    const ids = [...new Set(rows.map((r) => r.reporte_buscada_id))];
    const { data: reps } = await supabase
      .from("reencuentro_reportes")
      .select("id, nombre, reportante_contacto")
      .in("id", ids);

    const porId = new Map((reps ?? []).map((r) => [(r as RepRow).id, r as RepRow]));
    return rows.map((r) => {
      const rep = porId.get(r.reporte_buscada_id);
      return {
        coincidenciaId: r.id,
        nombre: rep?.nombre ?? undefined,
        contacto: rep?.reportante_contacto ?? undefined,
      };
    });
  }

  async marcarNotificada(coincidenciaId: string): Promise<void> {
    const { error } = await supabase
      .from("reencuentro_coincidencias")
      .update({ estado: "NOTIFICADA", actualizado_en: new Date().toISOString() })
      .eq("id", coincidenciaId)
      .eq("estado", "PENDIENTE_NOTIFICACION");
    if (error) throw new Error(error.message);
  }
}
