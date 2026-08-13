import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TableroCoordinador } from "../TableroCoordinador";
import { Coincidencia } from "../../domain";

function c(over: Partial<Coincidencia>): Coincidencia {
  return {
    id: "c1",
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

describe("TableroCoordinador", () => {
  it("muestra las coincidencias con su etiqueta de banda", () => {
    render(
      <TableroCoordinador
        coincidencias={[c({ id: "c1", banda: "REVISION_PRIORITARIA" })]}
        onConfirmar={jest.fn()}
        onRechazar={jest.fn()}
      />
    );
    expect(screen.getByText("Revisión prioritaria")).toBeTruthy();
  });

  it("confirmar y rechazar invocan los handlers con el id", () => {
    const onConfirmar = jest.fn();
    const onRechazar = jest.fn();
    render(
      <TableroCoordinador
        coincidencias={[c({ id: "c9" })]}
        onConfirmar={onConfirmar}
        onRechazar={onRechazar}
      />
    );
    fireEvent.press(screen.getByText("Confirmar"));
    fireEvent.press(screen.getByText("Rechazar"));
    expect(onConfirmar).toHaveBeenCalledWith("c9");
    expect(onRechazar).toHaveBeenCalledWith("c9");
  });

  it("señala el blindaje de fallecidos (segunda validación + no notifica)", () => {
    render(
      <TableroCoordinador
        coincidencias={[c({ involucraFallecido: true })]}
        onConfirmar={jest.fn()}
        onRechazar={jest.fn()}
      />
    );
    expect(screen.getByText(/segunda validación/i)).toBeTruthy();
    expect(screen.getByText(/no se notifica por la app/i)).toBeTruthy();
  });

  it("muestra estado vacío cuando no hay coincidencias", () => {
    render(<TableroCoordinador coincidencias={[]} onConfirmar={jest.fn()} onRechazar={jest.fn()} />);
    expect(screen.getByText(/No hay coincidencias/i)).toBeTruthy();
  });
});
