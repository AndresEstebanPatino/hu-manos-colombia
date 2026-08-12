jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AsyncStorageReportRepository } from "../async-storage-report-repository";
import { ReportePersona } from "../../domain";

function reporte(over: Partial<ReportePersona> = {}): ReportePersona {
  return {
    id: "r1",
    tipo: "ENCONTRADA",
    estado: "CAPTURADO",
    syncState: "PENDIENTE",
    esMenor: false,
    creadoPorRol: "SOCORRISTA",
    creadoPorId: "s1",
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    intentosSync: 0,
    ...over,
  };
}

describe("AsyncStorageReportRepository", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("persiste y recupera por id", async () => {
    const repo = new AsyncStorageReportRepository();
    await repo.create(reporte({ id: "a" }));
    expect((await repo.getById("a"))?.id).toBe("a");
  });

  it("upsert es idempotente por id (no duplica)", async () => {
    const repo = new AsyncStorageReportRepository();
    await repo.upsert(reporte({ id: "a" }));
    await repo.upsert(reporte({ id: "a" }));
    expect((await repo.listLocal()).length).toBe(1);
  });

  it("es durable entre instancias (sobrevive a un 'reinicio')", async () => {
    await new AsyncStorageReportRepository().create(reporte({ id: "a" }));
    const otra = new AsyncStorageReportRepository();
    expect((await otra.getById("a"))?.id).toBe("a");
  });

  it("lista los pendientes de sync (PENDIENTE y ERROR)", async () => {
    const repo = new AsyncStorageReportRepository();
    await repo.create(reporte({ id: "a", syncState: "PENDIENTE" }));
    await repo.create(reporte({ id: "b", syncState: "SINCRONIZADO" }));
    await repo.create(reporte({ id: "c", syncState: "ERROR" }));
    const pend = await repo.listPendingSync();
    expect(pend.map((r) => r.id).sort()).toEqual(["a", "c"]);
  });

  it("actualiza el estado de sync", async () => {
    const repo = new AsyncStorageReportRepository();
    await repo.create(reporte({ id: "a", syncState: "PENDIENTE" }));
    await repo.setSyncState("a", "SINCRONIZADO");
    expect((await repo.getById("a"))?.syncState).toBe("SINCRONIZADO");
  });
});
