import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, ClipPath, Path, G, Rect } from "react-native-svg";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/theme";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./AuthModal";

interface HeaderProps {
  showCompleted: boolean;
  onToggleStatus: (showCompleted: boolean) => void;
  activeCount: number;
  completedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  showCompleted,
  onToggleStatus,
  activeCount,
  completedCount,
}) => {
  const router = useRouter();
  const { onlineCount, activityLog, unreadCount, markNotificationsAsRead, fetchNotifications } = useNotifications();
  const { user } = useAuth();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Al abrir el modal de la campana 🔔, realizar la consulta directa a Supabase
  React.useEffect(() => {
    if (showLogModal) {
      fetchNotifications();
    }
  }, [showLogModal, fetchNotifications]);

  const handleOpenNotifications = () => {
    setShowLogModal(true);
    markNotificationsAsRead();
    fetchNotifications();
  };

  const getLogIconConfig = (log: any) => {
    if (log.tipo_evento === "CONTRIBUCION") {
      return { name: "hand-left" as const, color: "#059669", bg: "#ECFDF5" };
    }
    if (log.tipo_evento === "NUEVO_EVENTO") {
      return { name: "sparkles" as const, color: COLORS.primary, bg: COLORS.primaryLight };
    }
    switch (log.type) {
      case "success":
        return { name: "checkmark-circle" as const, color: COLORS.secondary, bg: COLORS.secondaryLight };
      case "alert":
        return { name: "megaphone" as const, color: COLORS.primary, bg: COLORS.primaryLight };
      case "delete":
        return { name: "trash" as const, color: "#64748B", bg: "#F1F5F9" };
      default:
        return { name: "information-circle" as const, color: COLORS.accentBlue, bg: COLORS.accentBlueLight };
    }
  };

  const handleNotifPress = (log: any) => {
    console.log("Notificación tocada:", log);
    setShowLogModal(false);
    markNotificationsAsRead();

    let targetId = log.necesidad_id;
    if (!targetId && typeof log.id === "string" && log.id.startsWith("need-notif-")) {
      targetId = log.id.replace("need-notif-", "");
    }

    if (targetId) {
      const isContribución = log.tipo_evento === "CONTRIBUCION" || log.type === "success";
      if (isContribución) {
        router.push({
          pathname: "/detail/[id]",
          params: { id: targetId, scrollTo: "logistica" },
        });
      } else {
        router.push(`/detail/${targetId}`);
      }
    } else {
      console.warn("La notificación seleccionada no contiene un necesidad_id válido.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Banner Branding: Logo + Nombre */}
      <View style={styles.topRow}>
        <View style={styles.logoBadge}>
          <Svg width={28} height={28} viewBox="0 0 200 200">
            <Defs>
              <ClipPath id="heartClip">
                <Path d="M100,180 C40,120 10,80 10,55 C10,25 35,5 60,5 C80,5 95,20 100,40 C105,20 120,5 140,5 C165,5 190,25 190,55 C190,80 160,120 100,180 Z" />
              </ClipPath>
            </Defs>
            <G clipPath="url(#heartClip)">
              <Rect x="0" y="0" width="200" height="92.5" fill="#FCD116" />
              <Rect x="0" y="92.5" width="200" height="43.75" fill="#003893" />
              <Rect x="0" y="136.25" width="200" height="63.75" fill="#CE1126" />
            </G>
            <Path
              d="M100,180 C40,120 10,80 10,55 C10,25 35,5 60,5 C80,5 95,20 100,40 C105,20 120,5 140,5 C165,5 190,25 190,55 C190,80 160,120 100,180 Z"
              fill="none"
              stroke="#00000022"
              strokeWidth={1}
            />
            <G transform="translate(100,97) scale(0.52) translate(-100,-97)">
              <Path
                d="M100,180 C40,120 10,80 10,55 C10,25 35,5 60,5 C80,5 95,20 100,40 C105,20 120,5 140,5 C165,5 190,25 190,55 C190,80 160,120 100,180 Z"
                fill="#FFFFFF"
              />
            </G>
          </Svg>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.brandTitle}>Hu-Manos Colombia</Text>
        </View>

        <View style={styles.rightHeaderButtons}>
          {/* Botón de Perfil de Usuario */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.userProfileButton}
            onPress={() => setShowAuthModal(true)}
          >
            <Ionicons name="person-circle" size={24} color={user?.metodo_auth === "GOOGLE" ? "#EA4335" : COLORS.primary} />
          </TouchableOpacity>

          {/* Botón de Campana de Notificaciones */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.bellButton}
            onPress={handleOpenNotifications}
          >
            <Ionicons name="notifications" size={20} color={COLORS.text} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Autenticación / Registro */}
      <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Selector de Estado Rápido: Activas vs Cubiertas */}
      <View style={styles.tabSelectorContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tabButton, !showCompleted && styles.activeTabButton]}
          onPress={() => onToggleStatus(false)}
        >
          <Text
            style={[
              styles.tabText,
              !showCompleted ? styles.activeTabText : styles.inactiveTabText,
            ]}
          >
            🚨 Activas ({activeCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tabButton, showCompleted && styles.completedTabButton]}
          onPress={() => onToggleStatus(true)}
        >
          <Text
            style={[
              styles.tabText,
              showCompleted ? styles.completedTabText : styles.inactiveTabText,
            ]}
          >
            ✅ Cubiertas ({completedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Historial de Notificaciones de la Comunidad */}
      <Modal
        visible={showLogModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="notifications-sharp" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Feed de Actividad Comunitaria</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLogModal(false)} style={styles.closeIconBtn}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {activityLog.length === 0 ? (
                <View style={styles.emptyLog}>
                  <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyLogText}>Sin actividad reciente aún.</Text>
                  <Text style={styles.emptyLogSubtext}>
                    Las nuevas alertas de la comunidad aparecerán aquí.
                  </Text>
                </View>
              ) : (
                activityLog.map((log) => {
                  const iconConfig = getLogIconConfig(log);
                  return (
                    <TouchableOpacity
                      key={log.id}
                      activeOpacity={0.7}
                      style={styles.logItem}
                      onPress={() => handleNotifPress(log)}
                    >
                      <View style={[styles.logIcon, { backgroundColor: iconConfig.bg }]}>
                        <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
                      </View>
                      <View style={styles.logTextContainer}>
                        <Text style={styles.logTitle}>{log.title}</Text>
                        <Text style={styles.logMessage}>{log.message}</Text>
                        <Text style={styles.logTime}>{log.timestamp}</Text>
                      </View>
                      {log.necesidad_id || log.id.startsWith("need-notif-") ? (
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  titleContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  rightHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userProfileButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  tabSelectorContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedTabButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
  activeTabText: {
    color: COLORS.primary,
  },
  completedTabText: {
    color: COLORS.secondary,
  },
  inactiveTabText: {
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeIconBtn: {
    padding: 4,
  },
  modalScroll: {
    gap: 12,
    paddingBottom: 20,
  },
  emptyLog: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
  },
  emptyLogText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  emptyLogSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logTextContainer: {
    flex: 1,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  logMessage: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logTime: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "600",
  },
});
