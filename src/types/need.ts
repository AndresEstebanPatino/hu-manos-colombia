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
  creador_verificado?: boolean;
  apoyantes_ids?: string[]; // IDs de usuarios que ya se sumaron
  votos_confianza?: number; // Votos de veracidad vecinal
  voto_confianza_ids?: string[];
  reportes_spam?: number; // Reportes por sospecha de estafa
  reportado_por_ids?: string[];
  latitud?: number; // Coordenada GPS latitud
  longitud?: number; // Coordenada GPS longitud
  imagen_url?: string; // URL pública de imagen opcional en Supabase Storage
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
  metodo_auth: "GOOGLE" | "TELEFONO" | "RAPIDO";
  creado_en: string;
  verificado?: boolean;
}
