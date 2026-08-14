import {
  puntajeSimilitud,
  sonPosiblesDuplicados,
  candidatosDuplicados,
  puedeMarcarDuplicado,
} from "../dedup";
import { ReportePersona } from "../types";

function rep(over: Partial<ReportePersona> = {}): ReportePersona {
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

describe("puntajeSimilitud", () => {
  it("alto para nombres iguales (tolerando acentos/caso) y edad cercana", () => {
    const a = rep({ nombre: "José Pérez", edadAprox: 30, ultimaUbicacion: { texto: "Quibdó" } });
    const b = rep({ id: "r2", nombre: "jose perez", edadAprox: 31, ultimaUbicacion: { texto: "Quibdo" } });
    expect(puntajeSimilitud(a, b)).toBeGreaterThan(0.9);
  });

  it("bajo para personas distintas", () => {
    const a = rep({ nombre: "Ana Torres", edadAprox: 8 });
    const b = rep({ id: "r2", nombre: "Carlos Rentería", edadAprox: 60 });
    expect(puntajeSimilitud(a, b)).toBeLessThan(0.3);
  });
});

describe("sonPosiblesDuplicados", () => {
  const a = rep({ nombre: "José Pérez", edadAprox: 30 });

  it("true entre reportes muy similares del mismo tipo", () => {
    expect(sonPosiblesDuplicados(a, rep({ id: "r2", nombre: "Jose Perez", edadAprox: 30 }))).toBe(true);
  });

  it("false si es el mismo id o distinto tipo", () => {
    expect(sonPosiblesDuplicados(a, a)).toBe(false);
    expect(sonPosiblesDuplicados(a, rep({ id: "r2", nombre: "Jose Perez", tipo: "ENCONTRADA" }))).toBe(false);
  });
});

describe("candidatosDuplicados", () => {
  it("filtra y ordena por similitud descendente", () => {
    const base = rep({ id: "base", nombre: "José Pérez", edadAprox: 30, ultimaUbicacion: { texto: "Quibdó" } });
    const casi = rep({ id: "casi", nombre: "Jose Perez", edadAprox: 30, ultimaUbicacion: { texto: "Quibdo" } });
    const algo = rep({ id: "algo", nombre: "Jose Gomez", edadAprox: 30 });
    const nada = rep({ id: "nada", nombre: "Marta Díaz", edadAprox: 70 });

    const res = candidatosDuplicados(base, [nada, algo, casi]);
    expect(res.map((r) => r.id)).toEqual(["casi"]);
  });
});

describe("puedeMarcarDuplicado", () => {
  const maestro = rep({ id: "maestro" });

  it("ok si coordinador, mismo tipo, distinto id, estado ACTIVO", () => {
    expect(puedeMarcarDuplicado(rep({ id: "dup" }), maestro, ["COORDINADOR"]).ok).toBe(true);
  });

  it("no-ok si no es coordinador", () => {
    expect(puedeMarcarDuplicado(rep({ id: "dup" }), maestro, []).ok).toBe(false);
  });

  it("no-ok si es el mismo reporte o distinto tipo", () => {
    expect(puedeMarcarDuplicado(maestro, maestro, ["COORDINADOR"]).ok).toBe(false);
    expect(
      puedeMarcarDuplicado(rep({ id: "dup", tipo: "ENCONTRADA" }), maestro, ["COORDINADOR"]).ok
    ).toBe(false);
  });

  it("no-ok si el estado no permite pasar a DUPLICADO (p. ej. RESUELTO)", () => {
    expect(
      puedeMarcarDuplicado(rep({ id: "dup", estado: "RESUELTO" }), maestro, ["COORDINADOR"]).ok
    ).toBe(false);
  });
});
