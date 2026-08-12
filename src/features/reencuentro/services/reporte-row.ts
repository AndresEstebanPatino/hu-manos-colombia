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
