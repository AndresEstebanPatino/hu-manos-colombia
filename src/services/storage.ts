import AsyncStorage from "@react-native-async-storage/async-storage";
import { Necesidad, CategoriaNecesidad } from "../types/need";
import { INITIAL_MOCK_NEEDS } from "../data/mockNeeds";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const STORAGE_KEY = "@humano_colombia_necesidades_v1";

const safeAsyncStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined") return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === "undefined") return;
    return AsyncStorage.removeItem(key);
  },
};

/**
 * Sanitiza números telefónicos para WhatsApp con prefijo de Colombia (+57)
 */
export const formatWhatsAppNumber = (phoneRaw: string): string => {
  const digitsOnly = phoneRaw.replace(/\D/g, "");
  if (digitsOnly.startsWith("57") && digitsOnly.length >= 12) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.length === 10) {
    return `+57${digitsOnly}`;
  }
  return digitsOnly ? `+57${digitsOnly}` : "+573000000000";
};

/**
 * Formatea tiempo transcurrido en texto amigable ("Hace 15 min", "Hace 2h")
 */
export const getTimeAgo = (isoDateString: string): string => {
  try {
    const created = new Date(isoDateString).getTime();
    const now = Date.now();
    const diffMinutes = Math.floor((now - created) / (1000 * 60));

    if (diffMinutes < 1) return "Justo ahora";
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  } catch (e) {
    return "Reciente";
  }
};

/**
 * Obtiene la lista completa de necesidades desde Supabase (o almacenamiento local de respaldo)
 */
export const getNeeds = async (): Promise<Necesidad[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("necesidades")
        .select("*")
        .order("creado_en", { ascending: false });

      if (!error && data) {
        const remoteNeeds = data as Necesidad[];
        // Guardar la versión sincronizada de Supabase en almacenamiento local
        await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remoteNeeds));
        return remoteNeeds;
      } else if (error) {
        console.error("Error al consultar necesidades en Supabase:", error.message);
      }
    } catch (supabaseErr) {
      console.log("Consulta remota falló, usando almacenamiento local.");
    }
  }

  // Fallback local en caso de desconexión
  try {
    const storedData = await safeAsyncStorage.getItem(STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData) as Necesidad[];
    }
  } catch (err) {
    console.error("Error al leer almacenamiento local:", err);
  }

  return INITIAL_MOCK_NEEDS;
};

/**
 * Asegura un ID de usuario válido de Supabase Auth
 */
export const getValidSupabaseUserId = async (preferredId?: string): Promise<string> => {
  if (!isSupabaseConfigured()) {
    return preferredId || "anonimo";
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) {
      return data.session.user.id;
    }

    // Intentar inicio de sesión anónimo si no hay sesión activa
    const { data: anonData, error } = await supabase.auth.signInAnonymously();
    if (!error && anonData?.user?.id) {
      return anonData.user.id;
    }
  } catch (err) {
    console.log("Error al verificar sesión de Supabase Auth:", err);
  }

  return preferredId || "anonimo";
};

/**
 * Crea una nueva solicitud en la plataforma (Guarda en Supabase + AsyncStorage)
 */
export const createNeed = async (
  newNeedData: Omit<Necesidad, "id" | "completado" | "creado_en" | "progreso_actual">
): Promise<Necesidad> => {
  const newNeed: Necesidad = {
    ...newNeedData,
    modo: newNeedData.modo || "SOLICITUD",
    id: `need-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    contacto_whatsapp: formatWhatsAppNumber(newNeedData.contacto_whatsapp),
    progreso_actual: 0,
    completado: false,
    creado_en: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    // 1. Asegurar un CREADOR_ID válido reconocido por Supabase Auth
    const validUserId = await getValidSupabaseUserId(newNeedData.creador_id);
    newNeed.creador_id = validUserId;

    // 2. Insertar en Supabase y VERIFICAR ERRORES explícitamente
    const { data: insertData, error: insertError } = await supabase
      .from("necesidades")
      .insert([newNeed])
      .select();

    if (insertError) {
      console.error("❌ ERROR AL INSERTAR EN SUPABASE:", insertError.message, insertError.details, insertError.hint);
      throw new Error(`Error de Supabase (${insertError.code || "DB"}): ${insertError.message}`);
    }

    if (!insertData || insertData.length === 0) {
      throw new Error("El servidor no retornó confirmación del guardado de la solicitud.");
    }

    const savedRecord = insertData[0] || newNeed;

    // 3. Invocar Edge Function 'send-push-notification' de forma no bloqueante (Fire and Forget)
    try {
      const { data: functionResult, error: functionError } = await supabase.functions.invoke(
        "send-push-notification",
        {
          body: {
            type: "INSERT",
            table: "necesidades",
            record: {
              id: savedRecord.id,
              titulo: savedRecord.titulo,
              categoria: savedRecord.categoria,
              ubicacion: savedRecord.ubicacion,
              creador_id: savedRecord.creador_id,
            },
            schema: "public",
            old_record: null,
          },
        }
      );

      if (functionError) {
        console.error("Error al enviar notificaciones push via Edge Function:", functionError);
      } else {
        console.log("Respuesta de Edge Function send-push-notification:", functionResult);
      }
    } catch (pushErr) {
      console.error("Excepción al invocar Edge Function send-push-notification:", pushErr);
    }

    // 4. Agregar inmediatamente la notificación global en la tabla 'notificaciones' para la campana 🔔
    try {
      await supabase.from("notificaciones").insert([
        {
          titulo: "🚨 Nueva solicitud creada",
          mensaje: `${newNeed.titulo} en ${newNeed.ubicacion}`,
          tipo: "NUEVO_EVENTO",
          necesidad_id: newNeed.id,
          creado_por: validUserId,
        },
      ]);
    } catch (notifErr) {
      console.log("Info notificación:", notifErr);
    }
  }

  // 4. Solo si se guardó exitosamente en Supabase (o si Supabase no está configurado), guardar en AsyncStorage local
  try {
    const storedData = await safeAsyncStorage.getItem(STORAGE_KEY);
    const existingNeeds: Necesidad[] = storedData ? JSON.parse(storedData) : INITIAL_MOCK_NEEDS;
    const updatedNeeds = [newNeed, ...existingNeeds];
    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNeeds));
  } catch (err) {
    console.error("Error al guardar localmente:", err);
  }

  return newNeed;
};

/**
 * Elimina una necesidad por su ID (filtrada por creador_id si se especifica)
 */
export const deleteNeed = async (id: string, userId?: string): Promise<boolean> => {
  try {
    const existingNeeds = await getNeeds();
    const filtered = existingNeeds.filter((n) => n.id !== id);
    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured()) {
      let query = supabase.from("necesidades").delete().eq("id", id);
      if (userId) {
        query = query.eq("creador_id", userId);
      }
      query.then(({ error }) => {
        if (error) console.log("Error al eliminar de Supabase:", error.message);
      });
    }

    return true;
  } catch (error) {
    console.error("Error al eliminar necesidad:", error);
    return false;
  }
};

/**
 * Incrementa el progreso de una necesidad (+1 Me sumo por usuario único para evitar spam)
 */
export const incrementNeedProgress = async (id: string, userId?: string): Promise<{ need: Necesidad; added: boolean } | null> => {
  try {
    const existingNeeds = await getNeeds();
    const index = existingNeeds.findIndex((n) => n.id === id);

    if (index === -1) return null;

    const current = existingNeeds[index];
    const currentApoyantes = current.apoyantes_ids || [];
    const effectiveUserId = userId || "anonymous-user";

    let updatedApoyantes: string[];
    let newProgress: number;
    let added = false;

    if (currentApoyantes.includes(effectiveUserId)) {
      // Si el usuario ya se había sumado, remover apoyo (toggle / un-sumar)
      updatedApoyantes = currentApoyantes.filter((uid) => uid !== effectiveUserId);
      newProgress = Math.max(current.progreso_actual - 1, 0);
      added = false;
    } else {
      // Si no se había sumado, agregar +1 único
      updatedApoyantes = [...currentApoyantes, effectiveUserId];
      newProgress = current.progreso_actual + 1;
      added = true;
    }

    const isCompleted = newProgress >= current.meta_cantidad;

    const updatedItem: Necesidad = {
      ...current,
      progreso_actual: newProgress,
      completado: isCompleted,
      apoyantes_ids: updatedApoyantes,
    };

    existingNeeds[index] = updatedItem;

    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingNeeds));

    if (isSupabaseConfigured()) {
      supabase
        .from("necesidades")
        .update({
          progreso_actual: newProgress,
          completado: isCompleted,
          apoyantes_ids: updatedApoyantes,
        })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.log("Supabase update info:", error.message);
        });
    }

    return { need: updatedItem, added };
  } catch (error) {
    console.error("Error al incrementar progreso:", error);
    return null;
  }
};

/**
 * Marca una solicitud como completamente cubierta
 */
export const toggleNeedCompleted = async (id: string, completadoStatus = true): Promise<Necesidad | null> => {
  try {
    const existingNeeds = await getNeeds();
    const index = existingNeeds.findIndex((n) => n.id === id);

    if (index === -1) return null;

    const updatedItem: Necesidad = {
      ...existingNeeds[index],
      completado: completadoStatus,
      progreso_actual: completadoStatus ? existingNeeds[index].meta_cantidad : existingNeeds[index].progreso_actual,
    };

    existingNeeds[index] = updatedItem;

    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingNeeds));

    if (isSupabaseConfigured()) {
      supabase
        .from("necesidades")
        .update({
          completado: completadoStatus,
          progreso_actual: updatedItem.progreso_actual,
        })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.log("Supabase update info:", error.message);
        });
    }

    return updatedItem;
  } catch (error) {
    console.error("Error al cambiar estado completado:", error);
    return null;
  }
};

/**
 * Voto de Confianza de la comunidad para verificar que el caso es real
 */
export const voteTrustNeed = async (id: string, userId: string): Promise<Necesidad | null> => {
  try {
    const existingNeeds = await getNeeds();
    const index = existingNeeds.findIndex((n) => n.id === id);
    if (index === -1) return null;

    const current = existingNeeds[index];
    const currentVotosIds = current.voto_confianza_ids || [];

    let newVotosIds: string[];
    let newCount: number;

    if (currentVotosIds.includes(userId)) {
      newVotosIds = currentVotosIds.filter((uid) => uid !== userId);
      newCount = Math.max((current.votos_confianza || 1) - 1, 0);
    } else {
      newVotosIds = [...currentVotosIds, userId];
      newCount = (current.votos_confianza || 0) + 1;
    }

    const updatedItem: Necesidad = {
      ...current,
      votos_confianza: newCount,
      voto_confianza_ids: newVotosIds,
    };

    existingNeeds[index] = updatedItem;
    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingNeeds));

    if (isSupabaseConfigured()) {
      supabase
        .from("necesidades")
        .update({ votos_confianza: newCount, voto_confianza_ids: newVotosIds })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.log("Info voto de confianza:", error.message);
        });
    }

    return updatedItem;
  } catch (err) {
    console.error("Error en voto de confianza:", err);
    return null;
  }
};

export type ReportReason = "PIDE_DINERO" | "CONTACTO_SOSPECHOSO" | "INFO_FALSA" | "OTRO";

export interface ReportResult {
  success: boolean;
  message: string;
  alreadyReported?: boolean;
  newSpamCount?: number;
}

/**
 * Registra un reporte formal en la tabla 'reportes' de Supabase
 */
export const reportScamNeed = async (
  necesidadId: string,
  userId: string,
  razon: ReportReason = "PIDE_DINERO",
  comentario?: string
): Promise<ReportResult> => {
  if (!userId) {
    return {
      success: false,
      message: "Debes identificarte para poder reportar una solicitud.",
    };
  }

  if (isSupabaseConfigured()) {
    try {
      // 1. Insertar en la tabla 'reportes'
      const { error: insertError } = await supabase.from("reportes").insert([
        {
          necesidad_id: necesidadId,
          reportado_por: userId,
          razon,
          comentario: comentario?.trim() || null,
        },
      ]);

      if (insertError) {
        // Código 23505 o restricción UNIQUE (necesidad_id, reportado_por)
        if (
          insertError.code === "23505" ||
          insertError.message.includes("unique constraint") ||
          insertError.message.includes("already exists")
        ) {
          return {
            success: false,
            message: "Ya has reportado esta solicitud anteriormente.",
            alreadyReported: true,
          };
        }
        console.error("Error al insertar en tabla reportes:", insertError.message);
        return {
          success: false,
          message: `No se pudo registrar el reporte: ${insertError.message}`,
        };
      }

      // 2. Incrementar el contador reportes_spam en la tabla 'necesidades'
      const { data: currentNeed } = await supabase
        .from("necesidades")
        .select("reportes_spam")
        .eq("id", necesidadId)
        .single();

      const newCount = (currentNeed?.reportes_spam || 0) + 1;

      await supabase
        .from("necesidades")
        .update({ reportes_spam: newCount })
        .eq("id", necesidadId);

      // 3. Actualizar almacenamiento local para sincronía
      try {
        const storedData = await safeAsyncStorage.getItem(STORAGE_KEY);
        if (storedData) {
          const existingNeeds: Necesidad[] = JSON.parse(storedData);
          const idx = existingNeeds.findIndex((n) => n.id === necesidadId);
          if (idx !== -1) {
            existingNeeds[idx].reportes_spam = newCount;
            await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingNeeds));
          }
        }
      } catch (e) {}

      return {
        success: true,
        message: "Gracias por alertar a la comunidad. Tu reporte ha sido registrado para revisión.",
        newSpamCount: newCount,
      };
    } catch (err: any) {
      console.error("Error inesperado en reportScamNeed:", err);
      return {
        success: false,
        message: err?.message || "Ocurrió un error al enviar el reporte.",
      };
    }
  }

  return {
    success: false,
    message: "El servicio de reportes requiere conexión activa a Supabase.",
  };
};

/**
 * Reinicia la base de datos local con los datos semilla (Seed Data)
 */
export const resetToSeedData = async (): Promise<Necesidad[]> => {
  await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_NEEDS));
  return INITIAL_MOCK_NEEDS;
};

/**
 * Obtiene las necesidades creadas por un usuario específico (para pantalla Mis Alertas)
 */
export const getUserNeeds = async (userId: string): Promise<Necesidad[]> => {
  if (!userId) return [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("necesidades")
        .select("*")
        .eq("creador_id", userId)
        .order("creado_en", { ascending: false });

      if (!error && data) {
        return data as Necesidad[];
      }
    } catch (err) {
      console.log("Error al consultar necesidades del usuario en Supabase:", err);
    }
  }

  // Fallback local en caso de que no haya conexión
  const allNeeds = await getNeeds();
  return allNeeds.filter((n) => n.creador_id === userId);
};

/**
 * Actualiza los datos de una necesidad existente (solo permitido para el creador)
 */
export const updateNeed = async (
  id: string,
  updatedFields: Partial<Necesidad>,
  userId: string
): Promise<Necesidad | null> => {
  try {
    const existingNeeds = await getNeeds();
    const index = existingNeeds.findIndex((n) => n.id === id);

    if (index === -1) return null;

    const current = existingNeeds[index];

    // Auto-completar si el progreso actual alcanza o supera la meta
    const finalProgreso = updatedFields.progreso_actual !== undefined ? updatedFields.progreso_actual : current.progreso_actual;
    const finalMeta = updatedFields.meta_cantidad !== undefined ? updatedFields.meta_cantidad : current.meta_cantidad;
    const autoCompletado = finalProgreso >= finalMeta;

    const updatedItem: Necesidad = {
      ...current,
      ...updatedFields,
      completado: updatedFields.completado !== undefined ? updatedFields.completado : autoCompletado,
    };

    existingNeeds[index] = updatedItem;
    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingNeeds));

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("necesidades")
        .update({
          ...updatedFields,
          completado: updatedItem.completado,
        })
        .eq("id", id)
        .eq("creador_id", userId);

      if (error) {
        console.error("Error de Supabase al actualizar necesidad:", error.message);
      }
    }

    return updatedItem;
  } catch (err) {
    console.error("Error en updateNeed:", err);
    return null;
  }
};
