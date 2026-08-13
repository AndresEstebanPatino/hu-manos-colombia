/**
 * Servicio de Geocodificación gratuito con OpenStreetMap Nominatim API
 * Cobertura para Colombia (countrycodes=co) sin API Key ni costos.
 */

export interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  importance?: number;
}

export interface GeocodedCoords {
  latitud: number;
  longitud: number;
  direccionFormateada: string;
}

// Caché no persistente en memoria durante la sesión
const searchCache = new Map<string, NominatimPlace[]>();

/**
 * Busca direcciones en Colombia usando la API gratuita de Nominatim (OSM)
 */
export async function buscarDireccionOSM(query: string): Promise<NominatimPlace[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery || cleanQuery.length < 3) return [];

  // Retornar de caché si existe
  if (searchCache.has(cleanQuery)) {
    return searchCache.get(cleanQuery) || [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        cleanQuery
      )}&format=json&countrycodes=co&limit=5`,
      {
        headers: {
          "User-Agent": "HuManoColombia/1.0 (app de ayuda humanitaria Colombia)",
          "Accept-Language": "es",
        },
      }
    );

    if (!response.ok) {
      console.log("Nominatim response info:", response.statusText);
      return [];
    }

    const data: NominatimPlace[] = await response.json();
    if (Array.isArray(data)) {
      searchCache.set(cleanQuery, data);
      return data;
    }
  } catch (error) {
    console.log("Error al consultar Nominatim OSM:", error);
  }

  return [];
}

/**
 * Formatea el display_name de Nominatim para mostrar un título amigable
 */
export function formatNominatimTitle(rawAddress: string): string {
  if (!rawAddress) return "";
  const parts = rawAddress.split(",");
  if (parts.length <= 3) return rawAddress.trim();
  return parts.slice(0, 3).join(",").trim();
}
