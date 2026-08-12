import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Necesidad } from "../types/need";
import { CategoryBadge, TypeBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { getTimeAgo } from "../services/storage";
import { COLORS } from "../constants/theme";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { notifyNeedCompletedToSupporters } from "../services/pushNotifications";

interface NeedCardProps {
  need: Necesidad;
  onIncrement: (id: string, userId?: string) => void;
  onToggleComplete: (id: string, newStatus: boolean) => void;
  onDelete?: (id: string) => void;
  onPressDetail?: (id: string) => void;
}

export const NeedCard: React.FC<NeedCardProps> = ({
  need,
  onIncrement,
  onToggleComplete,
  onDelete,
  onPressDetail,
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  // El evento solo se cierra si completado === true (marcado manualmente por el creador)
  const isClosedManually = Boolean(need.completado);
  const isMetaReached = need.progreso_actual >= need.meta_cantidad;
  const hasSupported = Boolean(user?.id && need.apoyantes_ids?.includes(user.id));

  const hasValidPhone = Boolean(
    need.contacto_whatsapp &&
    need.contacto_whatsapp !== "Opcional" &&
    need.contacto_whatsapp.replace(/\D/g, "").length >= 7
  );

  // Enlace web / app directo al detalle de este evento específico
  const eventShareUrl = `https://hu-manos-colombia.app/detail/${need.id}`;

  const eventShareMessage = 
    `🚨 *SOLICITUD DE AYUDA - HU-MANOS COLOMBIA* 🚨\n\n` +
    `📌 *Solicitud:* ${need.titulo}\n` +
    `📍 *Ubicación:* ${need.ubicacion}\n` +
    `📊 *Progreso:* ${need.progreso_actual} de ${need.meta_cantidad} ${need.unidad_medida || "ayudas"}\n` +
    (need.descripcion ? `📝 *Detalles:* ${need.descripcion}\n` : "") +
    `\n👉 *Ver evento y sumarte aquí:* ${eventShareUrl}\n\n` +
    `*Hu-Manos Colombia - Una mano para quien lo necesita*`;

  // Contacto por WhatsApp al Creador o Compartir Evento en WhatsApp
  const handleOpenWhatsApp = async () => {
    if (hasValidPhone) {
      const rawNumber = need.contacto_whatsapp.replace(/\D/g, "");
      const cleanNumber = rawNumber.startsWith("57") ? rawNumber : `57${rawNumber}`;
      const message = `Hola, vi tu solicitud en Hu-Manos Colombia: "${need.titulo}". Quiero ayudar.\n\nEnlace al evento: ${eventShareUrl}`;
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen || Platform.OS === "web") {
          await Linking.openURL(whatsappUrl);
        } else {
          Alert.alert("WhatsApp no instalado", `Número de contacto: +${cleanNumber}`);
        }
      } catch (error) {
        Linking.openURL(whatsappUrl).catch(() => {
          Alert.alert("Contacto", `Número de WhatsApp: +${cleanNumber}`);
        });
      }
    } else {
      // Si el número era opcional, abrir WhatsApp para compartir el enlace del evento con tus contactos
      const broadcastUrl = `https://wa.me/?text=${encodeURIComponent(eventShareMessage)}`;
      Linking.openURL(broadcastUrl).catch(() => {
        handleShare();
      });
    }
  };

  // Compartir nativo (WhatsApp, Telegram, Redes) con enlace del evento
  const handleShare = async () => {
    try {
      if (Platform.OS === "web") {
        const whatsappWebUrl = `https://wa.me/?text=${encodeURIComponent(eventShareMessage)}`;
        await Linking.openURL(whatsappWebUrl);
      } else {
        await Share.share({
          title: need.titulo,
          message: eventShareMessage,
          url: eventShareUrl,
        });
      }
    } catch (error) {
      console.error("Error al compartir:", error);
    }
  };

  const handlePressIncrement = () => {
    onIncrement(need.id, user?.id);
  };

  const handleConfirmDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`¿Estás seguro de eliminar la solicitud "${need.titulo}"?`)) {
        if (onDelete) onDelete(need.id);
        showToast("🗑️ Solicitud eliminada", `La solicitud "${need.titulo}" fue eliminada.`, "delete");
      }
    } else {
      Alert.alert(
        "¿Eliminar solicitud?",
        `¿Deseas remover la solicitud "${need.titulo}" del sistema?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => {
              if (onDelete) onDelete(need.id);
              showToast("🗑️ Solicitud eliminada", `La solicitud "${need.titulo}" fue eliminada.`, "delete");
            },
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.card, isClosedManually && styles.completedCard]}>
      {/* Dynamic Colored Accent Line at the Top */}
      <View
        style={[
          styles.accentBar,
          { backgroundColor: isClosedManually ? COLORS.secondary : isMetaReached ? COLORS.flagYellow : COLORS.primary },
        ]}
      />

      <View style={styles.cardContent}>
        {/* Header Row: Category Badge + Type Badge + Time Ago */}
        <View style={styles.topMetaRow}>
          <View style={styles.badgeGroup}>
            <CategoryBadge category={need.categoria} />
            <TypeBadge type={need.tipo} />
          </View>
          <View style={styles.topRightActions}>
            <Text style={styles.timeAgoText}>{getTimeAgo(need.creado_en)}</Text>
            {onDelete && (
              <TouchableOpacity
                onPress={handleConfirmDelete}
                style={styles.deleteIconButton}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Title */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onPressDetail && onPressDetail(need.id)}
        >
          <Text style={[styles.title, isClosedManually && styles.completedTitleText]}>
            {need.titulo}
          </Text>
        </TouchableOpacity>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {need.ubicacion}
          </Text>
        </View>

        {/* Description */}
        {need.descripcion ? (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {need.descripcion}
          </Text>
        ) : null}

        {/* Visual Progress Bar */}
        <ProgressBar
          current={need.progreso_actual}
          total={need.meta_cantidad}
          unit={need.unidad_medida || "ayudas"}
          isCompleted={isClosedManually}
        />

        {/* Banner Informativo si la Meta está Cubierta pero el evento no se ha cerrado */}
        {isMetaReached && !isClosedManually && (
          <View style={styles.metaReachedBanner}>
            <Ionicons name="checkmark-done-circle" size={16} color={COLORS.secondary} />
            <Text style={styles.metaReachedText}>
              ¡Personas cubiertas! Si alguien cancela, el evento permanece abierto.
            </Text>
          </View>
        )}

        {/* Main Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Primary Action Button: Ofrecer Ayuda / Me Sumo / Ya Te Sumaste */}
          {!isClosedManually ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.sumoButton, hasSupported && styles.supportedButton]}
              onPress={handlePressIncrement}
            >
              <Ionicons
                name={hasSupported ? "checkmark-circle" : "add-circle"}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.sumoButtonText}>
                {hasSupported ? "✓ Ya Te Sumaste (Toca para remover)" : "Ofrecer Ayuda / Me Sumo"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBanner}>
              <Ionicons name="lock-closed" size={18} color={COLORS.secondary} />
              <Text style={styles.completedBannerText}>Solicitud Cerrada por el Creador</Text>
            </View>
          )}

          {/* Quick Contact & Share Buttons */}
          <View style={styles.secondaryActionsRow}>
            {/* WhatsApp Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.whatsappButton}
              onPress={handleOpenWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.whatsappButtonText}>WhatsApp</Text>
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={18} color={COLORS.text} />
              <Text style={styles.shareButtonText}>Compartir</Text>
            </TouchableOpacity>

            {/* Toggle Status (Cerrar / Reactivar solicitud manualmente) */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.toggleStatusButton}
              onPress={() => {
                onToggleComplete(need.id, !isClosedManually);
                if (!isClosedManually) {
                  showToast("🔒 Solicitud Cerrada", `"${need.titulo}" fue movida a Cubiertas.`, "success");
                  // Disparar Notificación Push a los voluntarios/apoyantes
                  if (need.apoyantes_ids && need.apoyantes_ids.length > 0) {
                    notifyNeedCompletedToSupporters(need.titulo, need.id, need.apoyantes_ids);
                  }
                } else {
                  showToast("🚨 Solicitud Reactivada", `"${need.titulo}" fue reabierta.`, "info");
                }
              }}
            >
              <Ionicons
                name={isClosedManually ? "refresh-outline" : "checkmark-circle-outline"}
                size={18}
                color={isClosedManually ? COLORS.primary : COLORS.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  cardContent: {
    padding: 14,
  },
  topMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeAgoText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  deleteIconButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  completedTitleText: {
    color: "#475569",
    textDecorationLine: "line-through",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryDark,
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaReachedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 6,
    gap: 6,
  },
  metaReachedText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.secondary,
    flex: 1,
  },
  actionsContainer: {
    marginTop: 8,
    gap: 8,
  },
  sumoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  supportedButton: {
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
  },
  sumoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondaryLight,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  completedBannerText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  whatsappButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.whatsappGreen,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 6,
  },
  whatsappButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  shareButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 6,
  },
  shareButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  toggleStatusButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
