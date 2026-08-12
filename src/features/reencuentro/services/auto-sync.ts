import { ConnectivityMonitor, SyncEngine } from "../domain";

/**
 * Dispara la sincronización cada vez que se recupera la conexión.
 * Devuelve una función para cancelar la suscripción.
 */
export function iniciarAutoSync(sync: SyncEngine, connectivity: ConnectivityMonitor): () => void {
  return connectivity.subscribe((online) => {
    if (online) {
      void sync.sync();
    }
  });
}
