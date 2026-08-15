import { supabase } from "../../../lib/supabase";
import { RemoteReportGateway, ReportePersona } from "../domain";
import { reporteARow } from "./reporte-row";

/**
 * Gateway real hacia Supabase: sube el reporte con upsert idempotente por
 * id de cliente (onConflict: id). La tabla y su RLS viven en supabase/migrations.
 */
export class SupabaseReportGateway implements RemoteReportGateway {
  async upsert(reporte: ReportePersona): Promise<void> {
    const { error } = await supabase
      .from("reencuentro_reportes")
      .upsert(reporteARow(reporte), { onConflict: "id" });
    if (error) throw new Error(error.message);

    // Insertar notificación de broadcast para la campanita de la comunidad 🔔
    try {
      const isBuscada = reporte.tipo === "BUSCADA";
      const nombre = reporte.nombre?.trim() || "Persona";
      const notifTitle = isBuscada
        ? `🔍 Alguien está buscando a: ${nombre}`
        : `✅ Se reportó una persona encontrada: ${nombre}`;
      const notifMsg = reporte.ultimaUbicacion ? `Ubicación: ${reporte.ultimaUbicacion}` : `Reportado en la comunidad`;

      await supabase.from("notificaciones").insert([
        {
          titulo: notifTitle,
          mensaje: notifMsg,
          tipo: "NUEVO_EVENTO",
          creado_por: reporte.creadoPorId || null,
        },
      ]);
    } catch (notifErr) {
      console.warn("Info notificación reporte reencuentro:", notifErr);
    }
  }
}
