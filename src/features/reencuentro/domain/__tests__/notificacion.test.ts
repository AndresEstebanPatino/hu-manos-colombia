import { planNotificacionFamilia, mensajeNotificacionFamilia } from "../notificacion";
import { Coincidencia, ReportePersona } from "../types";

function coincidencia(over: Partial<Coincidencia> = {}): Coincidencia {
  return {
    id: "c1",
    reporteBuscadaId: "b1",
    reporteEncontradaId: "e1",
    estado: "PENDIENTE_NOTIFICACION",
    banda: "POSIBLE",
    evidencia: [],
    involucraFallecido: false,
    creadoEn: "2026-08-13T00:00:00.000Z",
    actualizadoEn: "2026-08-13T00:00:00.000Z",
    ...over,
  };
}

function buscada(over: Partial<ReportePersona> = {}): ReportePersona {
  return {
    id: "b1",
    tipo: "BUSCADA",
    estado: "ACTIVO",
    syncState: "SINCRONIZADO",
    esMenor: false,
    creadoPorRol: "FAMILIAR",
    creadoPorId: "fam1",
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    intentosSync: 0,
    nombre: "Ana Gómez",
    reportante: { contactoWhatsapp: "+57 300 123 4567" },
    ...over,
  };
}

describe("mensajeNotificacionFamilia", () => {
  it("incluye el nombre y NO afirma un hallazgo", () => {
    const m = mensajeNotificacionFamilia("Ana Gómez");
    expect(m).toContain("Ana Gómez");
    expect(m).toContain("posible coincidencia");
    expect(m.toLowerCase()).not.toContain("encontrada");
    expect(m.toLowerCase()).not.toContain("encontramos");
  });

  it("usa un texto genérico si no hay nombre", () => {
    expect(mensajeNotificacionFamilia()).toContain("la persona que reportaste");
  });
});

describe("planNotificacionFamilia", () => {
  it("arma el plan: PENDIENTE_NOTIFICACION, sin fallecido, con contacto", () => {
    const plan = planNotificacionFamilia(coincidencia(), buscada());
    expect(plan).not.toBeNull();
    expect(plan!.contactoWhatsapp).toBe("+57 300 123 4567");
    expect(plan!.mensaje).toContain("Ana Gómez");
  });

  it("null si la coincidencia no está en PENDIENTE_NOTIFICACION", () => {
    expect(planNotificacionFamilia(coincidencia({ estado: "CONFIRMADA" }), buscada())).toBeNull();
    expect(planNotificacionFamilia(coincidencia({ estado: "NOTIFICADA" }), buscada())).toBeNull();
  });

  it("null si involucra fallecido (protocolo oficial, no por la app)", () => {
    expect(planNotificacionFamilia(coincidencia({ involucraFallecido: true }), buscada())).toBeNull();
  });

  it("null si no hay contacto de WhatsApp del reportante", () => {
    expect(planNotificacionFamilia(coincidencia(), buscada({ reportante: undefined }))).toBeNull();
    expect(
      planNotificacionFamilia(coincidencia(), buscada({ reportante: { contactoWhatsapp: "  " } }))
    ).toBeNull();
  });
});
