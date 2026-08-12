// Mocks in-memory para TDD. Permiten a front y back trabajar sin el otro lado.

import { ReportePersona, SyncState } from "./types";
import {
  ReportRepository,
  ConnectivityMonitor,
  PhotoCompressor,
  CompressedPhoto,
} from "./contracts";

/** Repositorio en memoria: idempotente por id de cliente. */
export class InMemoryReportRepository implements ReportRepository {
  private store = new Map<string, ReportePersona>();

  async create(reporte: ReportePersona): Promise<ReportePersona> {
    this.store.set(reporte.id, { ...reporte });
    return { ...reporte };
  }

  async getById(id: string): Promise<ReportePersona | null> {
    const r = this.store.get(id);
    return r ? { ...r } : null;
  }

  async listLocal(): Promise<ReportePersona[]> {
    return [...this.store.values()].map((r) => ({ ...r }));
  }

  async listPendingSync(): Promise<ReportePersona[]> {
    return [...this.store.values()]
      .filter((r) => r.syncState === "PENDIENTE" || r.syncState === "ERROR")
      .map((r) => ({ ...r }));
  }

  async setSyncState(id: string, state: SyncState): Promise<void> {
    const r = this.store.get(id);
    if (r) this.store.set(id, { ...r, syncState: state });
  }

  async upsert(reporte: ReportePersona): Promise<ReportePersona> {
    // Idempotente: la clave es el id de cliente; repetir sobrescribe, no duplica.
    this.store.set(reporte.id, { ...reporte });
    return { ...reporte };
  }

  /** Utilidad de test: cuántos registros hay. */
  size(): number {
    return this.store.size;
  }
}

/** Monitor de conectividad falso: permite simular red en tests. */
export class FakeConnectivityMonitor implements ConnectivityMonitor {
  private online: boolean;
  private subs = new Set<(online: boolean) => void>();

  constructor(online = true) {
    this.online = online;
  }

  async isOnline(): Promise<boolean> {
    return this.online;
  }

  subscribe(cb: (online: boolean) => void): () => void {
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
    };
  }

  /** Utilidad de test: simula un cambio de conectividad. */
  setOnline(online: boolean): void {
    this.online = online;
    for (const cb of this.subs) cb(online);
  }
}

/** Compresor falso: devuelve un resultado determinista para tests. */
export class NoopPhotoCompressor implements PhotoCompressor {
  async compress(uri: string): Promise<CompressedPhoto> {
    return { uri, width: 1280, height: 960, bytes: 190_000 };
  }
}
