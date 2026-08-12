import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
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
}

interface NotificationContextProps {
  showToast: (title: string, message: string, type?: ToastType) => void;
  onlineCount: number;
  activityLog: CommunityActivity[];
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps>({
  showToast: () => {},
  onlineCount: 1,
  activityLog: [],
  fetchNotifications: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentToast, setCurrentToast] = useState<CommunityActivity | null>(null);
  const [activityLog, setActivityLog] = useState<CommunityActivity[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(2);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-100))[0];

  const showToast = (title: string, message: string, type: ToastType = "info") => {
    const newActivity: CommunityActivity = {
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

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

  // Cargar notificaciones globales de la tabla `notificaciones` en Supabase
  const fetchNotifications = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(25);

      if (!error && data) {
        const mapped: CommunityActivity[] = data.map((item: any) => ({
          id: item.id,
          title: item.titulo,
          message: item.mensaje,
          type: item.tipo === "NUEVO_EVENTO" ? "alert" : "info",
          timestamp: new Date(item.creado_en).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          creado_por: item.creado_por,
        }));
        setActivityLog(mapped);
      }
    } catch (err) {
      console.log("Consulta de notificaciones globales en espera.");
    }
  }, []);

  // Supabase Realtime para la tabla `notificaciones` y Presencia de usuarios en línea
  useEffect(() => {
    fetchNotifications();

    if (isSupabaseConfigured()) {
      try {
        // 1. Presencia de Usuarios en Línea
        const presenceChannel = supabase.channel("online-users", {
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

        // 2. Escuchador de Supabase Realtime a la tabla `notificaciones`
        const notifChannel = supabase
          .channel("notificaciones-realtime")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "notificaciones" },
            (payload) => {
              const newNotif = payload.new as any;
              const newActivity: CommunityActivity = {
                id: newNotif.id,
                title: newNotif.titulo,
                message: newNotif.mensaje,
                type: newNotif.tipo === "NUEVO_EVENTO" ? "alert" : "info",
                timestamp: new Date(newNotif.creado_en || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                creado_por: newNotif.creado_por,
              };

              // Actualizar el estado global de la campana 🔔 para TODOS los usuarios
              setActivityLog((prev) => [newActivity, ...prev.filter((item) => item.id !== newNotif.id)]);

              // Mostrar el banner flotante a los DEMÁS usuarios
              if (!user?.id || newNotif.creado_por !== user.id) {
                showToast(newNotif.titulo, newNotif.mensaje, "alert");
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
    <NotificationContext.Provider value={{ showToast, onlineCount, activityLog, fetchNotifications }}>
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
