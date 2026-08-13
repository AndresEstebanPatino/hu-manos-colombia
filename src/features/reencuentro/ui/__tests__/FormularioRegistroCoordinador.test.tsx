import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { FormularioRegistroCoordinador } from "../FormularioRegistroCoordinador";

function llenarValido() {
  fireEvent.changeText(screen.getByTestId("reg-nombre"), "María Mosquera");
  fireEvent.changeText(screen.getByTestId("reg-email"), "maria@albergue.org");
  fireEvent.changeText(screen.getByTestId("reg-password"), "clave-segura-1");
  fireEvent.changeText(screen.getByTestId("reg-telefono"), "3001234567");
  fireEvent.changeText(screen.getByTestId("reg-zona"), "Bahía Solano");
}

describe("FormularioRegistroCoordinador", () => {
  it("muestra errores de validación y NO envía con datos vacíos", () => {
    const onSubmit = jest.fn();
    render(<FormularioRegistroCoordinador onSubmit={onSubmit} />);

    fireEvent.press(screen.getByTestId("reg-enviar"));

    expect(screen.getByTestId("reg-email-error")).toBeTruthy();
    expect(screen.getByTestId("reg-password-error")).toBeTruthy();
    expect(screen.getByTestId("reg-zona-error")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envía el input y muestra confirmación cuando los datos son válidos", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<FormularioRegistroCoordinador onSubmit={onSubmit} />);

    llenarValido();
    fireEvent.press(screen.getByTestId("reg-enviar"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      nombreCompleto: "María Mosquera",
      email: "maria@albergue.org",
      zona: "Bahía Solano",
    });
    await waitFor(() => expect(screen.getByText(/Solicitud enviada/)).toBeTruthy());
  });

  it("muestra el mensaje de error si el registro falla", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("Ese correo ya está registrado"));
    render(<FormularioRegistroCoordinador onSubmit={onSubmit} />);

    llenarValido();
    fireEvent.press(screen.getByTestId("reg-enviar"));

    await waitFor(() => expect(screen.getByText("Ese correo ya está registrado")).toBeTruthy());
  });
});
