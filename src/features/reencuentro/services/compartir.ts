import { ReportePersona } from "../domain";

/**
 * Construye el mensaje de difusión de un reporte BUSCADA para WhatsApp/redes.
 * Solo se usa con reportes públicos (BUSCADA no-menores): no expone datos sensibles.
 */
export function mensajeDifusion(reporte: ReportePersona, urlApp?: string): string {
  const partes: (string | null)[] = [
    "🔎 BUSCAMOS a esta persona (Hu-Manos Colombia · Reencuentro):",
    reporte.nombre ? `Nombre: ${reporte.nombre}` : null,
    typeof reporte.edadAprox === "number" ? `Edad aprox: ${reporte.edadAprox}` : null,
    reporte.ultimaUbicacion?.texto ? `Última ubicación: ${reporte.ultimaUbicacion.texto}` : null,
    reporte.senasParticulares ? `Señas: ${reporte.senasParticulares}` : null,
    urlApp ? `Más info: ${urlApp}` : null,
    "Si tienes información, repórtala en la app. 🙏",
  ];
  return partes.filter((v): v is string => Boolean(v)).join("\n");
}

/** URL wa.me para compartir el mensaje por WhatsApp. */
export function urlCompartirWhatsApp(mensaje: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

/** URL wa.me dirigida a un contacto específico (normaliza el número a solo dígitos). */
export function urlWhatsAppContacto(numero: string, mensaje: string): string {
  const soloDigitos = (numero ?? "").replace(/[^0-9]/g, "");
  return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(mensaje)}`;
}
