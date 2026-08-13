import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PantallaCoordinacion } from "../PantallaCoordinacion";
import { Coincidencia, MatchBoardService } from "../../domain";

function coincidencia(over: Partial<Coincidencia> = {}): Coincidencia {
  return {
    id: "c1",
    reporteBuscadaId: "b",
    reporteEncontradaId: "e",
    estado: "SUGERIDA",
    banda: "REVISION_PRIORITARIA",
    evidencia: [],
    involucraFallecido: false,
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    ...over,
  };
}

function fakeService(coincidencias: Coincidencia[]): MatchBoardService {
  return {
    listar: jest.fn().mockResolvedValue(coincidencias),
    generar: jest.fn().mockResolvedValue(1),
    confirmar: jest.fn().mockResolvedValue(undefined),
    rechazar: jest.fn().mockResolvedValue(undefined),
  };
}

describe("PantallaCoordinacion", () => {
  it("carga y muestra las coincidencias", async () => {
    const service = fakeService([coincidencia({ banda: "REVISION_PRIORITARIA" })]);
    render(<PantallaCoordinacion service={service} />);
    await waitFor(() => expect(screen.getByText("Revisión prioritaria")).toBeTruthy());
    expect(service.listar).toHaveBeenCalled();
  });

  it("'Buscar coincidencias' dispara la RPC y recarga", async () => {
    const service = fakeService([]);
    render(<PantallaCoordinacion service={service} />);
    await waitFor(() => expect(service.listar).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText("Buscar coincidencias"));

    await waitFor(() => expect(service.generar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(service.listar).toHaveBeenCalledTimes(2));
  });

  it("confirmar aplica el cambio y recarga", async () => {
    const service = fakeService([coincidencia({ id: "c9" })]);
    render(<PantallaCoordinacion service={service} />);
    await waitFor(() => expect(screen.getByText("Confirmar")).toBeTruthy());

    fireEvent.press(screen.getByText("Confirmar"));

    await waitFor(() => expect(service.confirmar).toHaveBeenCalledWith("c9"));
    await waitFor(() => expect(service.listar).toHaveBeenCalledTimes(2));
  });
});
