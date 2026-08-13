import { reporteARow, rowAReporte, ReporteRow } from "../reporte-row";
import { ReportePersona } from "../../domain";

function reporte(over: Partial<ReportePersona> = {}): ReportePersona {
  return {
    id: "r1",
    tipo: "BUSCADA",
    estado: "CAPTURADO",
    syncState: "PENDIENTE",
    esMenor: true,
    creadoPorRol: "FAMILIAR",
    creadoPorId: "u1",
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    intentosSync: 0,
    ...over,
  };
}

describe("reporteARow", () => {
  it("mapea camelCase de dominio a snake_case de la fila", () => {
    const row = reporteARow(
      reporte({
        nombre: "Ana",
        edadAprox: 8,
        ultimaUbicacion: { texto: "Quibdó", lat: 5.69, lng: -76.66 },
        reportante: { nombre: "Luz", contactoWhatsapp: "+573001112233", relacion: "madre" },
      })
    );
    expect(row.id).toBe("r1");
    expect(row.es_menor).toBe(true);
    expect(row.edad_aprox).toBe(8);
    expect(row.ubicacion_texto).toBe("Quibdó");
    expect(row.ubicacion_lat).toBe(5.69);
    expect(row.reportante_contacto).toBe("+573001112233");
    expect(row.creado_por_rol).toBe("FAMILIAR");
  });

  it("usa null (no undefined) para campos ausentes", () => {
    const row = reporteARow(reporte());
    expect(row.nombre).toBeNull();
    expect(row.ubicacion_texto).toBeNull();
    expect(row.foto_url).toBeNull();
    expect(row.estado_vital).toBeNull();
  });

  it("no envía el estado de sync local al servidor", () => {
    const row = reporteARow(reporte());
    expect("sync_state" in row).toBe(false);
    expect("syncState" in row).toBe(false);
  });
});

function fila(over: Partial<ReporteRow> = {}): ReporteRow {
  return {
    id: "r1",
    tipo: "BUSCADA",
    estado: "ACTIVO",
    nombre: "Ana",
    edad_aprox: 30,
    es_menor: false,
    sexo: null,
    descripcion_fisica: null,
    ropa: null,
    senas_particulares: null,
    ubicacion_texto: "Quibdó",
    ubicacion_lat: null,
    ubicacion_lng: null,
    foto_url: null,
    estado_vital: null,
    reportante_nombre: null,
    reportante_contacto: null,
    reportante_relacion: null,
    creado_por_rol: "FAMILIAR",
    creado_por_id: "u1",
    maestro_id: null,
    creado_en: "2026-08-12T00:00:00.000Z",
    actualizado_en: "2026-08-12T00:00:00.000Z",
    ...over,
  };
}

describe("rowAReporte", () => {
  it("mapea snake_case de la fila a camelCase de dominio", () => {
    const r = rowAReporte(fila({ nombre: "Ana", edad_aprox: 30, ubicacion_texto: "Quibdó" }));
    expect(r.nombre).toBe("Ana");
    expect(r.edadAprox).toBe(30);
    expect(r.ultimaUbicacion?.texto).toBe("Quibdó");
    expect(r.syncState).toBe("SINCRONIZADO");
  });

  it("nulls -> undefined; sin ubicación/reportante/foto -> undefined", () => {
    const r = rowAReporte(fila({ ubicacion_texto: null, ubicacion_lat: null }));
    expect(r.ultimaUbicacion).toBeUndefined();
    expect(r.reportante).toBeUndefined();
    expect(r.foto).toBeUndefined();
  });

  it("ida y vuelta (row -> dominio -> row) conserva campos clave", () => {
    const dominio = rowAReporte(fila({ nombre: "Luz", foto_url: "http://x/f.jpg" }));
    const back = reporteARow(dominio);
    expect(back.nombre).toBe("Luz");
    expect(back.foto_url).toBe("http://x/f.jpg");
  });
});
