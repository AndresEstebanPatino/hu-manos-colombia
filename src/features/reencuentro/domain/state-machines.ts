// Máquinas de estado del dominio Reencuentro (lógica pura, testeable sin plataforma).
// Codifica las reglas no negociables del human-in-the-loop.

import { EstadoReporte, EstadoCoincidencia, Coincidencia } from "./types";

const TRANSICIONES_REPORTE: Record<EstadoReporte, EstadoReporte[]> = {
  CAPTURADO: ["PENDIENTE_SYNC", "ACTIVO"],
  PENDIENTE_SYNC: ["ACTIVO"],
  ACTIVO: ["DUPLICADO", "RESUELTO"],
  DUPLICADO: ["ACTIVO", "ARCHIVADO"],
  RESUELTO: ["ARCHIVADO"],
  ARCHIVADO: [],
};

export function puedeTransicionarReporte(desde: EstadoReporte, hacia: EstadoReporte): boolean {
  return TRANSICIONES_REPORTE[desde].includes(hacia);
}

const TRANSICIONES_COINCIDENCIA: Record<EstadoCoincidencia, EstadoCoincidencia[]> = {
  SUGERIDA: ["EN_REVISION"],
  EN_REVISION: ["INFO_INSUFICIENTE", "RECHAZADA", "CONFIRMADA"],
  INFO_INSUFICIENTE: ["EN_REVISION"],
  RECHAZADA: [],
  CONFIRMADA: ["PENDIENTE_NOTIFICACION"],
  PENDIENTE_NOTIFICACION: ["NOTIFICADA"],
  NOTIFICADA: ["CERRADA"],
  CERRADA: [],
};

export function puedeTransicionarCoincidencia(
  desde: EstadoCoincidencia,
  hacia: EstadoCoincidencia
): boolean {
  return TRANSICIONES_COINCIDENCIA[desde].includes(hacia);
}

/**
 * Regla no negociable: una coincidencia con fallecido exige doble validación
 * (un segundo validador distinto del revisor) antes de poder CONFIRMAR.
 */
export function requiereDobleValidacion(c: Coincidencia): boolean {
  return c.involucraFallecido;
}

export interface ResultadoRegla {
  ok: boolean;
  motivo?: string;
}

export function puedeConfirmar(c: Coincidencia): ResultadoRegla {
  if (c.estado !== "EN_REVISION") {
    return { ok: false, motivo: "La coincidencia no está en revisión." };
  }
  if (requiereDobleValidacion(c)) {
    if (!c.segundoValidadorId) {
      return { ok: false, motivo: "Caso con fallecido: requiere un segundo validador." };
    }
    if (c.segundoValidadorId === c.revisorId) {
      return { ok: false, motivo: "El segundo validador debe ser distinto del revisor." };
    }
  }
  return { ok: true };
}

/**
 * Regla no negociable: una coincidencia con fallecido o con menor de edad NO se notifica
 * al familiar de forma automática sin validación especial del coordinador.
 * Devuelve true solo si la app puede enviar la notificación.
 */
export function appPuedeNotificarFamiliar(c: Coincidencia): boolean {
  return c.estado === "PENDIENTE_NOTIFICACION" && !c.involucraFallecido && !c.involucraMenor;
}
