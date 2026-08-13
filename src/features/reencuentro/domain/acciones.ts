import { ReportePersona } from "./types";
import { RolPrivilegiado, esCoordinador } from "./roles";

/**
 * Quién puede marcar un reporte BUSCADA como RESUELTO (persona encontrada):
 * el COORDINADOR o el creador del reporte.
 *
 * Decisión A+B+C: el público NO marca directo — reporta un "avistamiento" (crea
 * un ENCONTRADA vinculado) que el coordinador valida (human-in-the-loop). Solo el
 * creador o el coordinador cierran el reporte.
 */
export function puedeMarcarResuelto(
  reporte: ReportePersona,
  actorId: string,
  roles: RolPrivilegiado[]
): boolean {
  const estadoResoluble =
    reporte.estado === "ACTIVO" ||
    reporte.estado === "CAPTURADO" ||
    reporte.estado === "PENDIENTE_SYNC";
  const autorizado = esCoordinador(roles) || reporte.creadoPorId === actorId;
  return estadoResoluble && autorizado;
}
