import { InMemoryReportRepository } from "../mocks";
import { ReportePersona } from "../types";

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

describe("InMemoryReportRepository", () => {
  it("upsert es idempotente por id de cliente (no duplica al repetir)", async () => {
    const repo = new InMemoryReportRepository();
    await repo.upsert(reporte());
    await repo.upsert(reporte());
    await repo.upsert(reporte());
    expect(repo.size()).toBe(1);
  });

  it("lista los pendientes de sync (PENDIENTE y ERROR)", async () => {
    const repo = new InMemoryReportRepository();
    await repo.create(reporte({ id: "a", syncState: "PENDIENTE" }));
    await repo.create(reporte({ id: "b", syncState: "SINCRONIZADO" }));
    await repo.create(reporte({ id: "c", syncState: "ERROR" }));
    const pend = await repo.listPendingSync();
    expect(pend.map((r) => r.id).sort()).toEqual(["a", "c"]);
  });

  it("actualiza el estado de sync de un reporte", async () => {
    const repo = new InMemoryReportRepository();
    await repo.create(reporte({ id: "a", syncState: "PENDIENTE" }));
    await repo.setSyncState("a", "SINCRONIZADO");
    const r = await repo.getById("a");
    expect(r?.syncState).toBe("SINCRONIZADO");
  });

  it("devuelve copias (no expone referencias internas mutables)", async () => {
    const repo = new InMemoryReportRepository();
    await repo.create(reporte({ id: "a" }));
    const r1 = await repo.getById("a");
    if (r1) r1.nombre = "MUTADO";
    const r2 = await repo.getById("a");
    expect(r2?.nombre).toBeUndefined();
  });
});
