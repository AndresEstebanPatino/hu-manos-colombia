// Notificación a la familia ante una coincidencia (Ola 5, human-in-the-loop).
// Reglas duras reutilizadas de state-machines: la app NO notifica sola ni notifica
// casos con fallecido (esos van al protocolo oficial). El coordinador dispara el envío.

import { ReportePersona, Coincidencia } from "./types";
import { appPuedeNotificarFamiliar } from "./state-machines";

/**
 * Mensaje PRUDENTE para la familia ante una posible coincidencia. NO afirma un
 * hallazgo (podría ser un falso positivo o un caso delicado): anuncia una posible
 * coincidencia y que un coordinador la verificará antes de confirmar nada.
 */
export function mensajeNotificacionFamilia(nombre?: string): string {
  const quien = nombre ?? "la persona que reportaste";
  return (
    `Hola. Te contacta el equipo de coordinación de Hu-Manos Colombia (Reencuentro). ` +
    `Tenemos una posible coincidencia sobre ${quien}. ` +
    `Un coordinador verificará los datos contigo antes de confirmar nada; ` +
    `por favor responde a este mensaje para continuar. Gracias.`
  );
}

/** Plan de notificación a la familia: a quién y con qué mensaje. */
export interface PlanNotificacionFamilia {
  contactoWhatsapp: string;
  mensaje: string;
}

/**
 * Arma el plan de notificación SOLO si las reglas HITL lo permiten: la coincidencia
 * está en PENDIENTE_NOTIFICACION, NO involucra fallecido y hay un contacto de
 * WhatsApp del reportante. Devuelve null si no procede (la app nunca fuerza el envío).
 */
export function planNotificacionFamilia(
  coincidencia: Coincidencia,
  reporteBuscada: ReportePersona
): PlanNotificacionFamilia | null {
  if (!appPuedeNotificarFamiliar(coincidencia)) return null;
  const contacto = reporteBuscada.reportante?.contactoWhatsapp?.trim();
  if (!contacto) return null;
  return {
    contactoWhatsapp: contacto,
    mensaje: mensajeNotificacionFamilia(reporteBuscada.nombre),
  };
}
