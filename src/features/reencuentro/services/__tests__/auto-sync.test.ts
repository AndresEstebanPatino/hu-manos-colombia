import { iniciarAutoSync } from "../auto-sync";
import { FakeConnectivityMonitor, SyncEngine } from "../../domain";

function fakeSync(): SyncEngine & { sync: jest.Mock } {
  return { sync: jest.fn().mockResolvedValue({ sincronizados: [], fallidos: [] }) };
}

describe("iniciarAutoSync", () => {
  it("sincroniza al recuperar la conexión", () => {
    const monitor = new FakeConnectivityMonitor(false);
    const sync = fakeSync();

    iniciarAutoSync(sync, monitor);
    expect(sync.sync).not.toHaveBeenCalled();

    monitor.setOnline(true);
    expect(sync.sync).toHaveBeenCalledTimes(1);
  });

  it("no sincroniza al perder la conexión", () => {
    const monitor = new FakeConnectivityMonitor(true);
    const sync = fakeSync();

    iniciarAutoSync(sync, monitor);
    monitor.setOnline(false);

    expect(sync.sync).not.toHaveBeenCalled();
  });

  it("deja de sincronizar tras cancelar la suscripción", () => {
    const monitor = new FakeConnectivityMonitor(false);
    const sync = fakeSync();

    const cancelar = iniciarAutoSync(sync, monitor);
    cancelar();
    monitor.setOnline(true);

    expect(sync.sync).not.toHaveBeenCalled();
  });
});
