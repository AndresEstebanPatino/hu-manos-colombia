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

  it("no muestra 'Usar mi ubicación' si no se inyecta locationProvider", () => {
    render(<FormularioCaptura creadoPorId="u1" onCrear={onCrearOk()} />);
    expect(screen.queryByTestId("usar-ubicacion")).toBeNull();
  });

  it("'Usar mi ubicación' autocompleta con el texto geocodificado", async () => {
    const locationProvider = {
      obtenerActual: jest.fn().mockResolvedValue({ lat: 5.69, lng: -76.65 }),
    };
    const geocoder = { describir: jest.fn().mockResolvedValue("Quibdó, Chocó") };
    render(
      <FormularioCaptura
        creadoPorId="u1"
        onCrear={onCrearOk()}
        locationProvider={locationProvider}
        geocoder={geocoder}
      />
    );

    fireEvent.press(screen.getByTestId("usar-ubicacion"));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Última ubicación conocida").props.value).toBe("Quibdó, Chocó")
    );
    expect(locationProvider.obtenerActual).toHaveBeenCalled();
  });

  it("cae al fallback 'lat, lng' cuando no hay geocoder", async () => {
    const locationProvider = {
      obtenerActual: jest.fn().mockResolvedValue({ lat: 5.69123, lng: -76.65 }),
    };
    render(
      <FormularioCaptura creadoPorId="u1" onCrear={onCrearOk()} locationProvider={locationProvider} />
    );

    fireEvent.press(screen.getByTestId("usar-ubicacion"));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Última ubicación conocida").props.value).toBe(
        "5.69123, -76.65000"
      )
    );
  });
});
