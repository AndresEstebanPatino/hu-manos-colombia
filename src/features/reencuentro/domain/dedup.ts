// Deduplicación (Ola 6): detectar reportes que probablemente son la MISMA persona
// (varios familiares reportan al mismo desaparecido) y permitir al coordinador
// marcar uno como DUPLICADO de un maestro. Lógica pura y testeable.

import { ReportePersona } from "./types";
import { normalizar } from "./busqueda";
import { RolPrivilegiado, esCoordinador } from "./roles";
import { puedeTransicionarReporte, ResultadoRegla } from "./state-machines";

function tokens(s?: string): string[] {
  return normalizar(s ?? "")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

/**
 * Puntaje de similitud 0..1 entre dos reportes (nombre pesa más; luego ubicación
 * y cercanía de edad). No decide nada por sí solo: alimenta el umbral y el orden.
 */
export function puntajeSimilitud(a: ReportePersona, b: ReportePersona): number {
  const nombre = jaccard(tokens(a.nombre), tokens(b.nombre));
  const ubic = jaccard(tokens(a.ultimaUbicacion?.texto), tokens(b.ultimaUbicacion?.texto));
  let edad = 0;
  if (typeof a.edadAprox === "number" && typeof b.edadAprox === "number") {
    edad = Math.abs(a.edadAprox - b.edadAprox) <= 3 ? 1 : 0;
  }
  return 0.6 * nombre + 0.25 * ubic + 0.15 * edad;
}

/** ¿Son posibles duplicados? Mismo tipo y similitud sobre el umbral. */
export function sonPosiblesDuplicados(
  a: ReportePersona,
  b: ReportePersona,
  umbral = 0.5
): boolean {
  if (a.id === b.id) return false;
  if (a.tipo !== b.tipo) return false;
  return puntajeSimilitud(a, b) >= umbral;
}

/** Candidatos duplicados de `reporte` dentro de `otros`, ordenados por similitud desc. */
export function candidatosDuplicados(
  reporte: ReportePersona,
  otros: ReportePersona[],
  umbral = 0.5
): ReportePersona[] {
  return otros
    .filter((o) => sonPosiblesDuplicados(reporte, o, umbral))
    .sort((x, y) => puntajeSimilitud(reporte, y) - puntajeSimilitud(reporte, x));
}

/**
 * ¿Puede el actor marcar `reporte` como DUPLICADO de `maestro`?
 * Solo COORDINADOR, mismo tipo, distinto id, y el estado debe permitir la transición.
 */
export function puedeMarcarDuplicado(
  reporte: ReportePersona,
  maestro: ReportePersona,
  roles: RolPrivilegiado[]
): ResultadoRegla {
  if (!esCoordinador(roles)) {
    return { ok: false, motivo: "Solo un coordinador puede marcar duplicados." };
  }
  if (reporte.id === maestro.id) {
    return { ok: false, motivo: "Un reporte no puede ser duplicado de sí mismo." };
  }
  if (reporte.tipo !== maestro.tipo) {
    return { ok: false, motivo: "Los reportes deben ser del mismo tipo (BUSCADA/ENCONTRADA)." };
  }
  if (!puedeTransicionarReporte(reporte.estado, "DUPLICADO")) {
    return { ok: false, motivo: "El reporte no puede pasar a DUPLICADO desde su estado actual." };
  }
  return { ok: true };
}
