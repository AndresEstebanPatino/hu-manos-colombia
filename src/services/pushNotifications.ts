import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const PUSH_TOKEN_STORAGE_KEY = "@humano_colombia_push_token_v1";

// Carga segura de módulos de notificaciones para evitar errores en SSR / Node.js
const getNotificationsModule = () => {
  if (typeof window !== "undefined" && Platform.OS !== "web") {
    try {
      return require("expo-notifications");
    } catch (e) {
      return null;
    }
  }
  return null;
};

const getDeviceModule = () => {
  if (typeof window !== "undefined" && Platform.OS !== "web") {
    try {
      return require("expo-device");
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Configuración del handler para recibir notificaciones en primer plano cuando la app está abierta
const Notifications = getNotificationsModule();
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {}
}

/**
 * Solicita permisos de notificaciones push y obtiene el ExpoPushToken del dispositivo.
 * Registra o actualiza el token en la tabla `user_push_tokens` de Supabase.
 */
export const registerForPushNotificationsAsync = async (userId: string): Promise<string | null> => {
  let token: string | null = null;

  try {
    const NotificationsMod = getNotificationsModule();
    const DeviceMod = getDeviceModule();

    if (!NotificationsMod) {
      // Retornar token local de desarrollo para web/SSR
      return `ExponentPushToken[dev-${userId}]`;
    }

    // Android Channel Setup
    if (Platform.OS === "android") {
      await NotificationsMod.setNotificationChannelAsync("emergencias", {
        name: "Alertas de Emergencia Hu-Manos",
        importance: NotificationsMod.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1E40AF",
      });
    }

    if (DeviceMod?.isDevice || Platform.OS === "web") {
      const { status: existingStatus } = await NotificationsMod.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await NotificationsMod.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return null;
      }

      // Obtener el ExpoPushToken
      try {
        const pushTokenData = await NotificationsMod.getExpoPushTokenAsync();
        token = pushTokenData.data;
      } catch (tokenErr) {
        token = `ExponentPushToken[dev-${userId}]`;
      }

      if (token) {
        await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

        // Guardar o actualizar en Supabase table user_push_tokens
        if (isSupabaseConfigured()) {
          try {
            // Verificar si el ID es un UUID válido de Supabase Auth
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
            const tokenPayload: any = {
              push_token: token,
              updated_at: new Date().toISOString(),
            };

            if (isUuid) {
              tokenPayload.id = userId;
              tokenPayload.user_id = userId;
            }

            await supabase.from("user_push_tokens").upsert(tokenPayload, {
              onConflict: isUuid ? "id" : undefined,
            });
          } catch (spErr) {
            console.log("Info push token:", spErr);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error al registrar notificaciones push:", error);
  }

  return token;
};

/**
 * Envía una notificación push a través de la API oficial de Expo Push Server
 */
export const sendExpoPushNotifications = async (
  pushTokens: string[],
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<boolean> => {
  if (!pushTokens || pushTokens.length === 0) return false;

  const validTokens = pushTokens.filter((t) => t && t.startsWith("ExponentPushToken"));
  if (validTokens.length === 0) return false;

  const messages = validTokens.map((pushToken) => ({
    to: pushToken,
    sound: "default",
    title,
    body,
    data,
    priority: "high",
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const resData = await response.json();
    return Boolean(resData);
  } catch (error) {
    console.error("Error enviando notificaciones a la API de Expo Push:", error);
    return false;
  }
};

/**
 * Notifica a TODOS los usuarios (excepto al creador) sobre una NUEVA solicitud de ayuda
 */
export const notifyNewNeedCreated = async (
  needTitle: string,
  location: string,
  needId: string,
  creatorId?: string
) => {
  try {
    if (!isSupabaseConfigured()) return;

    const { data: tokensData, error } = await supabase
      .from("user_push_tokens")
      .select("push_token, user_id");

    if (!error && tokensData && tokensData.length > 0) {
      const recipientTokens = tokensData
        .filter((row) => row.user_id !== creatorId)
        .map((row) => row.push_token);

      await sendExpoPushNotifications(
        recipientTokens,
        "🚨 Nueva solicitud en Hu-Manos",
        `${needTitle} en ${location}`,
        { needId, type: "NEW_NEED" }
      );
    }
  } catch (err) {
    console.error("Error en notifyNewNeedCreated:", err);
  }
};

/**
 * Notifica a los usuarios que se sumaron a una necesidad cuando es marcada como CUBIERTA / CERRADA
 */
export const notifyNeedCompletedToSupporters = async (
  needTitle: string,
  needId: string,
  supporterUserIds: string[]
) => {
  try {
    if (!isSupabaseConfigured() || !supporterUserIds || supporterUserIds.length === 0) return;

    const { data: tokensData, error } = await supabase
      .from("user_push_tokens")
      .select("push_token, user_id")
      .in("user_id", supporterUserIds);

    if (!error && tokensData && tokensData.length > 0) {
      const recipientTokens = tokensData.map((row) => row.push_token);

      await sendExpoPushNotifications(
        recipientTokens,
        "✅ ¡Necesidad cubierta!",
        `La solicitud '${needTitle}' ha sido resuelta. ¡Gracias por tu ayuda!`,
        { needId, type: "NEED_COMPLETED" }
      );
    }
  } catch (err) {
    console.error("Error en notifyNeedCompletedToSupporters:", err);
  }
};
