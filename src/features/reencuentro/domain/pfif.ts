// Exportación a PFIF (People Finder Interchange Format) 1.4 — el estándar que usan
// sistemas como Google Person Finder para intercambiar datos de personas
// desaparecidas. Serializador puro (sin red, sin plataforma), testeable.

import { ReportePersona } from "./types";

const PFIF_NS = "http://zesty.ca/pfif/1.4";
const DOMINIO = "andresestebanpatino.github.io/hu-manos-colombia";

/** Escapa los caracteres especiales de XML. */
function esc(v: string | number | undefined): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Mapea el sexo del dominio al vocabulario PFIF (male/female/other). */
function sexoPfif(sexo?: string): string {
  switch (sexo) {
    case "M":
      return "male";
    case "F":
      return "female";
    case "OTRO":
      return "other";
    default:
      return "";
  }
}

function descripcion(r: ReportePersona): string {
  return [r.descripcionFisica, r.ropa, r.senasParticulares]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(". ");
}

/** Serializa un reporte a un registro `<pfif:person>` (PFIF 1.4). */
export function personaAPfif(r: ReportePersona): string {
  const desc = descripcion(r);
  return [
    "  <pfif:person>",
    `    <pfif:person_record_id>${DOMINIO}/${esc(r.id)}</pfif:person_record_id>`,
    `    <pfif:entry_date>${esc(r.creadoEn)}</pfif:entry_date>`,
    `    <pfif:source_date>${esc(r.creadoEn)}</pfif:source_date>`,
    r.nombre ? `    <pfif:full_name>${esc(r.nombre)}</pfif:full_name>` : "",
    sexoPfif(r.sexo) ? `    <pfif:sex>${sexoPfif(r.sexo)}</pfif:sex>` : "",
    typeof r.edadAprox === "number" ? `    <pfif:age>${esc(r.edadAprox)}</pfif:age>` : "",
    r.ultimaUbicacion?.texto
      ? `    <pfif:home_city>${esc(r.ultimaUbicacion.texto)}</pfif:home_city>`
      : "",
    r.foto?.urlRemota ? `    <pfif:photo_url>${esc(r.foto.urlRemota)}</pfif:photo_url>` : "",
    desc ? `    <pfif:other>description: ${esc(desc)}</pfif:other>` : "",
    "  </pfif:person>",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Documento PFIF 1.4 con los reportes tipo BUSCADA (personas desaparecidas).
 * Los ENCONTRADA y otros tipos se omiten (PFIF person = persona buscada).
 */
export function reportesAPfif(reportes: ReportePersona[]): string {
  const personas = reportes
    .filter((r) => r.tipo === "BUSCADA")
    .map(personaAPfif)
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<pfif:pfif xmlns:pfif="${PFIF_NS}">\n` +
    (personas ? personas + "\n" : "") +
    `</pfif:pfif>`
  );
}
