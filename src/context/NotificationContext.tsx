import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type ToastType = "success" | "alert" | "info" | "delete";

export interface CommunityActivity {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  timestamp: string;
  creado_por?: string;
  necesidad_id?: string;
  tipo_evento?: string;
}

interface NotificationContextProps {
  showToast: (title: string, message: string, type?: ToastType) => void;
  onlineCount: number;
  activityLog: CommunityActivity[];
  unreadCount: number;
  markNotificationsAsRead: () => void;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps>({
  showToast: () => {},
  onlineCount: 1,
  activityLog: [],
  unreadCount: 0,
  markNotificationsAsRead: () => {},
  fetchNotifications: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentToast, setCurrentToast] = useState<CommunityActivity | null>(null);
  const [activityLog, setActivityLog] = useState<CommunityActivity[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [onlineCount, setOnlineCount] = useState<number>(2);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-100))[0];

  const markNotificationsAsRead = useCallback(() => {
    setUnreadCount(0);
    AsyncStorage.setItem("@humano_colombia_last_read_notif", Date.now().toString()).catch(() => {});
  }, []);

  const showToast = (title: string, message: string, type: ToastType = "info") => {
    const newActivity: CommunityActivity = {
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setActivityLog((prev) => [newActivity, ...prev.filter((a) => a.id !== newActivity.id)]);
    setCurrentToast(newActivity);

    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-ocultar después de 4.5 segundos
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentToast(null);
      });
    }, 4500);
  };

  // Cargar notificaciones globales de la tabla `notificaciones` o de `necesidades`
  // Cargar notificaciones globales de la tabla `notificaciones` o de `necesidades`
  const fetchNotifications = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      // 1. Intentar consultar la tabla `notificaciones`
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(30);

      if (!error && data && data.length > 0) {
        const currentUserId = user?.id;

        // 🔒 Filtrado por destinatario:
        // - NUEVO_EVENTO: Broadcast público (todos lo ven).
        // - CONTRIBUCION: Notificación privada al creador (solo la ve si creado_por === currentUserId).
        const visibleData = data.filter((item: any) => {
          if (item.tipo === "CONTRIBUCION") {
            return Boolean(currentUserId && item.creado_por === currentUserId);
          }
          return true;
        });

        const mapped: CommunityActivity[] = visibleData.map((item: any) => ({
          id: item.id || `notif-${Math.random()}`,
          title: item.titulo || "🚨 Nueva solicitud",
          message: item.mensaje || "Publicada en Colombia",
          type: item.tipo === "CONTRIBUCION" ? "success" : item.tipo === "NUEVO_EVENTO" ? "alert" : "info",
          timestamp: item.creado_en
            ? new Date(item.creado_en).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Reciente",
          creado_por: item.creado_por,
          necesidad_id: item.necesidad_id || undefined,
          tipo_evento: item.tipo || undefined,
        }));
        setActivityLog(mapped);

        // Calcular notificaciones no leídas basándose en visibleData
        try {
          const lastRead = await AsyncStorage.getItem("@humano_colombia_last_read_notif");
          const lastReadTime = lastRead ? parseInt(lastRead, 10) : 0;

          const unread = visibleData.filter((item: any) => {
            const itemTime = new Date(item.creado_en || Date.now()).getTime();
            return itemTime > lastReadTime;
          }).length;

          setUnreadCount(unread);
        } catch (e) {
          setUnreadCount(visibleData.length);
        }
        return;
      }

      // 2. Si `notificaciones` está vacía aún, autogenerar desde `necesidades`
      const { data: needsData } = await supabase
        .from("necesidades")
        .select("id, titulo, ubicacion, creado_en, creador_id")
        .order("creado_en", { ascending: false })
        .limit(15);

      if (needsData && needsData.length > 0) {
        const mappedFromNeeds: CommunityActivity[] = needsData.map((item: any) => ({
          id: `need-notif-${item.id}`,
          title: "🚨 Solicitud activa en la comunidad",
          message: `${item.titulo} en ${item.ubicacion}`,
          type: "alert",
          timestamp: item.creado_en
            ? new Date(item.creado_en).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Reciente",
          creado_por: item.creador_id,
          necesidad_id: item.id,
          tipo_evento: "NUEVO_EVENTO",
        }));
        setActivityLog(mappedFromNeeds);
      }
    } catch (err) {
      console.log("Consulta de notificaciones globales en espera.");
    }
  }, [user?.id]);

  // Supabase Realtime para las tablas `notificaciones` y `necesidades` + Presencia
  useEffect(() => {
    fetchNotifications();

    if (isSupabaseConfigured()) {
      try {
        // Presencia de Usuarios en Línea
        const presenceChannel = supabase.channel("online-users-realtime", {
          config: {
            presence: {
              key: `user-${user?.id || Math.random().toString(36).substring(7)}`,
            },
          },
        });

        presenceChannel
          .on("presence", { event: "sync" }, () => {
            const state = presenceChannel.presenceState();
            const count = Object.keys(state).length;
            setOnlineCount(Math.max(count, 1));
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await presenceChannel.track({ online_at: new Date().toISOString() });
            }
          });

        // Suscripción Realtime en Vivo a las tablas `notificaciones` y `necesidades`
        const notifChannel = supabase
          .channel("notificaciones-live-channel")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notificaciones" },
            (payload) => {
              if (payload.eventType === "INSERT") {
                const newNotif = payload.new as any;
                const currentUserId = user?.id;

                // 🔒 Guard de Privacidad Realtime:
                // Si es de tipo CONTRIBUCION, procesar ÚNICAMENTE si el destinatario es el usuario actual
                if (newNotif.tipo === "CONTRIBUCION") {
                  if (!currentUserId || newNotif.creado_por !== currentUserId) {
                    return; // Ignorar en vivo para otros usuarios
                  }
                }

                const newActivity: CommunityActivity = {
                  id: newNotif.id || `notif-${Date.now()}`,
                  title: newNotif.titulo || "🚨 Nueva solicitud",
                  message: newNotif.mensaje || "Publicada en la comunidad",
                  type: newNotif.tipo === "CONTRIBUCION" ? "success" : "alert",
                  timestamp: new Date(newNotif.creado_en || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  creado_por: newNotif.creado_por,
                  necesidad_id: newNotif.necesidad_id || undefined,
                  tipo_evento: newNotif.tipo || undefined,
                };

                setActivityLog((prev) => [newActivity, ...prev.filter((item) => item.id !== newActivity.id)]);

                // Incrementar contador de no leídas (Badge de la campana)
                setUnreadCount((prev) => prev + 1);

                // Toast flotante:
                // - CONTRIBUCION: Mostrar al creador destinatario (ya validado arriba)
                // - NUEVO_EVENTO: Mostrar a todos los demás usuarios (no a quien creó el evento)
                if (newNotif.tipo === "CONTRIBUCION") {
                  showToast(newActivity.title, newActivity.message, "success");
                } else if (!currentUserId || newNotif.creado_por !== currentUserId) {
                  showToast(newActivity.title, newActivity.message, "alert");
                }
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(presenceChannel);
          supabase.removeChannel(notifChannel);
        };
      } catch (err) {
        console.log("Realtime notificaciones en espera.");
      }
    } else {
      const interval = setInterval(() => {
        setOnlineCount(Math.floor(Math.random() * 4) + 2);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return { name: "checkmark-circle-sharp" as const, color: COLORS.secondary, bg: COLORS.secondaryLight };
      case "alert":
        return { name: "alert-circle-sharp" as const, color: COLORS.flagYellow, bg: COLORS.flagYellowLight };
      case "delete":
        return { name: "trash-bin-sharp" as const, color: "#64748B", bg: "#F1F5F9" };
      default:
        return { name: "information-circle-sharp" as const, color: COLORS.primary, bg: COLORS.primaryLight };
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        onlineCount,
        activityLog,
        unreadCount,
        markNotificationsAsRead,
        fetchNotifications,
      }}
    >
      {children}

      {/* Floating In-App Toast Banner */}
      {currentToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.toastContent}>
            {(() => {
              const iconInfo = getToastIcon(currentToast.type);
              return (
                <View style={[styles.iconBox, { backgroundColor: iconInfo.bg }]}>
                  <Ionicons name={iconInfo.name} size={22} color={iconInfo.color} />
                </View>
              );
            })()}

            <View style={styles.textContainer}>
              <Text style={styles.toastTitle}>{currentToast.title}</Text>
              <Text style={styles.toastMessage} numberOfLines={2}>
                {currentToast.message}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setCurrentToast(null)}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  toastMessage: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
});
