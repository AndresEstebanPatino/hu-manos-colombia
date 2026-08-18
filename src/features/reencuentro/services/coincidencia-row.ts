import { Coincidencia, EvidenciaCoincidencia } from "../domain";

/** Fila de la tabla `reencuentro_coincidencias` (snake_case) tal como llega de Supabase. */
export interface CoincidenciaRow {
  id: string;
  reporte_buscada_id: string;
  reporte_encontrada_id: string;
  estado: string;
  banda: string;
  evidencia: unknown;
  involucra_fallecido: boolean;
  involucra_menor?: boolean;
  revisor_id: string | null;
  segundo_validador_id: string | null;
  motivo_rechazo: string | null;
  creado_en: string;
  actualizado_en: string;
}

/** Mapea la fila de Supabase al modelo de dominio (camelCase). */
export function rowACoincidencia(row: CoincidenciaRow): Coincidencia {
  return {
    id: row.id,
    reporteBuscadaId: row.reporte_buscada_id,
    reporteEncontradaId: row.reporte_encontrada_id,
    estado: row.estado as Coincidencia["estado"],
    banda: row.banda as Coincidencia["banda"],
    evidencia: Array.isArray(row.evidencia) ? (row.evidencia as EvidenciaCoincidencia[]) : [],
    involucraFallecido: row.involucra_fallecido,
    involucraMenor: Boolean(row.involucra_menor),
    revisorId: row.revisor_id ?? undefined,
    segundoValidadorId: row.segundo_validador_id ?? undefined,
    motivoRechazo: row.motivo_rechazo ?? undefined,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}
