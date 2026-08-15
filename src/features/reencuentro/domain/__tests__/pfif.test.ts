import { personaAPfif, reportesAPfif } from "../pfif";
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
    creadoEn: "2026-08-13T10:00:00.000Z",
    actualizadoEn: "2026-08-13T10:00:00.000Z",
    intentosSync: 0,
    ...over,
  };
}

describe("personaAPfif", () => {
  it("incluye id con dominio, nombre, sexo mapeado, edad y ubicación", () => {
    const xml = personaAPfif(
      rep({ id: "abc", nombre: "José Pérez", sexo: "M", edadAprox: 30, ultimaUbicacion: { texto: "Quibdó" } })
    );
    expect(xml).toContain("<pfif:person_record_id>humanocolombia.app/abc</pfif:person_record_id>");
    expect(xml).toContain("<pfif:full_name>José Pérez</pfif:full_name>");
    expect(xml).toContain("<pfif:sex>male</pfif:sex>");
    expect(xml).toContain("<pfif:age>30</pfif:age>");
    expect(xml).toContain("<pfif:home_city>Quibdó</pfif:home_city>");
  });

  it("mapea F->female y omite sexo desconocido", () => {
    expect(personaAPfif(rep({ sexo: "F" }))).toContain("<pfif:sex>female</pfif:sex>");
    expect(personaAPfif(rep({ sexo: "DESCONOCIDO" }))).not.toContain("<pfif:sex>");
  });

  it("escapa caracteres especiales de XML", () => {
    const xml = personaAPfif(rep({ nombre: "Ana & <Pérez>" }));
    expect(xml).toContain("Ana &amp; &lt;Pérez&gt;");
    expect(xml).not.toContain("Ana & <Pérez>");
  });

  it("combina descripción física, ropa y señas en <pfif:other>", () => {
    const xml = personaAPfif(rep({ descripcionFisica: "Alto", ropa: "Camisa azul", senasParticulares: "Cicatriz" }));
    expect(xml).toContain("<pfif:other>description: Alto. Camisa azul. Cicatriz</pfif:other>");
  });
});

describe("reportesAPfif", () => {
  it("genera un documento PFIF 1.4 con encabezado y namespace", () => {
    const doc = reportesAPfif([rep({ id: "a", nombre: "Ana" })]);
    expect(doc.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(doc).toContain('xmlns:pfif="http://zesty.ca/pfif/1.4"');
    expect(doc).toContain("humanocolombia.app/a");
  });

  it("incluye solo reportes BUSCADA (omite ENCONTRADA)", () => {
    const doc = reportesAPfif([
      rep({ id: "buscada", nombre: "Buscada" }),
      rep({ id: "encontrada", nombre: "Encontrada", tipo: "ENCONTRADA" }),
    ]);
    expect(doc).toContain("humanocolombia.app/buscada");
    expect(doc).not.toContain("humanocolombia.app/encontrada");
  });
});
