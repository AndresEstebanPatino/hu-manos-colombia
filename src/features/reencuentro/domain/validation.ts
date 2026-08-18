// Validaciones de captura (lógica pura). Las carencias NO bloquean la captura offline;
// solo generan advertencias / bajan la prioridad de cruce.

import { CrearReporteInput } from "./types";

/** Cuenta cuántos campos identificatorios trae el input. */
export function contarCamposIdentificatorios(input: CrearReporteInput): number {
  let n = 0;
  if (input.nombre && input.nombre.trim().length > 0) n++;
  if (typeof input.edadAprox === "number") n++;
  if (
    input.ultimaUbicacion &&
    (Boolean(input.ultimaUbicacion.texto) || typeof input.ultimaUbicacion.lat === "number")
  ) {
    n++;
  }
  if (input.foto && Boolean(input.foto.uriLocal)) n++;
  if (input.senasParticulares && input.senasParticulares.trim().length > 0) n++;
  return n;
}

/** Regla: al menos 2 campos identificatorios para tener buena prioridad de cruce. */
export function cumpleIdentificabilidadMinima(input: CrearReporteInput): boolean {
  return contarCamposIdentificatorios(input) >= 2;
}

/**
 * Deriva si es menor de edad a partir de la edad aproximada.
 * Principio de precaución: ante la falta de edad aproximada (undefined, null o no numérico),
 * se asume menor de edad por defecto (es_menor = true) para proteger su PII y evitar
 * su exposición en listados públicos sin verificación previa.
 */
export function derivarEsMenor(edadAprox?: number): boolean {
  if (typeof edadAprox !== "number" || isNaN(edadAprox)) {
    return true;
  }
  return edadAprox < 18;
}

