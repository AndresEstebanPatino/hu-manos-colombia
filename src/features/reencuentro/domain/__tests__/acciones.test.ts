import { puedeMarcarResuelto, construirAvistamiento } from "../acciones";
import { ReportePersona } from "../types";

function reporte(over: Partial<ReportePersona> = {}): ReportePersona {
  return {
    id: "r1",
    tipo: "BUSCADA",
    estado: "ACTIVO",
    syncState: "SINCRONIZADO",
    esMenor: false,
    creadoPorRol: "FAMILIAR",
    creadoPorId: "fam1",
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    intentosSync: 0,
    ...over,
  };
}

describe("puedeMarcarResuelto", () => {
  it("el coordinador puede resolver cualquier reporte activo", () => {
    expect(puedeMarcarResuelto(reporte(), "otro-usuario", ["COORDINADOR"])).toBe(true);
  });

  it("el creador puede resolver el suyo", () => {
    expect(puedeMarcarResuelto(reporte({ creadoPorId: "fam1" }), "fam1", [])).toBe(true);
  });

  it("un tercero sin rol NO puede", () => {
    expect(puedeMarcarResuelto(reporte({ creadoPorId: "fam1" }), "otro", [])).toBe(false);
  });

  it("un rol privilegiado no-coordinador (hospital) NO puede resolver ajeno", () => {
    expect(puedeMarcarResuelto(reporte({ creadoPorId: "fam1" }), "hosp", ["HOSPITAL"])).toBe(false);
  });

  it("no se resuelve un reporte ya RESUELTO/ARCHIVADO", () => {
    expect(puedeMarcarResuelto(reporte({ estado: "RESUELTO" }), "fam1", ["COORDINADOR"])).toBe(false);
    expect(puedeMarcarResuelto(reporte({ estado: "ARCHIVADO" }), "fam1", ["COORDINADOR"])).toBe(false);
  });
});

describe("construirAvistamiento", () => {
  it("crea un ENCONTRADA con las pistas de la BUSCADA", () => {
    const buscada = reporte({
      nombre: "Ana Gómez",
      edadAprox: 30,
      sexo: "F",
      senasParticulares: "cicatriz en la ceja",
    });
    const av = construirAvistamiento(buscada, "observador-1");
    expect(av.tipo).toBe("ENCONTRADA");
    expect(av.creadoPorId).toBe("observador-1");
    expect(av.creadoPorRol).toBe("FAMILIAR");
    expect(av.nombre).toBe("Ana Gómez");
    expect(av.edadAprox).toBe(30);
    expect(av.sexo).toBe("F");
    expect(av.senasParticulares).toBe("cicatriz en la ceja");
    expect(av.estadoVital).toBe("CON_VIDA");
  });

  it("NO arrastra el id ni el estado de la BUSCADA (es un reporte nuevo)", () => {
    const buscada = reporte({ id: "buscada-99", estado: "ACTIVO" });
    const av = construirAvistamiento(buscada, "obs") as unknown as Record<string, unknown>;
    expect(av.id).toBeUndefined();
    expect(av.estado).toBeUndefined();
  });
});
