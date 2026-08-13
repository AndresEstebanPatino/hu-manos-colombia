export type TipoNecesidad = "RECURSO" | "VOLUNTARIO";

export type CategoriaNecesidad =
  | "BEBES_LACTANCIA"
  | "ALIMENTOS"
  | "ROPA_COBIJAS"
  | "MANO_DE_OBRA"
  | "SALUD"
  | "OTRO";

export interface Necesidad {
  id: string;
  tipo: TipoNecesidad;
  categoria: CategoriaNecesidad;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  contacto_whatsapp: string;
  meta_cantidad: number;
  progreso_actual: number;
  completado: boolean;
  creado_en: string;
  unidad_medida?: string;
  creador_id?: string;
  apoyantes_ids?: string[]; // IDs de usuarios que ya se sumaron (evita spam de clics múltiples)
}

export interface CategoriaConfig {
  key: CategoriaNecesidad | "TODAS";
  label: string;
  emoji: string;
  badgeBg: string;
  badgeText: string;
  color: string;
}

export interface UserProfile {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  avatar_url?: string;
  metodo_auth: "GOOGLE" | "TELEFONO" | "RAPIDO" | "EMAIL";
  creado_en: string;
}
