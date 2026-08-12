import { reporteARow } from "../reporte-row";
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
