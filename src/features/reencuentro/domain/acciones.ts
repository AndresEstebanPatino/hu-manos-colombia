import { CrearReporteInput, ReportePersona } from "./types";
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

/**
 * Construye el input de un "avistamiento": un reporte ENCONTRADA vinculado a una
 * BUSCADA (la misma persona, vista por alguien del público). Pre-rellena pistas de
 * la BUSCADA; el observador edita/confirma. El matching lo cruza y el coordinador
 * valida (human-in-the-loop) — NO cambia el estado directo.
 */
export function construirAvistamiento(
  buscada: ReportePersona,
  observadorId: string
): CrearReporteInput {
  return {
    tipo: "ENCONTRADA",
    creadoPorRol: "FAMILIAR",
    creadoPorId: observadorId,
    nombre: buscada.nombre,
    edadAprox: buscada.edadAprox,
    sexo: buscada.sexo,
    senasParticulares: buscada.senasParticulares,
    estadoVital: "CON_VIDA",
  };
}
