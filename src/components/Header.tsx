import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const { onlineCount, activityLog, fetchNotifications } = useNotifications();
  const { user } = useAuth();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Al abrir el modal de la campana 🔔, realizar la consulta directa a Supabase
  React.useEffect(() => {
    if (showLogModal) {
      fetchNotifications();
    }
  }, [showLogModal, fetchNotifications]);

  return (
    <View style={styles.container}>
      {/* Top Banner Branding */}
      <View style={styles.topRow}>
        <View style={styles.logoBadge}>
          <Ionicons name="heart" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.titleContainer}>
          <View style={styles.titleWithPresence}>
            <Text style={styles.brandTitle}>Hu-Manos Colombia</Text>
            {/* Indicador de Usuarios en Línea */}
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{onlineCount} en línea</Text>
            </View>
          </View>
          <Text style={styles.brandSlogan}>"Una mano para quien lo necesita"</Text>
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

          {/* Botón de Campana de Notificaciones de la Comunidad */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.bellButton}
            onPress={() => setShowLogModal(true)}
          >
            <Ionicons name="notifications" size={20} color={COLORS.text} />
            {activityLog.length > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{activityLog.length}</Text>
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
          <Ionicons
            name="alert-circle"
            size={18}
            color={!showCompleted ? COLORS.primary : COLORS.textMuted}
          />
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
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={showCompleted ? COLORS.secondary : COLORS.textMuted}
          />
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
                activityLog.map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <View
                      style={[
                        styles.logIcon,
                        {
                          backgroundColor:
                            log.type === "success"
                              ? COLORS.secondaryLight
                              : log.type === "alert"
                              ? COLORS.primaryLight
                              : log.type === "delete"
                              ? "#F1F5F9"
                              : COLORS.accentBlueLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          log.type === "success"
                            ? "checkmark-circle"
                            : log.type === "alert"
                            ? "megaphone"
                            : log.type === "delete"
                            ? "trash"
                            : "information-circle"
                        }
                        size={18}
                        color={
                          log.type === "success"
                            ? COLORS.secondary
                            : log.type === "alert"
                            ? COLORS.primary
                            : log.type === "delete"
                            ? "#64748B"
                            : COLORS.accentBlue
                        }
                      />
                    </View>
                    <View style={styles.logTextContainer}>
                      <Text style={styles.logTitle}>{log.title}</Text>
                      <Text style={styles.logMessage}>{log.message}</Text>
                      <Text style={styles.logTime}>{log.timestamp}</Text>
                    </View>
                  </View>
                ))
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
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    marginBottom: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  titleContainer: {
    flex: 1,
  },
  titleWithPresence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  onlineText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  brandSlogan: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 1,
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
