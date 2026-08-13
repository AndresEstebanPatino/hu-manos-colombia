import { ReportePersona } from "./types";

export interface FiltrosBusqueda {
  texto?: string;
  tipo?: "BUSCADA" | "ENCONTRADA";
  soloConFoto?: boolean;
}

/**
 * Minúsculas + sin acentos, para búsqueda tolerante.
 * Descompone (NFD) y descarta las marcas diacríticas combinantes (U+0300–U+036F)
 * sin usar literales combinantes en el código (robusto en node y Hermes).
 */
export function normalizar(s: string): string {
  const nfd = s.toLowerCase().normalize("NFD");
  let out = "";
  for (const ch of nfd) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x0300 || c > 0x036f) out += ch;
  }
  return out;
}

/** true si el texto (normalizado) aparece en nombre, ubicación o señas. */
export function coincideBusqueda(reporte: ReportePersona, texto: string): boolean {
  const q = normalizar(texto.trim());
  if (!q) return true;
  const campos = [reporte.nombre, reporte.ultimaUbicacion?.texto, reporte.senasParticulares]
    .filter((v): v is string => Boolean(v))
    .map(normalizar);
  return campos.some((c) => c.includes(q));
}

export function tieneFoto(reporte: ReportePersona): boolean {
  return Boolean(reporte.foto?.uriLocal || reporte.foto?.urlRemota);
}

/** Filtra por tipo, texto (tolerante a acentos) y presencia de foto. */
export function aplicarFiltros(
  reportes: ReportePersona[],
  filtros: FiltrosBusqueda
): ReportePersona[] {
  return reportes.filter((r) => {
    if (filtros.tipo && r.tipo !== filtros.tipo) return false;
    if (filtros.soloConFoto && !tieneFoto(r)) return false;
    if (filtros.texto && !coincideBusqueda(r, filtros.texto)) return false;
    return true;
  });
}
