import { Coordenadas, Geocoder, formatearCoords } from "../domain";

const BASE = "https://nominatim.openstreetmap.org/reverse";

/** Construye la URL de reverse geocoding de Nominatim (sin depender de URLSearchParams). */
export function urlReverse(c: Coordenadas): string {
  const q =
    `format=jsonv2` +
    `&lat=${encodeURIComponent(String(c.lat))}` +
    `&lon=${encodeURIComponent(String(c.lng))}` +
    `&zoom=14&addressdetails=1`;
  return `${BASE}?${q}`;
}

function pick(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * Extrae un texto legible y corto de la respuesta de Nominatim: prioriza
 * localidad + región; si no, recorta `display_name` a sus 2 primeras partes.
 */
export function textoDeRespuesta(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  const address = obj.address;
  if (address && typeof address === "object") {
    const a = address as Record<string, unknown>;
    const localidad = pick(a, ["city", "town", "village", "hamlet", "municipality", "county"]);
    const region = pick(a, ["state", "region"]);
    const partes = [localidad, region].filter((s): s is string => Boolean(s));
    if (partes.length > 0) return partes.join(", ");
  }

  const display = obj.display_name;
  if (typeof display === "string" && display.length > 0) {
    return display
      .split(",")
      .slice(0, 2)
      .map((s) => s.trim())
      .join(", ");
  }
  return null;
}

/**
 * Geocodificación inversa contra Nominatim (OSM, gratuito). Best-effort: si falla
 * la red o el parseo, devuelve el fallback "lat, lng" (o null si ni eso). Respeta
 * la política de uso enviando User-Agent identificatorio.
 */
export class NominatimGeocoder implements Geocoder {
  async describir(coords: Coordenadas): Promise<string | null> {
    try {
      const res = await fetch(urlReverse(coords), {
        headers: {
          Accept: "application/json",
          "User-Agent": "HuManoColombia/1.0 (modulo reencuentro)",
        },
      });
      if (!res.ok) return formatearCoords(coords);
      const json = (await res.json()) as unknown;
      return textoDeRespuesta(json) ?? formatearCoords(coords);
    } catch {
      return null;
    }
  }
}
