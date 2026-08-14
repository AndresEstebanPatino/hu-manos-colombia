import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PanelDuplicados } from "../PanelDuplicados";
import { GrupoDuplicados, ReportePersona } from "../../domain";

function rep(over: Partial<ReportePersona> = {}): ReportePersona {
  return {
    id: "r1",
    tipo: "BUSCADA",
    estado: "ACTIVO",
    syncState: "SINCRONIZADO",
    esMenor: false,
    creadoPorRol: "FAMILIAR",
    creadoPorId: "u1",
    creadoEn: "2026-08-13T00:00:00.000Z",
    actualizadoEn: "2026-08-13T00:00:00.000Z",
    intentosSync: 0,
    ...over,
  };
}

const grupo: GrupoDuplicados = {
  maestro: rep({ id: "maestro", nombre: "José Pérez" }),
  duplicados: [rep({ id: "dup1", nombre: "Jose Perez", edadAprox: 30 })],
};

describe("PanelDuplicados", () => {
  it("no renderiza nada si no hay grupos", () => {
    const { toJSON } = render(<PanelDuplicados grupos={[]} onMarcarDuplicado={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it("muestra el maestro y los duplicados", () => {
    render(<PanelDuplicados grupos={[grupo]} onMarcarDuplicado={jest.fn()} />);
    expect(screen.getByText(/Se conserva: José Pérez/)).toBeTruthy();
    expect(screen.getByText("Jose Perez")).toBeTruthy();
  });

  it("marcar duplicado llama al callback con (duplicadoId, maestroId)", () => {
    const onMarcar = jest.fn();
    render(<PanelDuplicados grupos={[grupo]} onMarcarDuplicado={onMarcar} />);
    fireEvent.press(screen.getByTestId("marcar-dup-dup1"));
    expect(onMarcar).toHaveBeenCalledWith("dup1", "maestro");
  });
});
