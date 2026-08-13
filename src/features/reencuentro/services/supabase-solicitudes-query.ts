import { supabase } from "../../../lib/supabase";
import {
  EstadoSolicitudCoordinador,
  SolicitudCoordinador,
  SolicitudesQueryPort,
} from "../domain";

interface SolicitudRow {
  id: string;
  user_id: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  zona: string;
  organizacion: string | null;
  estado: string;
  creado_en: string;
}

/** Consulta de solicitudes contra Supabase (la RLS limita a coordinadores). */
export class SupabaseSolicitudesQuery implements SolicitudesQueryPort {
  async listarPendientes(): Promise<SolicitudCoordinador[]> {
    const { data, error } = await supabase
      .from("reencuentro_solicitudes_coordinador")
      .select("id,user_id,nombre_completo,email,telefono,zona,organizacion,estado,creado_en")
      .eq("estado", "PENDIENTE")
      .order("creado_en", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as SolicitudRow[]).map((r) => ({
      id: r.id,
      userId: r.user_id,
      nombreCompleto: r.nombre_completo,
      email: r.email,
      telefono: r.telefono,
      zona: r.zona,
      organizacion: r.organizacion ?? undefined,
      estado: r.estado as EstadoSolicitudCoordinador,
      creadoEn: r.creado_en,
    }));
  }
}
