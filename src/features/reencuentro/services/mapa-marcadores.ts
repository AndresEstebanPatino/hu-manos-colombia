import { PersonaMarker } from "../../../components/MapaIntegrado.types";
import { ReportePersona, coordsValidas } from "../domain";

/**
 * Convierte reportes de reencuentro en marcadores para el mapa. Solo incluye los
 * que tienen coordenadas válidas (los que solo tienen texto no se ubican en el mapa,
 * pero siguen visibles en la lista). Pura y testeable.
 */
export function reencuentroPersonaMarcadores(reportes: ReportePersona[]): PersonaMarker[] {
  const marcadores: PersonaMarker[] = [];
  for (const r of reportes) {
    const lat = r.ultimaUbicacion?.lat;
    const lng = r.ultimaUbicacion?.lng;
    if (lat == null || lng == null || !coordsValidas({ lat, lng })) continue;
    marcadores.push({
      id: r.id,
      lat,
      lng,
      nombre: r.nombre ?? "Sin nombre",
      tipo: r.tipo,
      ubicacion: r.ultimaUbicacion?.texto,
    });
  }
  return marcadores;
}
