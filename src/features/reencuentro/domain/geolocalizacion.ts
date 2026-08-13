// Geolocalización de la captura: GPS del dispositivo + geocodificación inversa
// (coords -> texto legible). Ambos son puertos; las implementaciones reales
// (expo-location, Nominatim/OSM) viven en services/.

/** Coordenadas geográficas (grados decimales). */
export interface Coordenadas {
  lat: number;
  lng: number;
}

/** Proveedor de la ubicación actual del dispositivo (wrap de expo-location). */
export interface LocationProvider {
  /** Coordenadas actuales, o null si no hay permiso/señal. Nunca lanza. */
  obtenerActual(): Promise<Coordenadas | null>;
}

/** Geocodificación inversa (coords -> texto). Implementación real: Nominatim/OSM. */
export interface Geocoder {
  /** Describe unas coords como texto corto legible; null si no se pudo. */
  describir(coords: Coordenadas): Promise<string | null>;
}

/** true si las coords están dentro de rango válido. */
export function coordsValidas(c: Coordenadas): boolean {
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    c.lng >= -180 &&
    c.lng <= 180
  );
}

/** Texto corto "lat, lng" (fallback cuando no hay geocodificación). */
export function formatearCoords(c: Coordenadas): string {
  return `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
}
