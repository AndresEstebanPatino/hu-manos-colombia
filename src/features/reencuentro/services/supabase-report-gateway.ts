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
  }
}
