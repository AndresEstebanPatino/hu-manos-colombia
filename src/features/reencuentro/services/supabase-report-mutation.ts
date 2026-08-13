import { supabase } from "../../../lib/supabase";
import { ReportMutationPort } from "../domain";

/**
 * Mutaciones de reportes contra Supabase. La RLS de UPDATE en
 * `reencuentro_reportes` solo permite al COORDINADOR o al creador (auth.uid()),
 * así que este adaptador refleja la misma autorización que `puedeMarcarResuelto`.
 * El `anon` no puede cerrar reportes.
 */
export class SupabaseReportMutation implements ReportMutationPort {
  async marcarResuelto(id: string): Promise<void> {
    const { error } = await supabase
      .from("reencuentro_reportes")
      .update({ estado: "RESUELTO", actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
