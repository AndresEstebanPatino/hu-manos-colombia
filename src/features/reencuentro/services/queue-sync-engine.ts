import {
  ReportRepository,
  RemoteReportGateway,
  ReportePersona,
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
        // Al llegar al servidor, un reporte recién capturado pasa a ACTIVO
        // (queda disponible para el cruce y la lista). Otros estados se conservan.
        const estadoServidor: ReportePersona["estado"] =
          reporte.estado === "CAPTURADO" || reporte.estado === "PENDIENTE_SYNC"
            ? "ACTIVO"
            : reporte.estado;
        const paraSubir: ReportePersona = { ...reporte, estado: estadoServidor };
        await this.gateway.upsert(paraSubir);
        await this.repo.upsert({ ...paraSubir, syncState: "SINCRONIZADO" });
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
