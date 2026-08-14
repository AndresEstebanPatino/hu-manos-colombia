import { mensajeDifusion, urlCompartirWhatsApp, urlWhatsAppContacto } from "../compartir";
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
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    intentosSync: 0,
    ...over,
  };
}

describe("mensajeDifusion", () => {
  it("incluye los datos presentes del reporte", () => {
    const msg = mensajeDifusion(
      reporte({ nombre: "Ana Gómez", edadAprox: 30, ultimaUbicacion: { texto: "Quibdó" } }),
      "https://app/x"
    );
    expect(msg).toContain("Ana Gómez");
    expect(msg).toContain("30");
    expect(msg).toContain("Quibdó");
    expect(msg).toContain("https://app/x");
  });

  it("omite las líneas de campos ausentes", () => {
    const msg = mensajeDifusion(reporte({ nombre: "Ana" }));
    expect(msg).toContain("Ana");
    expect(msg).not.toContain("Edad aprox");
    expect(msg).not.toContain("Última ubicación");
  });
});

describe("urlCompartirWhatsApp", () => {
  it("construye una URL wa.me con el texto codificado", () => {
    const url = urlCompartirWhatsApp("hola mundo & amigos");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).toContain("hola%20mundo");
    expect(url).toContain("%26"); // & codificado
  });
});

describe("urlWhatsAppContacto", () => {
  it("dirige la URL a un número (solo dígitos) con el texto codificado", () => {
    const url = urlWhatsAppContacto("+57 300 123 4567", "hola & saludos");
    expect(url.startsWith("https://wa.me/573001234567?text=")).toBe(true);
    expect(url).toContain("%26");
  });
});
