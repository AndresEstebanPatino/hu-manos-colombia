// Modelo de dominio del módulo Reencuentro. Tipos puros, sin dependencias de plataforma.
// Fuente de verdad para front y back (contrato congelado tras la Ola 0).

/** Un reporte es de una persona buscada o encontrada, sobre el mismo esquema. */
export type TipoReporte = "BUSCADA" | "ENCONTRADA";

/** Estado vital (solo aplica a ENCONTRADA). */
export type EstadoVital = "CON_VIDA" | "FALLECIDA" | "DESCONOCIDO";

/** Estado de sincronización de la cola local. */
export type SyncState = "PENDIENTE" | "SINCRONIZANDO" | "SINCRONIZADO" | "ERROR";

/** Ciclo de vida del reporte en el dominio. */
export type EstadoReporte =
  | "CAPTURADO"
  | "PENDIENTE_SYNC"
  | "ACTIVO"
  | "DUPLICADO"
  | "RESUELTO"
  | "ARCHIVADO";

/** Roles del sistema (RBAC). */
export type RolUsuario =
  | "FAMILIAR"
  | "SOCORRISTA"
  | "HOSPITAL"
  | "ALBERGUE"
  | "COORDINADOR";

/** Banda cualitativa de confianza (reemplaza el score crudo en la UI). */
export type BandaConfianza = "REVISION_PRIORITARIA" | "POSIBLE" | "BAJA";

/** Estados de una coincidencia (human-in-the-loop). */
export type EstadoCoincidencia =
  | "SUGERIDA"
  | "EN_REVISION"
  | "INFO_INSUFICIENTE"
  | "RECHAZADA"
  | "CONFIRMADA"
  | "PENDIENTE_NOTIFICACION"
  | "NOTIFICADA"
  | "CERRADA";

export type Sexo = "M" | "F" | "OTRO" | "DESCONOCIDO";

export interface Ubicacion {
  texto?: string;
  lat?: number;
  lng?: number;
}

export interface DatosReportante {
  nombre?: string;
  /** Formateado +57... (reutilizar formatWhatsAppNumber). */
  contactoWhatsapp?: string;
  relacion?: string;
}

export interface FotoReporte {
  /** URI local en el dispositivo (disponible offline). */
  uriLocal?: string;
  /** URL remota tras subir a Supabase Storage (subida diferida). */
  urlRemota?: string;
  /** true cuando la foto ya se comprimió en el dispositivo. */
  comprimida: boolean;
}

/** Reporte de persona (esquema único para BUSCADA y ENCONTRADA). */
export interface ReportePersona {
  /** UUID generado en el dispositivo. Clave de idempotencia; no cambia al sincronizar. */
  id: string;
  tipo: TipoReporte;
  estado: EstadoReporte;
  syncState: SyncState;

  nombre?: string;
  edadAprox?: number;
  esMenor: boolean;
  sexo?: Sexo;
  descripcionFisica?: string;
  ropa?: string;
  senasParticulares?: string;
  ultimaUbicacion?: Ubicacion;
  foto?: FotoReporte;

  /** Solo ENCONTRADA. */
  estadoVital?: EstadoVital;
  /** Solo BUSCADA. */
  reportante?: DatosReportante;

  /** Rol e id de quien capturó. */
  creadoPorRol: RolUsuario;
  creadoPorId: string;

  creadoEn: string; // ISO 8601
  actualizadoEn: string; // ISO 8601

  /** Reintentos de sync acumulados (para backoff). */
  intentosSync: number;
  /** Si es duplicado, id del reporte maestro. */
  maestroId?: string;
}

export interface EvidenciaCoincidencia {
  campo: "nombre" | "edad" | "ubicacion" | "ropa" | "senas" | "sexo";
  detalle: string;
}

/** Coincidencia candidata entre una BUSCADA y una ENCONTRADA. */
export interface Coincidencia {
  id: string;
  reporteBuscadaId: string;
  reporteEncontradaId: string;
  estado: EstadoCoincidencia;
  banda: BandaConfianza;
  evidencia: EvidenciaCoincidencia[];
  /** true si la ENCONTRADA está marcada FALLECIDA (activa protocolo reforzado). */
  involucraFallecido: boolean;
  /** Coordinador que la tomó en revisión. */
  revisorId?: string;
  /** Segundo validador (obligatorio si involucraFallecido). */
  segundoValidadorId?: string;
  motivoRechazo?: string;
  creadoEn: string; // ISO 8601
  actualizadoEn: string; // ISO 8601
}
