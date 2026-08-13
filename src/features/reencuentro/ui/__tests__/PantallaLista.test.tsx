import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PantallaLista } from "../PantallaLista";
import { ReportePersona, ReportsQueryPort } from "../../domain";

function reporte(over: Partial<ReportePersona> = {}): ReportePersona {
  return {
    id: "r1",
    tipo: "BUSCADA",
    estado: "ACTIVO",
    syncState: "SINCRONIZADO",
    esMenor: false,
    creadoPorRol: "FAMILIAR",
    creadoPorId: "u1",
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    intentosSync: 0,
    ...over,
  };
}

function fakeQuery(reportes: ReportePersona[]): ReportsQueryPort {
  return { listarBuscadasPublicas: jest.fn().mockResolvedValue(reportes) };
}

describe("PantallaLista", () => {
  it("carga y lista las personas buscadas", async () => {
    render(<PantallaLista query={fakeQuery([reporte({ id: "a", nombre: "Ana" })])} abrirUrl={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Ana")).toBeTruthy());
  });

  it("filtra por texto tolerando acentos", async () => {
    render(
      <PantallaLista
        query={fakeQuery([reporte({ id: "a", nombre: "Ana" }), reporte({ id: "b", nombre: "Beatriz" })])}
        abrirUrl={jest.fn()}
      />
    );
    await waitFor(() => expect(screen.getByText("Ana")).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText(/Buscar por nombre/), "bea");

    expect(screen.queryByText("Ana")).toBeNull();
    expect(screen.getByText("Beatriz")).toBeTruthy();
  });

  it("compartir abre una URL de WhatsApp con los datos del reporte", async () => {
    const abrirUrl = jest.fn();
    render(<PantallaLista query={fakeQuery([reporte({ id: "a", nombre: "Ana" })])} abrirUrl={abrirUrl} />);
    await waitFor(() => expect(screen.getByText("Ana")).toBeTruthy());

    fireEvent.press(screen.getByText("Compartir"));

    expect(abrirUrl).toHaveBeenCalledTimes(1);
    expect(abrirUrl.mock.calls[0][0]).toContain("wa.me");
  });

  it("muestra estado vacío cuando no hay coincidencias", async () => {
    render(<PantallaLista query={fakeQuery([])} abrirUrl={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/No hay personas/i)).toBeTruthy());
  });
});
