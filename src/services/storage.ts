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
 * Obtiene la lista completa de necesidades (combinando Supabase y AsyncStorage)
 */
export const getNeeds = async (): Promise<Necesidad[]> => {
  let localNeeds: Necesidad[] = [];
  try {
    const storedData = await safeAsyncStorage.getItem(STORAGE_KEY);
    if (storedData) {
      localNeeds = JSON.parse(storedData) as Necesidad[];
    } else {
      localNeeds = INITIAL_MOCK_NEEDS;
      await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_NEEDS));
    }
  } catch (err) {
    localNeeds = INITIAL_MOCK_NEEDS;
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("necesidades")
        .select("*")
        .order("creado_en", { ascending: false });

      if (!error && data && data.length > 0) {
        const remoteNeeds = data as Necesidad[];
        const remoteIds = new Set(remoteNeeds.map((n) => n.id));
        const extraLocals = localNeeds.filter((n) => !remoteIds.has(n.id));
        const merged = [...remoteNeeds, ...extraLocals];
        
        merged.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        return merged;
      }
    } catch (supabaseErr) {
      console.log("Consulta remota falló, usando almacenamiento local.");
    }
  }

  return localNeeds;
};

/**
 * Crea una nueva solicitud en la plataforma (Guarda en Supabase + AsyncStorage)
 */
export const createNeed = async (
  newNeedData: Omit<Necesidad, "id" | "completado" | "creado_en" | "progreso_actual">
): Promise<Necesidad> => {
  const newNeed: Necesidad = {
    ...newNeedData,
    id: `need-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    contacto_whatsapp: formatWhatsAppNumber(newNeedData.contacto_whatsapp),
    progreso_actual: 0,
    completado: false,
    creado_en: new Date().toISOString(),
  };

  try {
    const storedData = await safeAsyncStorage.getItem(STORAGE_KEY);
    const existingNeeds: Necesidad[] = storedData ? JSON.parse(storedData) : INITIAL_MOCK_NEEDS;
    const updatedNeeds = [newNeed, ...existingNeeds];
    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNeeds));
  } catch (err) {
    console.error("Error al guardar localmente:", err);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from("necesidades").insert([newNeed]);

      // Agregar inmediatamente la notificación global en la tabla 'notificaciones' para la campana 🔔
      await supabase.from("notificaciones").insert([
        {
          titulo: "🚨 Nueva solicitud creada",
          mensaje: `${newNeed.titulo} en ${newNeed.ubicacion}`,
          tipo: "NUEVO_EVENTO",
          necesidad_id: newNeed.id,
          creado_por: newNeed.creador_id || "anonimo",
        },
      ]);
    } catch (supabaseErr) {
      console.error("No se pudo enviar a Supabase, guardado en almacenamiento local:", supabaseErr);
    }
  }

  return newNeed;
};

/**
 * Elimina una necesidad por su ID
 */
export const deleteNeed = async (id: string): Promise<boolean> => {
  try {
    const existingNeeds = await getNeeds();
    const filtered = existingNeeds.filter((n) => n.id !== id);
    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured()) {
      supabase.from("necesidades").delete().eq("id", id).then(({ error }) => {
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
 * Reinicia la base de datos local con los datos semilla (Seed Data)
 */
export const resetToSeedData = async (): Promise<Necesidad[]> => {
  await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_NEEDS));
  return INITIAL_MOCK_NEEDS;
};
