import { Platform } from "react-native";

export const DEFAULT_COLOMBIA_REGION = {
  latitude: 4.8133,
  longitude: -75.6961,
  latitudeDelta: 1.8,
  longitudeDelta: 1.8,
};

export interface GPSResult {
  latitud: number;
  longitud: number;
  direccionAproximada?: string;
}

export const getCurrentGPSCoordinates = async (): Promise<GPSResult | null> => {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const direccion = await reverseGeocodeCoordinates(
                position.coords.latitude,
                position.coords.longitude
              );
              resolve({
                latitud: position.coords.latitude,
                longitud: position.coords.longitude,
                direccionAproximada: direccion,
              });
            },
            (error) => {
              console.log("Info GPS web:", error.message);
              resolve(null);
            },
            { timeout: 10000, enableHighAccuracy: true }
          );
        });
      }
      return null;
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo ubicación GPS:", error);
    return null;
  }
};

/**
 * Geocodificación inversa web mediante OpenStreetMap Nominatim API
 */
export const reverseGeocodeCoordinates = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await res.json();
    if (data && data.display_name) {
      const parts = data.display_name.split(",");
      return parts.slice(0, 3).join(", ").trim();
    }
  } catch (e) {}
  return `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
};
