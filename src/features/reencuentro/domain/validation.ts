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

/** Deriva si es menor de edad a partir de la edad aproximada. */
export function derivarEsMenor(edadAprox?: number): boolean {
  return typeof edadAprox === "number" && edadAprox < 18;
}
