import {
  puedeTransicionarReporte,
  puedeTransicionarCoincidencia,
  requiereDobleValidacion,
  puedeConfirmar,
  appPuedeNotificarFamiliar,
} from "../state-machines";
import { Coincidencia } from "../types";

function coincidenciaBase(over: Partial<Coincidencia> = {}): Coincidencia {
  return {
    id: "c1",
    reporteBuscadaId: "b1",
    reporteEncontradaId: "e1",
    estado: "EN_REVISION",
    banda: "POSIBLE",
    evidencia: [],
    involucraFallecido: false,
    creadoEn: "2026-08-12T00:00:00.000Z",
    actualizadoEn: "2026-08-12T00:00:00.000Z",
    ...over,
  };
}

describe("máquina de estados: reporte", () => {
  it("permite transiciones válidas del ciclo de vida", () => {
    expect(puedeTransicionarReporte("CAPTURADO", "PENDIENTE_SYNC")).toBe(true);
    expect(puedeTransicionarReporte("PENDIENTE_SYNC", "ACTIVO")).toBe(true);
    expect(puedeTransicionarReporte("ACTIVO", "RESUELTO")).toBe(true);
    expect(puedeTransicionarReporte("RESUELTO", "ARCHIVADO")).toBe(true);
  });

  it("rechaza transiciones inválidas", () => {
    expect(puedeTransicionarReporte("CAPTURADO", "RESUELTO")).toBe(false);
    expect(puedeTransicionarReporte("ARCHIVADO", "ACTIVO")).toBe(false);
  });
});

describe("máquina de estados: coincidencia (human-in-the-loop)", () => {
  it("sigue el flujo sugerida -> revision -> confirmada -> notificada", () => {
    expect(puedeTransicionarCoincidencia("SUGERIDA", "EN_REVISION")).toBe(true);
    expect(puedeTransicionarCoincidencia("EN_REVISION", "CONFIRMADA")).toBe(true);
    expect(puedeTransicionarCoincidencia("CONFIRMADA", "PENDIENTE_NOTIFICACION")).toBe(true);
    expect(puedeTransicionarCoincidencia("PENDIENTE_NOTIFICACION", "NOTIFICADA")).toBe(true);
  });

  it("no permite saltarse la revisión ni notificar sin confirmar", () => {
    expect(puedeTransicionarCoincidencia("SUGERIDA", "CONFIRMADA")).toBe(false);
    expect(puedeTransicionarCoincidencia("CONFIRMADA", "NOTIFICADA")).toBe(false);
  });
});

describe("regla no negociable: fallecidos", () => {
  it("marca que requiere doble validación", () => {
    expect(requiereDobleValidacion(coincidenciaBase({ involucraFallecido: true }))).toBe(true);
    expect(requiereDobleValidacion(coincidenciaBase({ involucraFallecido: false }))).toBe(false);
  });

  it("con vida: puede confirmar en revisión sin segundo validador", () => {
    expect(puedeConfirmar(coincidenciaBase()).ok).toBe(true);
  });

  it("fallecido: NO puede confirmar sin segundo validador", () => {
    const r = puedeConfirmar(coincidenciaBase({ involucraFallecido: true }));
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/segundo validador/i);
  });

  it("fallecido: el segundo validador debe ser distinto del revisor", () => {
    const r = puedeConfirmar(
      coincidenciaBase({ involucraFallecido: true, revisorId: "u1", segundoValidadorId: "u1" })
    );
    expect(r.ok).toBe(false);
  });

  it("fallecido: confirma con segundo validador distinto", () => {
    const r = puedeConfirmar(
      coincidenciaBase({ involucraFallecido: true, revisorId: "u1", segundoValidadorId: "u2" })
    );
    expect(r.ok).toBe(true);
  });

  it("la app NUNCA notifica automáticamente a la familia en casos de fallecido", () => {
    const vivo = coincidenciaBase({ estado: "PENDIENTE_NOTIFICACION", involucraFallecido: false });
    const fallecido = coincidenciaBase({ estado: "PENDIENTE_NOTIFICACION", involucraFallecido: true });
    expect(appPuedeNotificarFamiliar(vivo)).toBe(true);
    expect(appPuedeNotificarFamiliar(fallecido)).toBe(false);
  });
});
