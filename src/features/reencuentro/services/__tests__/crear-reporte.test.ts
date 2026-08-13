import { crearReporte, CrearReporteDeps } from "../crear-reporte";
import { InMemoryReportRepository, CrearReporteInput } from "../../domain";

function deps(): CrearReporteDeps & { repo: InMemoryReportRepository } {
  const repo = new InMemoryReportRepository();
  let n = 0;
  return { repo, generarId: () => `id-${++n}`, ahora: () => "2026-08-12T00:00:00.000Z" };
}

function input(over: Partial<CrearReporteInput> = {}): CrearReporteInput {
  return { tipo: "ENCONTRADA", creadoPorRol: "SOCORRISTA", creadoPorId: "s1", ...over };
}

describe("crearReporte", () => {
  it("crea un reporte PENDIENTE / CAPTURADO y lo persiste", async () => {
    const d = deps();
    const { reporte } = await crearReporte(input({ nombre: "Ana", edadAprox: 30 }), d);
    expect(reporte.syncState).toBe("PENDIENTE");
    expect(reporte.estado).toBe("CAPTURADO");
    expect(reporte.intentosSync).toBe(0);
    expect(await d.repo.getById(reporte.id)).not.toBeNull();
  });

  it("deriva esMenor a partir de la edad", async () => {
    const d = deps();
    const { reporte } = await crearReporte(input({ edadAprox: 8, nombre: "Niño NN" }), d);
    expect(reporte.esMenor).toBe(true);
  });

  it("NO bloquea con datos escasos, pero advierte", async () => {
    const d = deps();
    const { reporte, advertencias } = await crearReporte(input({ nombre: "Ana" }), d);
    expect(reporte).toBeDefined();
    expect(advertencias.some((a) => /dato/i.test(a))).toBe(true);
  });

  it("advierte si una BUSCADA no trae contacto del reportante", async () => {
    const d = deps();
    const { advertencias } = await crearReporte(
      input({ tipo: "BUSCADA", nombre: "Ana", edadAprox: 30 }),
      d
    );
    expect(advertencias.some((a) => /whatsapp|tel[eé]fono/i.test(a))).toBe(true);
  });

  it("no advierte contacto si la BUSCADA sí lo trae", async () => {
    const d = deps();
    const { advertencias } = await crearReporte(
      input({
        tipo: "BUSCADA",
        nombre: "Ana",
        edadAprox: 30,
        reportante: { contactoWhatsapp: "+573001112233" },
      }),
      d
    );
    expect(advertencias.some((a) => /whatsapp|tel[eé]fono/i.test(a))).toBe(false);
  });
});
