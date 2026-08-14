export type TipoNecesidad = "RECURSO" | "VOLUNTARIO";
export type ModoNecesidad = "SOLICITUD" | "OFERTA";

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
  modo?: ModoNecesidad;
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
  metodo_auth: "GOOGLE" | "TELEFONO" | "RAPIDO" | "EMAIL";
  creado_en: string;
  verificado?: boolean;
}

export type TipoEntrega = "RECOGE" | "NECESITA_ENTREGA" | "SE_ENCUENTRAN";

export interface ContribucionLogistica {
  tipo_entrega?: TipoEntrega;
  ubicacion_contacto?: string;
  latitud?: number;
  longitud?: number;
  notas_logistica?: string;
}

export interface ContribucionDetalle extends ContribucionLogistica {
  id: string;
  necesidad_id: string;
  usuario_id: string;
  cantidad_aportada: number;
  confirmado: boolean;
  created_at: string;
  perfil_usuario?: {
    full_name?: string;
    avatar_url?: string;
  };
}
