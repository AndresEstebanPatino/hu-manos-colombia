import { QueueSyncEngine } from "../queue-sync-engine";
import { InMemoryReportRepository, FakeRemoteGateway, ReportePersona } from "../../domain";

function reporte(over: Partial<ReportePersona> = {}): ReportePersona {
  return {
    id: "r1",
    tipo: "ENCONTRADA",
    estado: "PENDIENTE_SYNC",
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

describe("QueueSyncEngine", () => {
  it("sincroniza un pendiente y lo marca SINCRONIZADO", async () => {
    const repo = new InMemoryReportRepository();
    const gw = new FakeRemoteGateway();
    await repo.create(reporte({ id: "a" }));

    const res = await new QueueSyncEngine(repo, gw).sync();

    expect(res.sincronizados).toEqual(["a"]);
    expect((await repo.getById("a"))?.syncState).toBe("SINCRONIZADO");
    // Al sincronizar, un reporte capturado pasa a ACTIVO (disponible para cruce/lista).
    expect((await repo.getById("a"))?.estado).toBe("ACTIVO");
  });

  it("es idempotente: re-sincronizar no vuelve a subir lo ya sincronizado", async () => {
    const repo = new InMemoryReportRepository();
    const gw = new FakeRemoteGateway();
    await repo.create(reporte({ id: "a" }));
    const engine = new QueueSyncEngine(repo, gw);

    await engine.sync();
    await engine.sync();

    expect(gw.upsertCount.get("a")).toBe(1);
  });

  it("aísla fallos: un ítem que falla no frena a los demás", async () => {
    const repo = new InMemoryReportRepository();
    const gw = new FakeRemoteGateway();
    gw.fallarSiempre("b");
    await repo.create(reporte({ id: "a" }));
    await repo.create(reporte({ id: "b" }));
    await repo.create(reporte({ id: "c" }));

    const res = await new QueueSyncEngine(repo, gw).sync();

    expect(res.sincronizados.sort()).toEqual(["a", "c"]);
    expect(res.fallidos).toEqual(["b"]);
    expect((await repo.getById("a"))?.syncState).toBe("SINCRONIZADO");
    expect((await repo.getById("b"))?.syncState).toBe("PENDIENTE");
  });

  it("tras maxIntentos marca ERROR pero NUNCA descarta el reporte", async () => {
    const repo = new InMemoryReportRepository();
    const gw = new FakeRemoteGateway();
    gw.fallarSiempre("a");
    await repo.create(reporte({ id: "a" }));
    const engine = new QueueSyncEngine(repo, gw, 3);

    await engine.sync();
    await engine.sync();
    await engine.sync();

    const r = await repo.getById("a");
    expect(r).not.toBeNull();
    expect(r?.syncState).toBe("ERROR");
    expect(r?.intentosSync).toBe(3);
    expect(repo.size()).toBe(1);
  });

  it("reintenta tras fallos transitorios hasta lograrlo", async () => {
    const repo = new InMemoryReportRepository();
    const gw = new FakeRemoteGateway();
    gw.fallarVeces("a", 2);
    await repo.create(reporte({ id: "a" }));
    const engine = new QueueSyncEngine(repo, gw, 5);

    await engine.sync(); // falla 1
    await engine.sync(); // falla 2
    const res = await engine.sync(); // éxito

    expect(res.sincronizados).toEqual(["a"]);
    expect((await repo.getById("a"))?.syncState).toBe("SINCRONIZADO");
  });
});
