import * as Location from "expo-location";

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

/**
 * Obtiene las coordenadas GPS del dispositivo con timeout de 3 segundos
 * para evitar congelamientos en Expo Go o celulares con GPS lento.
 */
export const getCurrentGPSCoordinates = async (): Promise<GPSResult | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    // 1. Intentar obtener la última posición conocida (0ms de latencia)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        const direccion = await reverseGeocodeCoordinates(
          lastKnown.coords.latitude,
          lastKnown.coords.longitude
        );
        return {
          latitud: lastKnown.coords.latitude,
          longitud: lastKnown.coords.longitude,
          direccionAproximada: direccion,
        };
      }
    } catch (e) {}

    // 2. Si no hay última posición, consultar con timeout máximo de 3 segundos
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));

    const location: any = await Promise.race([locationPromise, timeoutPromise]);

    if (location?.coords) {
      const direccionAproximada = await reverseGeocodeCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      return {
        latitud: location.coords.latitude,
        longitud: location.coords.longitude,
        direccionAproximada,
      };
    }
  } catch (error) {
    console.error("Error obteniendo ubicación GPS nativa:", error);
  }

  return null;
};

/**
 * Geocodificación inversa nativa con timeout de seguridad
 */
export const reverseGeocodeCoordinates = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const reversePromise = Location.reverseGeocodeAsync({ latitude, longitude });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

    const reverse: any = await Promise.race([reversePromise, timeoutPromise]);

    if (reverse && reverse.length > 0) {
      const item = reverse[0];
      const parts = [
        item.streetNumber ? `${item.street} ${item.streetNumber}` : item.street,
        item.district || item.subregion,
        item.city,
        item.region,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  } catch (e) {}
  return `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
};
