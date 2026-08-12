import NetInfo from "@react-native-community/netinfo";
import { ConnectivityMonitor } from "../domain";

/** Monitor de conectividad real basado en @react-native-community/netinfo. */
export class NetInfoConnectivityMonitor implements ConnectivityMonitor {
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected);
  }

  subscribe(cb: (online: boolean) => void): () => void {
    return NetInfo.addEventListener((state) => cb(Boolean(state.isConnected)));
  }
}
