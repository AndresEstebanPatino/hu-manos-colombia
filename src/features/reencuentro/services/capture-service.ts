import { CrearReporteInput, ReportRepository, SyncEngine } from "../domain";
import { AsyncStorageReportRepository } from "./async-storage-report-repository";
import { SupabaseReportGateway } from "./supabase-report-gateway";
import { QueueSyncEngine } from "./queue-sync-engine";
import { crearReporte, CrearReporteResultado } from "./crear-reporte";
import { generarIdCliente } from "./uuid";

export interface CaptureService {
  repo: ReportRepository;
  sync: SyncEngine;
  crear(input: CrearReporteInput): Promise<CrearReporteResultado>;
}

/**
 * Composition root de captura: ensambla persistencia local + gateway remoto
 * (Supabase) + motor de sync idempotente. Es lo que consume la UI.
 */
export function crearCaptureService(): CaptureService {
  const repo = new AsyncStorageReportRepository();
  const gateway = new SupabaseReportGateway();
  const sync = new QueueSyncEngine(repo, gateway);

  return {
    repo,
    sync,
    crear: (input) =>
      crearReporte(input, {
        repo,
        generarId: generarIdCliente,
        ahora: () => new Date().toISOString(),
      }),
  };
}
