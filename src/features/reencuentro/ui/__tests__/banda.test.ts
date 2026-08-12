import { etiquetaBanda, ordenarPorBanda } from "../banda";
import { Coincidencia } from "../../domain";

function c(over: Partial<Coincidencia>): Coincidencia {
  return {
    id: "c",
    reporteBuscadaId: "b",
    reporteEncontradaId: "e",
    estado: "SUGERIDA",
    banda: "POSIBLE",
    evidencia: [],
    involucraFallecido: false,
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    ...over,
  };
}

describe("banda", () => {
  it("usa etiquetas neutras (sin falsa certeza)", () => {
    expect(etiquetaBanda("REVISION_PRIORITARIA")).toBe("Revisión prioritaria");
    expect(etiquetaBanda("POSIBLE")).toBe("Posible coincidencia");
    expect(etiquetaBanda("BAJA")).toBe("Baja prioridad");
  });

  it("ordena prioritaria > posible > baja", () => {
    const orden = ordenarPorBanda([
      c({ id: "1", banda: "BAJA" }),
      c({ id: "2", banda: "REVISION_PRIORITARIA" }),
      c({ id: "3", banda: "POSIBLE" }),
    ]).map((x) => x.id);
    expect(orden).toEqual(["2", "3", "1"]);
  });
});
