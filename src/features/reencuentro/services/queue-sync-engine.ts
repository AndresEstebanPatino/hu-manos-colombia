import {
  ReportRepository,
  RemoteReportGateway,
  SyncEngine,
  SyncResult,
  SyncState,
} from "../domain";

/**
 * Motor de sincronización de la cola local hacia el servidor.
 * - Idempotente por id de cliente (repetir no duplica).
 * - Aísla fallos por ítem: uno que falla no detiene a los demás.
 * - Cuenta reintentos; tras `maxIntentos` marca ERROR (recuperable, nunca se descarta).
 *
 * El *timing* del backoff lo decide la capa que dispara sync()
 * (reconexión / foreground / botón "reintentar"), no este motor.
 */
export class QueueSyncEngine implements SyncEngine {
  constructor(
    private readonly repo: ReportRepository,
    private readonly gateway: RemoteReportGateway,
    private readonly maxIntentos: number = 3
  ) {}

  async sync(): Promise<SyncResult> {
    const pendientes = await this.repo.listPendingSync();
    const sincronizados: string[] = [];
    const fallidos: string[] = [];

    for (const reporte of pendientes) {
      try {
        await this.repo.setSyncState(reporte.id, "SINCRONIZANDO");
        await this.gateway.upsert(reporte);
        await this.repo.setSyncState(reporte.id, "SINCRONIZADO");
        sincronizados.push(reporte.id);
      } catch {
        const intentos = reporte.intentosSync + 1;
        const nuevoEstado: SyncState = intentos >= this.maxIntentos ? "ERROR" : "PENDIENTE";
        await this.repo.upsert({ ...reporte, intentosSync: intentos, syncState: nuevoEstado });
        fallidos.push(reporte.id);
      }
    }

    return { sincronizados, fallidos };
  }
}
