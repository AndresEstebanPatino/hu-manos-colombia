import {
  CrearReporteInput,
  ReportePersona,
  ReportRepository,
  cumpleIdentificabilidadMinima,
  derivarEsMenor,
} from "../domain";

export interface CrearReporteDeps {
  repo: ReportRepository;
  /** Genera un UUID (id de cliente / clave de idempotencia). Inyectado para testeo. */
  generarId: () => string;
  /** Reloj: devuelve una fecha ISO 8601. Inyectado para testeo. */
  ahora: () => string;
}

export interface CrearReporteResultado {
  reporte: ReportePersona;
  /** Advertencias no bloqueantes (la captura NUNCA se bloquea). */
  advertencias: string[];
}

/**
 * Caso de uso: capturar un reporte. Offline-first — SIEMPRE crea y persiste,
 * aunque falten datos (las carencias son advertencias, no bloqueos).
 * El reporte nace CAPTURADO / PENDIENTE de sync; el motor de sync lo sube después.
 */
export async function crearReporte(
  input: CrearReporteInput,
  deps: CrearReporteDeps
): Promise<CrearReporteResultado> {
  const advertencias: string[] = [];

  if (!cumpleIdentificabilidadMinima(input)) {
    advertencias.push("Agrega al menos un dato más para mejorar la búsqueda.");
  }
  if (input.tipo === "BUSCADA" && !input.reportante?.contactoWhatsapp) {
    advertencias.push("¿Cómo te avisamos si aparece? Agrega un WhatsApp o teléfono.");
  }

  const ts = deps.ahora();
  const reporte: ReportePersona = {
    id: deps.generarId(),
    tipo: input.tipo,
    estado: "CAPTURADO",
    syncState: "PENDIENTE",
    nombre: input.nombre,
    edadAprox: input.edadAprox,
    esMenor: derivarEsMenor(input.edadAprox),
    sexo: input.sexo,
    descripcionFisica: input.descripcionFisica,
    ropa: input.ropa,
    senasParticulares: input.senasParticulares,
    ultimaUbicacion: input.ultimaUbicacion,
    foto: input.foto,
    estadoVital: input.estadoVital,
    reportante: input.reportante,
    creadoPorRol: input.creadoPorRol,
    creadoPorId: input.creadoPorId,
    creadoEn: ts,
    actualizadoEn: ts,
    intentosSync: 0,
  };

  await deps.repo.create(reporte);
  return { reporte, advertencias };
}
