import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PanelSolicitudes } from "../PanelSolicitudes";
import { SolicitudCoordinador } from "../../domain";

function solicitud(over: Partial<SolicitudCoordinador> = {}): SolicitudCoordinador {
  return {
    id: "s1",
    userId: "u1",
    nombreCompleto: "María Mosquera",
    email: "maria@albergue.org",
    telefono: "3001234567",
    zona: "Bahía Solano",
    organizacion: "Albergue San José",
    estado: "PENDIENTE",
    creadoEn: "2026-08-13T00:00:00.000Z",
    ...over,
  };
}

describe("PanelSolicitudes", () => {
  it("no renderiza nada si no hay solicitudes", () => {
    const { toJSON } = render(
      <PanelSolicitudes solicitudes={[]} onAprobar={jest.fn()} onRechazar={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it("lista las solicitudes con sus datos", () => {
    render(
      <PanelSolicitudes solicitudes={[solicitud()]} onAprobar={jest.fn()} onRechazar={jest.fn()} />
    );
    expect(screen.getByText("María Mosquera")).toBeTruthy();
    expect(screen.getByText(/Bahía Solano/)).toBeTruthy();
    expect(screen.getByTestId("solicitud-s1")).toBeTruthy();
  });

  it("Aprobar y Rechazar llaman a sus callbacks con el id", () => {
    const onAprobar = jest.fn();
    const onRechazar = jest.fn();
    render(
      <PanelSolicitudes solicitudes={[solicitud()]} onAprobar={onAprobar} onRechazar={onRechazar} />
    );

    fireEvent.press(screen.getByTestId("aprobar-s1"));
    fireEvent.press(screen.getByTestId("rechazar-s1"));

    expect(onAprobar).toHaveBeenCalledWith("s1");
    expect(onRechazar).toHaveBeenCalledWith("s1");
  });
});
