import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface UserReliabilityProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  average_rating: number;
  total_ratings: number;
  reliability_level: "nuevo" | "muy_confiable" | "confiable" | "regular" | "riesgo";
}

export interface CalificacionItem {
  id: string;
  necesidad_id: string;
  calificado_id: string;
  calificador_id: string;
  estrellas: number;
  comentario: string;
  created_at: string;
  updated_at?: string;
  calificador?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export type RatingEligibilityStatus = "puede_calificar" | "ya_califico" | "no_elegible";

/**
 * 1. Verifica la elegibilidad de un usuario para calificar al creador de una necesidad
 */
export const puedeCalificar = async (
  necesidadId: string,
  userId: string
): Promise<{ status: RatingEligibilityStatus; calificacionExistente?: CalificacionItem }> => {
  if (!isSupabaseConfigured() || !necesidadId || !userId) {
    return { status: "no_elegible" };
  }

  try {
    // Verificar si el usuario ya calificó esta necesidad
    const { data: califData } = await supabase
      .from("calificaciones")
      .select("*")
      .eq("necesidad_id", necesidadId)
      .eq("calificador_id", userId)
      .maybeSingle();

    if (califData) {
      return { status: "ya_califico", calificacionExistente: califData as CalificacionItem };
    }

    // Verificar si existe una contribución confirmada
    const { data: contribData } = await supabase
      .from("contribuciones")
      .select("id")
      .eq("necesidad_id", necesidadId)
      .eq("usuario_id", userId)
      .eq("confirmado", true)
      .limit(1);

    if (contribData && contribData.length > 0) {
      return { status: "puede_calificar" };
    }

    return { status: "no_elegible" };
  } catch (err) {
    console.error("Error en puedeCalificar:", err);
    return { status: "no_elegible" };
  }
};

/**
 * 2. Envía o actualiza una calificación usando UPSERT
 */
export const enviarCalificacion = async (
  necesidadId: string,
  calificadoId: string,
  calificadorId: string,
  estrellas: number,
  comentario: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.from("calificaciones").upsert(
      {
        necesidad_id: necesidadId,
        calificado_id: calificadoId,
        calificador_id: calificadorId,
        estrellas,
        comentario: comentario.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "necesidad_id,calificador_id" }
    );

    if (error) {
      console.error("Error al enviar calificación:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error en enviarCalificacion:", err);
    return false;
  }
};

/**
 * 3. Edita una calificación existente por su ID
 */
export const editarCalificacion = async (
  calificacionId: string,
  estrellas: number,
  comentario: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("calificaciones")
      .update({
        estrellas,
        comentario: comentario.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", calificacionId);

    return !error;
  } catch (err) {
    console.error("Error en editarCalificacion:", err);
    return false;
  }
};

/**
 * 4. Elimina una calificación por su ID
 */
export const borrarCalificacion = async (calificacionId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("calificaciones")
      .delete()
      .eq("id", calificacionId);

    return !error;
  } catch (err) {
    console.error("Error en borrarCalificacion:", err);
    return false;
  }
};

/**
 * 5. Obtiene las calificaciones recibidas por un usuario (paginado con datos del calificador)
 */
export const obtenerCalificacionesDeUsuario = async (
  userId: string,
  page = 1,
  pageSize = 10
): Promise<CalificacionItem[]> => {
  if (!isSupabaseConfigured() || !userId) return [];

  try {
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    const { data, error } = await supabase
      .from("calificaciones")
      .select("*")
      .eq("calificado_id", userId)
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);

    if (error || !data) return [];

    // Obtener los perfiles de los calificadores para mostrar nombres y avatares
    const calificadorIds = Array.from(new Set(data.map((c) => c.calificador_id)));
    let profilesMap: Record<string, { full_name?: string; avatar_url?: string }> = {};

    if (calificadorIds.length > 0) {
      const { data: profData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", calificadorIds);

      if (profData) {
        profData.forEach((p) => {
          profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        });
      }
    }

    return data.map((item) => ({
      ...item,
      calificador: profilesMap[item.calificador_id] || { full_name: "Usuario Comunitario" },
    }));
  } catch (err) {
    console.error("Error en obtenerCalificacionesDeUsuario:", err);
    return [];
  }
};

/**
 * 6. Obtiene el perfil de confiabilidad acumulado de un usuario desde la tabla profiles
 */
export const obtenerPerfilConfiabilidad = async (
  userId: string
): Promise<UserReliabilityProfile> => {
  const defaultProfile: UserReliabilityProfile = {
    id: userId,
    average_rating: 0,
    total_ratings: 0,
    reliability_level: "nuevo",
  };

  if (!isSupabaseConfigured() || !userId) return defaultProfile;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, average_rating, total_ratings, reliability_level")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return defaultProfile;

    return {
      id: data.id,
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      average_rating: Number(data.average_rating) || 0,
      total_ratings: Number(data.total_ratings) || 0,
      reliability_level: data.reliability_level || "nuevo",
    };
  } catch (err) {
    console.error("Error en obtenerPerfilConfiabilidad:", err);
    return defaultProfile;
  }
};

/**
 * Registra una contribución e incrementa progreso_actual usando la función RPC atómica.
 * Si el RPC no está disponible, hace INSERT directo a contribuciones como fallback.
 */
export const registrarContribucionAtomic = async (
  necesidadId: string,
  userId: string,
  cantidadAportada = 1
): Promise<{ success: boolean; nuevoProgreso?: number; completado?: boolean; accion?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: true, nuevoProgreso: 1, completado: false };
  }

  try {
    // Llamar a la RPC atómica (creada por la migración 20260814000001)
    const { data, error } = await supabase.rpc("registrar_contribucion", {
      p_necesidad_id: necesidadId,
      p_cantidad_aportada: cantidadAportada,
    });

    if (!error && data) {
      return {
        success: true,
        nuevoProgreso: data.progreso_actual,
        completado: data.completado,
        accion: data.accion,
      };
    }

    if (error) {
      // Si el RPC no existe aún (404), intentar INSERT directo como fallback de emergencia
      console.warn("RPC registrar_contribucion no disponible, usando fallback:", error.message);
    }

    // Fallback: INSERT directo a contribuciones
    const { error: insertError } = await supabase.from("contribuciones").insert([
      {
        necesidad_id: necesidadId,
        usuario_id: userId,
        cantidad_aportada: cantidadAportada,
        confirmado: true,
      },
    ]);

    if (insertError) {
      console.warn("Insert directo a contribuciones falló:", insertError.message);
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error("Error en registrarContribucionAtomic:", err);
    return { success: false };
  }
};
