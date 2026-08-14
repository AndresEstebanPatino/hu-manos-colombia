import { reencuentroPersonaMarcadores } from "../mapa-marcadores";
import { ReportePersona } from "../../domain";

function reporte(over: Partial<ReportePersona> = {}): ReportePersona {
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

describe("reencuentroPersonaMarcadores", () => {
  it("mapea reportes con coordenadas válidas", () => {
    const m = reencuentroPersonaMarcadores([
      reporte({ id: "a", nombre: "Ana", ultimaUbicacion: { texto: "Quibdó", lat: 5.69, lng: -76.65 } }),
    ]);
    expect(m).toEqual([
      { id: "a", lat: 5.69, lng: -76.65, nombre: "Ana", tipo: "BUSCADA", ubicacion: "Quibdó" },
    ]);
  });

  it("excluye reportes sin coordenadas (solo texto)", () => {
    const m = reencuentroPersonaMarcadores([
      reporte({ id: "b", ultimaUbicacion: { texto: "Pereira" } }),
      reporte({ id: "c" }),
    ]);
    expect(m).toEqual([]);
  });

  it("excluye coordenadas fuera de rango", () => {
    const m = reencuentroPersonaMarcadores([
      reporte({ id: "d", ultimaUbicacion: { lat: 200, lng: 0 } }),
    ]);
    expect(m).toEqual([]);
  });

  it("usa 'Sin nombre' cuando falta el nombre y conserva el tipo", () => {
    const m = reencuentroPersonaMarcadores([
      reporte({ id: "e", nombre: undefined, tipo: "ENCONTRADA", ultimaUbicacion: { lat: 4.8, lng: -75.7 } }),
    ]);
    expect(m[0]).toMatchObject({ id: "e", nombre: "Sin nombre", tipo: "ENCONTRADA" });
  });
});
