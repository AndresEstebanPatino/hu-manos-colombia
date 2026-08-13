import {
  contarCamposIdentificatorios,
  cumpleIdentificabilidadMinima,
  derivarEsMenor,
} from "../validation";
import { CrearReporteInput } from "../types";

function input(over: Partial<CrearReporteInput> = {}): CrearReporteInput {
  return { tipo: "ENCONTRADA", creadoPorRol: "SOCORRISTA", creadoPorId: "s1", ...over };
}

describe("validación de captura", () => {
  it("cuenta los campos identificatorios presentes", () => {
    expect(contarCamposIdentificatorios(input())).toBe(0);
    expect(contarCamposIdentificatorios(input({ nombre: "Ana", edadAprox: 30 }))).toBe(2);
    expect(contarCamposIdentificatorios(input({ nombre: "   " }))).toBe(0);
  });

  it("exige al menos 2 campos para identificabilidad mínima", () => {
    expect(cumpleIdentificabilidadMinima(input({ nombre: "Ana" }))).toBe(false);
    expect(
      cumpleIdentificabilidadMinima(input({ nombre: "Ana", ultimaUbicacion: { texto: "Quibdó" } }))
    ).toBe(true);
  });

  it("deriva esMenor de la edad", () => {
    expect(derivarEsMenor(10)).toBe(true);
    expect(derivarEsMenor(18)).toBe(false);
    expect(derivarEsMenor(undefined)).toBe(false);
  });
});
