import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PanelNotificaciones } from "../PanelNotificaciones";
import { NotificacionPendiente } from "../../domain";

const item: NotificacionPendiente = {
  coincidenciaId: "c1",
  nombre: "Ana Gómez",
  contacto: "+57 300 123 4567",
};

describe("PanelNotificaciones", () => {
  it("no renderiza nada si no hay pendientes", () => {
    const { toJSON } = render(<PanelNotificaciones pendientes={[]} onNotificar={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it("lista los pendientes y dispara onNotificar", () => {
    const onNotificar = jest.fn();
    render(<PanelNotificaciones pendientes={[item]} onNotificar={onNotificar} />);

    expect(screen.getByText("Ana Gómez")).toBeTruthy();
    expect(screen.getByText(/300 123 4567/)).toBeTruthy();

    fireEvent.press(screen.getByTestId("notificar-c1"));
    expect(onNotificar).toHaveBeenCalledWith(item);
  });

  it("deshabilita el botón si no hay contacto", () => {
    render(
      <PanelNotificaciones
        pendientes={[{ coincidenciaId: "c2", nombre: "Sin contacto" }]}
        onNotificar={jest.fn()}
      />
    );
    expect(screen.getByText(/Sin contacto de WhatsApp/)).toBeTruthy();
    expect(screen.getByTestId("notificar-c2").props.accessibilityState?.disabled).toBe(true);
  });
});
