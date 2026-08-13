import { supabase } from "../../../lib/supabase";
import { ReportePersona, ReportsQueryPort } from "../domain";
import { rowAReporte, ReporteRow } from "./reporte-row";

/** Consulta de reportes contra Supabase (respeta la RLS: la lista pública solo trae BUSCADA no-menores activas). */
export class SupabaseReportsQuery implements ReportsQueryPort {
  async listarBuscadasPublicas(): Promise<ReportePersona[]> {
    const { data, error } = await supabase
      .from("reencuentro_reportes")
      .select("*")
      .eq("tipo", "BUSCADA")
      .eq("es_menor", false)
      .eq("estado", "ACTIVO")
      .order("creado_en", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as ReporteRow[]).map(rowAReporte);
  }
}
