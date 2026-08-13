import * as Location from "expo-location";
import { Coordenadas, LocationProvider } from "../domain";

/**
 * Ubicación del dispositivo vía expo-location. Best-effort: si el usuario niega el
 * permiso o no hay señal, devuelve null (nunca lanza). Precisión "balanced" para
 * no drenar batería ni bloquear la captura en emergencia.
 */
export class ExpoLocationProvider implements LocationProvider {
  async obtenerActual(): Promise<Coordenadas | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  }
}
