import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReportRepository, ReportePersona, SyncState } from "../domain";

const STORAGE_KEY = "@reencuentro_reportes_v1";

/**
 * Persistencia local durable de reportes sobre AsyncStorage (cola offline).
 * Reutiliza el patrón de almacenamiento de la app; upsert idempotente por id.
 */
export class AsyncStorageReportRepository implements ReportRepository {
  private async readAll(): Promise<ReportePersona[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ReportePersona[];
    } catch {
      return [];
    }
  }

  private async writeAll(items: ReportePersona[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  async create(reporte: ReportePersona): Promise<ReportePersona> {
    return this.upsert(reporte);
  }

  async getById(id: string): Promise<ReportePersona | null> {
    const items = await this.readAll();
    return items.find((r) => r.id === id) ?? null;
  }

  async listLocal(): Promise<ReportePersona[]> {
    return this.readAll();
  }

  async listPendingSync(): Promise<ReportePersona[]> {
    const items = await this.readAll();
    return items.filter((r) => r.syncState === "PENDIENTE" || r.syncState === "ERROR");
  }

  async setSyncState(id: string, state: SyncState): Promise<void> {
    const items = await this.readAll();
    const next = items.map((r) => (r.id === id ? { ...r, syncState: state } : r));
    await this.writeAll(next);
  }

  async upsert(reporte: ReportePersona): Promise<ReportePersona> {
    const items = await this.readAll();
    const sinDuplicado = items.filter((r) => r.id !== reporte.id);
    await this.writeAll([reporte, ...sinDuplicado]);
    return reporte;
  }
}
