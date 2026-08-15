import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Necesidad } from "../types/need";
import { CategoryBadge, TypeBadge, ModoBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { getTimeAgo, voteTrustNeed } from "../services/storage";
import { COLORS } from "../constants/theme";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { ReliabilityBadge } from "./ReliabilityBadge";
import { ReportModal } from "./ReportModal";
import { ConfirmarAyudaModal } from "./ConfirmarAyudaModal";
import {
  obtenerPerfilConfiabilidad,
  guardarLogisticaContribucion,
  UserReliabilityProfile,
} from "../services/reliabilityService";
import { ContribucionLogistica } from "../types/need";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

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

  const [votosCount, setVotosCount] = useState<number>(need.votos_confianza || 0);
  const [votosIds, setVotosIds] = useState<string[]>(need.voto_confianza_ids || []);
  const [spamCount, setSpamCount] = useState<number>(need.reportes_spam || 0);
  const [creatorProfile, setCreatorProfile] = React.useState<UserReliabilityProfile | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // hasSupported: ¿el usuario actual ya reservó/se sumó a esta necesidad?
  // Se inicializa desde apoyantes_ids (disponible tras la migración SQL) y se
  // sincroniza con la tabla contribuciones para mayor precisión.
  const [hasSupportedLocal, setHasSupportedLocal] = useState<boolean>(
    Boolean(user?.id && (need.apoyantes_ids as string[] | undefined)?.includes(user.id))
  );

  React.useEffect(() => {
    if (need.creador_id) {
      obtenerPerfilConfiabilidad(need.creador_id).then(setCreatorProfile);
    }
  }, [need.creador_id]);

  // Verificar en Supabase si el usuario ya aportó (fuente de verdad definitiva)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    supabase
      .from("contribuciones")
      .select("id")
      .eq("necesidad_id", need.id)
      .eq("usuario_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasSupportedLocal(Boolean(data));
      });
  }, [need.id, user?.id]);

  const isClosedManually = Boolean(need.completado);
  const isMetaReached = need.progreso_actual >= need.meta_cantidad;
  // hasSupportedLocal (local state) es la fuente de verdad en UI.
  // Se sincroniza contra contribuciones vía useEffect arriba.
  const hasSupported = hasSupportedLocal;
  const hasVotedTrust = Boolean(user?.id && votosIds.includes(user.id));

  const hasValidPhone = Boolean(
    need.contacto_whatsapp &&
    need.contacto_whatsapp !== "Opcional" &&
    need.contacto_whatsapp.replace(/\D/g, "").length >= 7
  );

  const isOferta = need.modo === "OFERTA";
  const eventShareUrl = `https://andrestebanpatino.github.io/hu-manos-colombia/ir/?id=${need.id}`;

  const eventShareMessage = isOferta
    ? `🎁 *OFERTA DE APOYO - HU-MANOS COLOMBIA* 🎁\n\n` +
      `📌 *Oferta:* ${need.titulo}\n` +
      `📍 *Ubicación:* ${need.ubicacion}\n` +
      `📊 *Disponibilidad:* ${need.progreso_actual} de ${need.meta_cantidad} ${need.unidad_medida || "unidades"} reclamados\n` +
      (need.descripcion ? `📝 *Detalles:* ${need.descripcion}\n` : "") +
      `\n👉 *Ver oferta y reservarla aquí:* ${eventShareUrl}\n\n` +
      `*Hu-Manos Colombia - Una mano para quien lo necesita*`
    : `🚨 *SOLICITUD DE AYUDA - HU-MANOS COLOMBIA* 🚨\n\n` +
      `📌 *Solicitud:* ${need.titulo}\n` +
      `📍 *Ubicación:* ${need.ubicacion}\n` +
      `📊 *Progreso:* ${need.progreso_actual} de ${need.meta_cantidad} ${need.unidad_medida || "ayudas"}\n` +
      (need.descripcion ? `📝 *Detalles:* ${need.descripcion}\n` : "") +
      `\n👉 *Ver evento y sumarte aquí:* ${eventShareUrl}\n\n` +
      `*Hu-Manos Colombia - Una mano para quien lo necesita*`;

  const handleOpenWhatsApp = async () => {
    if (hasValidPhone) {
      const rawNumber = need.contacto_whatsapp.replace(/\D/g, "");
      const cleanNumber = rawNumber.startsWith("57") ? rawNumber : `57${rawNumber}`;
      const message = isOferta
        ? `Hola, vi tu oferta en Hu-Manos Colombia: "${need.titulo}". Me interesa reservarla / recibir este apoyo.\n\nEnlace: ${eventShareUrl}`
        : `Hola, vi tu solicitud en Hu-Manos Colombia: "${need.titulo}". Quiero ayudar.\n\nEnlace al evento: ${eventShareUrl}`;
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
      const broadcastUrl = `https://wa.me/?text=${encodeURIComponent(eventShareMessage)}`;
      Linking.openURL(broadcastUrl).catch(() => {
        handleShare();
      });
    }
  };

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

  // Voto de confianza de la comunidad ("Confirmar caso real 👍")
  const handleVoteTrust = async () => {
    const userId = user?.id || `guest-${Date.now()}`;
    const res = await voteTrustNeed(need.id, userId);
    if (res) {
      setVotosCount(res.votos_confianza || 0);
      setVotosIds(res.voto_confianza_ids || []);
      showToast(
        hasVotedTrust ? "👍 Voto removido" : "🛡️ Caso Respaldado",
        hasVotedTrust ? "Has retirado tu confirmación de veracidad." : "Gracias por confirmar que este caso es real.",
        "success"
      );
    }
  };

  // Apertura del flujo formal de reporte
  const handleReportScam = () => {
    // Validar requerimiento obligatorio de usuario autenticado o anónimo con ID de Auth
    if (!user?.id) {
      Alert.alert(
        "Inicio de Sesión Requerido",
        "Debes tener una sesión activa para poder reportar una solicitud por posible estafa o información falsa.",
        [{ text: "Entendido", style: "default" }]
      );
      return;
    }

    setShowReportModal(true);
  };

  const esCreador = Boolean(user?.id && need.creador_id === user.id);

  const handlePressIncrement = () => {
    const userId = user?.id;
    if (userId && need.creador_id === userId) {
      Alert.alert(
        "Acción no permitida",
        "No puedes confirmar ayuda en tu propia publicación."
      );
      return;
    }

    if (!userId) {
      // Si no está autenticado, llamar igual a onIncrement (gestiona el aviso de login)
      onIncrement(need.id, undefined);
      return;
    }

    // Si YA había apoyado (toggle OFF / cancelar reserva): ejecutar de inmediato sin modal
    if (hasSupportedLocal) {
      setHasSupportedLocal(false);
      onIncrement(need.id, userId);
      return;
    }

    // Si NO ha apoyado aún (toggle ON): abrir el modal opcional de logística
    setShowConfirmModal(true);
  };

  const handleConfirmWithoutDetails = () => {
    const userId = user?.id;
    if (!userId) return;
    setShowConfirmModal(false);
    setHasSupportedLocal(true);
    onIncrement(need.id, userId);
  };

  const handleConfirmWithDetails = async (logistica: ContribucionLogistica) => {
    const userId = user?.id;
    if (!userId) return;
    setShowConfirmModal(false);
    setHasSupportedLocal(true);
    onIncrement(need.id, userId);
    const success = await guardarLogisticaContribucion(need.id, userId, logistica);
    if (!success) {
      showToast(
        "✅ Ayuda confirmada",
        "Tu ayuda quedó confirmada, pero no pudimos guardar los detalles de logística. Puedes coordinar por WhatsApp.",
        "alert"
      );
    }
  };

  const handleConfirmDelete = () => {
    if (!user?.id || need.creador_id !== user.id) {
      Alert.alert("Acceso denegado", "Solo el creador de esta necesidad puede eliminarla.");
      return;
    }

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
    <View style={[styles.card, need.modo === "OFERTA" && styles.ofertaCard, isClosedManually && styles.completedCard]}>
      <View style={styles.cardContent}>
        {/* Header Row: Modo Badge + Category Badge + Type Badge + Time Ago */}
        <View style={styles.topMetaRow}>
          <View style={styles.badgeGroup}>
            <ModoBadge modo={need.modo} />
            <CategoryBadge category={need.categoria} />
            <TypeBadge type={need.tipo} />
          </View>
          <View style={styles.topRightActions}>
            <Text style={styles.timeAgoText}>{getTimeAgo(need.creado_en)}</Text>
            {onDelete && Boolean(user?.id && need.creador_id === user.id) && (
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

        {/* Sistema de Confiabilidad: Insignia de Verificación + Voto Vecinal */}
        <View style={styles.trustRow}>
          <ReliabilityBadge
            level={creatorProfile?.reliability_level || (need.creador_verificado ? "confiable" : "nuevo")}
            averageRating={creatorProfile?.average_rating || 0}
            totalRatings={creatorProfile?.total_ratings || 0}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.trustVoteBtn, hasVotedTrust && styles.trustVoteBtnActive]}
            onPress={handleVoteTrust}
          >
            <Ionicons name={hasVotedTrust ? "thumbs-up" : "thumbs-up-outline"} size={13} color={hasVotedTrust ? COLORS.primary : "#64748B"} />
            <Text style={[styles.trustVoteText, hasVotedTrust && styles.trustVoteTextActive]}>
              {votosCount > 0 ? `👍 ${votosCount} Caso verificado por vecinos` : "Confirmar caso real"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Advertencia si la solicitud tiene 3 o más reportes de la comunidad */}
        {spamCount >= 3 && (
          <View style={styles.scamWarningBanner}>
            <Ionicons name="warning-sharp" size={15} color="#DC2626" />
            <Text style={styles.scamWarningText}>
              ⚠️ ADVERTENCIA ANTI-ESTAFAS: Esta solicitud tiene {spamCount} reporte(s) por sospecha. NUNCA transfieras dinero a cuentas personales.
            </Text>
          </View>
        )}

        {/* Title */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onPressDetail && onPressDetail(need.id)}
        >
          <Text style={[styles.title, isClosedManually && styles.completedTitleText]}>
            {need.titulo}
          </Text>
          {/* Medida / Unidad como metadata secundaria */}
          {need.unidad_medida ? (
            <Text style={styles.unitMetaText}>
              {need.meta_cantidad} {need.unidad_medida}
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Imagen opcional de la necesidad */}
        {need.imagen_url ? (
          <Image
            source={{ uri: need.imagen_url }}
            style={styles.needImage}
            resizeMode="cover"
          />
        ) : null}

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
          unit={need.unidad_medida || (isOferta ? "unidades" : "ayudas")}
          isCompleted={isClosedManually}
          modo={need.modo}
        />

        {/* Banner Informativo si la Meta está Cubierta pero el evento no se ha cerrado */}
        {isMetaReached && !isClosedManually && (
          <View style={styles.metaReachedBanner}>
            <Ionicons name="checkmark-done-circle" size={16} color={COLORS.secondary} />
            <Text style={styles.metaReachedText}>
              {isOferta
                ? `¡Oferta de ${need.unidad_medida || "unidades"} totalmente reservada/agotada!`
                : `¡Meta de ${need.unidad_medida || "ayudas"} alcanzada! Si alguien cancela, la solicitud permanece visible.`}
            </Text>
          </View>
        )}

        {/* Main Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Primary Action Button */}
          {!isClosedManually ? (
            esCreador ? (
              <View style={styles.ownNeedBanner}>
                <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.ownNeedBannerText}>
                  📍 Tu publicación (gestiónala desde tu perfil / Mis Alertas)
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.sumoButton, hasSupported && styles.supportedButton]}
                onPress={handlePressIncrement}
              >
                <Ionicons
                  name={hasSupported ? "checkmark-circle" : isOferta ? "download-outline" : "add-circle"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.sumoButtonText}>
                  {isOferta
                    ? hasSupported
                      ? "✓ Ya Reservaste (Toca para cancelar)"
                      : "📥 Lo necesito / Reservar"
                    : hasSupported
                    ? "✓ Ya Te Sumaste (Toca para remover)"
                    : "🙋 Confirmar que voy a ayudar"}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.completedBanner}>
              <Ionicons name="lock-closed" size={18} color={COLORS.secondary} />
              <Text style={styles.completedBannerText}>
                {isOferta ? "✅ Oferta Agotada / Cerrada por el Creador" : "✅ Necesidad Cubierta / Cerrada por el Creador"}
              </Text>
            </View>
          )}

          {/* Quick Contact, Share & Report Buttons */}
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
              <Ionicons name="share-social" size={18} color={COLORS.text} />
              <Text style={styles.shareButtonText}>Compartir Evento</Text>
            </TouchableOpacity>

            {/* Report Scam Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.reportButton}
              onPress={handleReportScam}
            >
              <Ionicons name="flag-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón de Cierre Manual solo para el creador del evento */}
        {user?.id && need.creador_id === user.id && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.creatorCloseBtn, isClosedManually && styles.creatorOpenBtn]}
            onPress={() => onToggleComplete(need.id, !isClosedManually)}
          >
            <Ionicons
              name={isClosedManually ? "refresh-circle-outline" : "checkmark-circle-outline"}
              size={18}
              color={isClosedManually ? COLORS.primary : COLORS.secondary}
            />
            <Text style={[styles.creatorCloseText, isClosedManually && styles.creatorOpenText]}>
              {isClosedManually
                ? isOferta
                  ? "Reabrir Oferta para la Comunidad"
                  : "Reabrir Solicitud para la Comunidad"
                : isOferta
                ? "Marcar Oferta como Agotada / Cerrada"
                : "Marcar Necesidad como Cubierta / Cerrada"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal formal de reportes */}
      <ReportModal
        visible={showReportModal}
        necesidadId={need.id}
        necesidadTitulo={need.titulo}
        userId={user?.id || ""}
        onClose={() => setShowReportModal(false)}
        onSuccess={(newCount) => {
          if (typeof newCount === "number") {
            setSpamCount(newCount);
          }
        }}
      />

      {/* Modal opcional de logística y coordinación */}
      <ConfirmarAyudaModal
        visible={showConfirmModal}
        modo={need.modo}
        tituloNecesidad={need.titulo}
        onClose={() => setShowConfirmModal(false)}
        onConfirmWithoutDetails={handleConfirmWithoutDetails}
        onConfirmWithDetails={handleConfirmWithDetails}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  completedCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    opacity: 0.92,
  },
  ofertaCard: {
    borderLeftWidth: 5,
    borderLeftColor: "#059669",
    borderColor: "#A7F3D0",
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  cardContent: {
    padding: 16,
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
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeAgoText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  deleteIconButton: {
    padding: 4,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  unverifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  trustVoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  trustVoteBtnActive: {
    backgroundColor: COLORS.primaryLight,
  },
  trustVoteText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  trustVoteTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  scamWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    gap: 8,
  },
  scamWarningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#991B1B",
    lineHeight: 15,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 23,
    marginBottom: 6,
  },
  completedTitleText: {
    color: "#64748B",
    textDecorationLine: "line-through",
  },
  unitMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginTop: -4,
    marginBottom: 4,
  },
  needImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "700",
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  metaReachedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  metaReachedText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
    flex: 1,
  },
  actionsContainer: {
    marginTop: 14,
    gap: 10,
  },
  sumoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  supportedButton: {
    backgroundColor: COLORS.secondary,
  },
  sumoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondaryLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  completedBannerText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  whatsappButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.whatsappGreen,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  whatsappButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  shareButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  reportButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  creatorCloseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
  },
  creatorCloseText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: "700",
  },
  creatorOpenBtn: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  creatorOpenText: {
    color: COLORS.primary,
  },
  ownNeedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 8,
  },
  ownNeedBannerText: {
    color: COLORS.primaryDark,
    fontSize: 12.5,
    fontWeight: "700",
  },
});
