import { esCoordinador, tieneRolPrivilegiado } from "../roles";

describe("roles", () => {
  it("esCoordinador detecta el rol COORDINADOR", () => {
    expect(esCoordinador(["COORDINADOR"])).toBe(true);
    expect(esCoordinador(["HOSPITAL", "ALBERGUE"])).toBe(false);
    expect(esCoordinador([])).toBe(false);
  });

  it("tieneRolPrivilegiado es true con cualquier rol", () => {
    expect(tieneRolPrivilegiado(["ALBERGUE"])).toBe(true);
    expect(tieneRolPrivilegiado([])).toBe(false);
  });
});
