import { rowACoincidencia, CoincidenciaRow } from "../coincidencia-row";

function row(over: Partial<CoincidenciaRow> = {}): CoincidenciaRow {
  return {
    id: "c1",
    reporte_buscada_id: "b",
    reporte_encontrada_id: "e",
    estado: "SUGERIDA",
    banda: "POSIBLE",
    evidencia: [{ campo: "nombre", detalle: "x ~ y" }],
    involucra_fallecido: false,
    revisor_id: null,
    segundo_validador_id: null,
    motivo_rechazo: null,
    creado_en: "2026-08-12T00:00:00.000Z",
    actualizado_en: "2026-08-12T00:00:00.000Z",
    ...over,
  };
}

describe("rowACoincidencia", () => {
  it("mapea snake_case de la fila a camelCase de dominio", () => {
    const c = rowACoincidencia(row({ involucra_fallecido: true, banda: "REVISION_PRIORITARIA" }));
    expect(c.reporteBuscadaId).toBe("b");
    expect(c.reporteEncontradaId).toBe("e");
    expect(c.involucraFallecido).toBe(true);
    expect(c.banda).toBe("REVISION_PRIORITARIA");
    expect(c.evidencia[0].campo).toBe("nombre");
  });

  it("convierte null a undefined y evidencia no-array a []", () => {
    const c = rowACoincidencia(row({ revisor_id: null, evidencia: null }));
    expect(c.revisorId).toBeUndefined();
    expect(c.evidencia).toEqual([]);
  });
});
