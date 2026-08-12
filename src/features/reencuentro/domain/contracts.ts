// Contratos (interfaces) entre front y back. Permiten paralelizar contra mocks.
// Las implementaciones reales viven en services/ (front) y supabase/ (back).

import { ReportePersona, SyncState } from "./types";

export interface ReportRepository {
  /** Crea un reporte en almacenamiento local. */
  create(reporte: ReportePersona): Promise<ReportePersona>;
  getById(id: string): Promise<ReportePersona | null>;
  listLocal(): Promise<ReportePersona[]>;
  /** Reportes que aún deben sincronizarse (PENDIENTE o ERROR). */
  listPendingSync(): Promise<ReportePersona[]>;
  setSyncState(id: string, state: SyncState): Promise<void>;
  /** Upsert idempotente por id de cliente (repetir no crea duplicados). */
  upsert(reporte: ReportePersona): Promise<ReportePersona>;
}

export interface CompressedPhoto {
  uri: string;
  width: number;
  height: number;
  bytes: number;
}

export interface PhotoCompressor {
  /** Comprime en el dispositivo antes de encolar (target ~200KB, lado mayor ~1280px). */
  compress(uri: string): Promise<CompressedPhoto>;
}

export interface ConnectivityMonitor {
  isOnline(): Promise<boolean>;
  /** Suscribe a cambios de conectividad. Devuelve función para desuscribir. */
  subscribe(cb: (online: boolean) => void): () => void;
}

export interface SyncResult {
  sincronizados: string[];
  fallidos: string[];
}

export interface SyncEngine {
  /** Sincroniza la cola local hacia el servidor (idempotente por id de cliente). */
  sync(): Promise<SyncResult>;
}

/** Puerta hacia el servidor (Supabase). La implementación real vive en el backend. */
export interface RemoteReportGateway {
  /** Upsert idempotente de un reporte en el servidor. Puede rechazar (error de red). */
  upsert(reporte: ReportePersona): Promise<void>;
}
