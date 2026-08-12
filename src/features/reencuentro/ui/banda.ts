import { BandaConfianza, Coincidencia } from "../domain";

// Etiquetas NEUTRAS: no prometen certeza (evitan falsa esperanza/falsa certeza).
const ETIQUETAS: Record<BandaConfianza, string> = {
  REVISION_PRIORITARIA: "Revisión prioritaria",
  POSIBLE: "Posible coincidencia",
  BAJA: "Baja prioridad",
};

export function etiquetaBanda(banda: BandaConfianza): string {
  return ETIQUETAS[banda];
}

const ORDEN: Record<BandaConfianza, number> = {
  REVISION_PRIORITARIA: 0,
  POSIBLE: 1,
  BAJA: 2,
};

/** Ordena las coincidencias por banda: prioritaria > posible > baja. */
export function ordenarPorBanda(coincidencias: Coincidencia[]): Coincidencia[] {
  return [...coincidencias].sort((a, b) => ORDEN[a.banda] - ORDEN[b.banda]);
}
