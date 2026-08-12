import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { FormularioCaptura } from "../FormularioCaptura";

function onCrearOk(advertencias: string[] = []) {
  return jest.fn().mockResolvedValue({
    reporte: { id: "x" },
    advertencias,
  });
}

describe("FormularioCaptura", () => {
  it("captura una BUSCADA y llama onCrear con el input mapeado", async () => {
    const onCrear = onCrearOk();
    render(<FormularioCaptura creadoPorId="u1" onCrear={onCrear} />);

    fireEvent.changeText(screen.getByPlaceholderText("Nombre (o apodo)"), "Ana");
    fireEvent.changeText(screen.getByPlaceholderText("Edad aproximada"), "30");
    fireEvent.press(screen.getByText("Reportar"));

    await waitFor(() => expect(onCrear).toHaveBeenCalledTimes(1));
    const input = onCrear.mock.calls[0][0];
    expect(input.tipo).toBe("BUSCADA");
    expect(input.creadoPorRol).toBe("FAMILIAR");
    expect(input.creadoPorId).toBe("u1");
    expect(input.nombre).toBe("Ana");
    expect(input.edadAprox).toBe(30);
  });

  it("muestra las advertencias devueltas por el caso de uso", async () => {
    const onCrear = onCrearOk(["Agrega al menos un dato más para mejorar la búsqueda."]);
    render(<FormularioCaptura creadoPorId="u1" onCrear={onCrear} />);

    fireEvent.changeText(screen.getByPlaceholderText("Nombre (o apodo)"), "Ana");
    fireEvent.press(screen.getByText("Reportar"));

    await waitFor(() => expect(screen.getByText(/al menos un dato/i)).toBeTruthy());
  });

  it("al elegir ENCONTRADA oculta el campo de contacto del reportante", () => {
    render(<FormularioCaptura creadoPorId="u1" onCrear={onCrearOk()} />);

    // Por defecto BUSCADA -> el contacto es visible.
    expect(screen.queryByPlaceholderText("Tu WhatsApp para avisarte")).not.toBeNull();

    fireEvent.press(screen.getByTestId("toggle-encontrada"));
    expect(screen.queryByPlaceholderText("Tu WhatsApp para avisarte")).toBeNull();
  });
});
