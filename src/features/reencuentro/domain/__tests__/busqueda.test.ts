import { normalizar, coincideBusqueda, aplicarFiltros } from "../busqueda";
import { ReportePersona } from "../types";

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

describe("normalizar", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizar("María Gómez")).toBe("maria gomez");
    expect(normalizar("QUIBDÓ")).toBe("quibdo");
  });
});

describe("coincideBusqueda", () => {
  it("encuentra por nombre tolerando acentos y mayúsculas", () => {
    const r = reporte({ nombre: "María Fernanda" });
    expect(coincideBusqueda(r, "maria")).toBe(true);
    expect(coincideBusqueda(r, "MARÍA")).toBe(true);
    expect(coincideBusqueda(r, "pedro")).toBe(false);
  });

  it("busca también en ubicación y señas", () => {
    const r = reporte({
      ultimaUbicacion: { texto: "Quibdó, Chocó" },
      senasParticulares: "cicatriz en la frente",
    });
    expect(coincideBusqueda(r, "choco")).toBe(true);
    expect(coincideBusqueda(r, "cicatriz")).toBe(true);
  });

  it("texto vacío coincide con todo", () => {
    expect(coincideBusqueda(reporte(), "   ")).toBe(true);
  });
});

describe("aplicarFiltros", () => {
  const lista: ReportePersona[] = [
    reporte({ id: "a", tipo: "BUSCADA", nombre: "Ana", foto: { urlRemota: "x", comprimida: true } }),
    reporte({ id: "b", tipo: "ENCONTRADA", nombre: "Beatriz" }),
    reporte({ id: "c", tipo: "BUSCADA", nombre: "Carlos" }),
  ];

  it("filtra por tipo", () => {
    expect(aplicarFiltros(lista, { tipo: "BUSCADA" }).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("filtra por presencia de foto", () => {
    expect(aplicarFiltros(lista, { soloConFoto: true }).map((r) => r.id)).toEqual(["a"]);
  });

  it("filtra por texto", () => {
    expect(aplicarFiltros(lista, { texto: "bea" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("combina filtros (tipo + texto)", () => {
    expect(aplicarFiltros(lista, { tipo: "BUSCADA", texto: "carlos" }).map((r) => r.id)).toEqual(["c"]);
  });
});
