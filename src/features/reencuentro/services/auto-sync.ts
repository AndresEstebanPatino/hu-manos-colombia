import { ConnectivityMonitor, SyncEngine } from "../domain";

/**
 * Dispara la sincronización cada vez que se recupera la conexión.
 * Devuelve una función para cancelar la suscripción.
 */
export function iniciarAutoSync(sync: SyncEngine, connectivity: ConnectivityMonitor): () => void {
  // Sync inicial: en web (o si ya estamos online al montar) el evento de "reconexión"
  // no dispara nunca, así que forzamos una subida de la cola pendiente ahora.
  void connectivity.isOnline().then((online) => {
    if (online) void sync.sync();
  });
  return connectivity.subscribe((online) => {
    if (online) {
      void sync.sync();
    }
  });
}
