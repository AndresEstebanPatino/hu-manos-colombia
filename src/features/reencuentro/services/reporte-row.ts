import { ReportePersona } from "../domain";

/**
 * Mapea el modelo de dominio (camelCase) a la fila de `reencuentro_reportes`
 * (snake_case). El `syncState` es local y NO se envía al servidor.
 */
export function reporteARow(r: ReportePersona): Record<string, unknown> {
  return {
    id: r.id,
    tipo: r.tipo,
    estado: r.estado,
    nombre: r.nombre ?? null,
    edad_aprox: r.edadAprox ?? null,
    es_menor: r.esMenor,
    sexo: r.sexo ?? null,
    descripcion_fisica: r.descripcionFisica ?? null,
    ropa: r.ropa ?? null,
    senas_particulares: r.senasParticulares ?? null,
    ubicacion_texto: r.ultimaUbicacion?.texto ?? null,
    ubicacion_lat: r.ultimaUbicacion?.lat ?? null,
    ubicacion_lng: r.ultimaUbicacion?.lng ?? null,
    foto_url: r.foto?.urlRemota ?? null,
    estado_vital: r.estadoVital ?? null,
    reportante_nombre: r.reportante?.nombre ?? null,
    reportante_contacto: r.reportante?.contactoWhatsapp ?? null,
    reportante_relacion: r.reportante?.relacion ?? null,
    creado_por_rol: r.creadoPorRol,
    creado_por_id: r.creadoPorId,
    maestro_id: r.maestroId ?? null,
    creado_en: r.creadoEn,
    actualizado_en: r.actualizadoEn,
  };
}

/** Fila de `reencuentro_reportes` tal como llega de Supabase. */
export interface ReporteRow {
  id: string;
  tipo: string;
  estado: string;
  nombre: string | null;
  edad_aprox: number | null;
  es_menor: boolean;
  sexo: string | null;
  descripcion_fisica: string | null;
  ropa: string | null;
  senas_particulares: string | null;
  ubicacion_texto: string | null;
  ubicacion_lat: number | null;
  ubicacion_lng: number | null;
  foto_url: string | null;
  estado_vital: string | null;
  reportante_nombre: string | null;
  reportante_contacto: string | null;
  reportante_relacion: string | null;
  creado_por_rol: string;
  creado_por_id: string;
  maestro_id: string | null;
  creado_en: string;
  actualizado_en: string;
}

/** Mapea la fila de Supabase al modelo de dominio (camelCase). */
export function rowAReporte(row: ReporteRow): ReportePersona {
  const tieneUbic = Boolean(row.ubicacion_texto) || row.ubicacion_lat != null;
  const tieneReportante = Boolean(
    row.reportante_nombre || row.reportante_contacto || row.reportante_relacion
  );
  return {
    id: row.id,
    tipo: row.tipo as ReportePersona["tipo"],
    estado: row.estado as ReportePersona["estado"],
    syncState: "SINCRONIZADO",
    nombre: row.nombre ?? undefined,
    edadAprox: row.edad_aprox ?? undefined,
    esMenor: row.es_menor,
    sexo: (row.sexo as ReportePersona["sexo"]) ?? undefined,
    descripcionFisica: row.descripcion_fisica ?? undefined,
    ropa: row.ropa ?? undefined,
    senasParticulares: row.senas_particulares ?? undefined,
    ultimaUbicacion: tieneUbic
      ? {
          texto: row.ubicacion_texto ?? undefined,
          lat: row.ubicacion_lat ?? undefined,
          lng: row.ubicacion_lng ?? undefined,
        }
      : undefined,
    foto: row.foto_url ? { urlRemota: row.foto_url, comprimida: true } : undefined,
    estadoVital: (row.estado_vital as ReportePersona["estadoVital"]) ?? undefined,
    reportante: tieneReportante
      ? {
          nombre: row.reportante_nombre ?? undefined,
          contactoWhatsapp: row.reportante_contacto ?? undefined,
          relacion: row.reportante_relacion ?? undefined,
        }
      : undefined,
    creadoPorRol: row.creado_por_rol as ReportePersona["creadoPorRol"],
    creadoPorId: row.creado_por_id,
    maestroId: row.maestro_id ?? undefined,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    intentosSync: 0,
  };
}
