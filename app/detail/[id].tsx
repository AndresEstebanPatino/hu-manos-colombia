import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  SafeAreaView,
  Platform,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Necesidad } from "../../src/types/need";
import { getNeeds, incrementNeedProgress, toggleNeedCompleted, getTimeAgo } from "../../src/services/storage";
import { CategoryBadge, TypeBadge, ModoBadge } from "../../src/components/StatusBadge";
import { ProgressBar } from "../../src/components/ProgressBar";
import { COLORS } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useNotifications } from "../../src/context/NotificationContext";
import { supabase, isSupabaseConfigured } from "../../src/lib/supabase";
import { ReliabilityBadge } from "../../src/components/ReliabilityBadge";
import { StarRatingDisplay } from "../../src/components/StarRatingDisplay";
import { CalificacionesList } from "../../src/components/CalificacionesList";
import { CalificarUsuarioModal } from "../../src/components/CalificarUsuarioModal";
import { ConfirmarAyudaModal } from "../../src/components/ConfirmarAyudaModal";
import { LogisticaContribucionesSection } from "../../src/components/LogisticaContribucionesSection";
import {
  puedeCalificar,
  obtenerCalificacionesDeUsuario,
  obtenerPerfilConfiabilidad,
  guardarLogisticaContribucion,
  CalificacionItem,
  UserReliabilityProfile,
  RatingEligibilityStatus,
} from "../../src/services/reliabilityService";
import { ContribucionLogistica } from "../../src/types/need";

export default function DetailScreen() {
  const { id, scrollTo } = useLocalSearchParams<{ id: string; scrollTo?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = windowWidth < 380;

  const [need, setNeed] = useState<Necesidad | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<UserReliabilityProfile | null>(null);
  const [ratings, setRatings] = useState<CalificacionItem[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [eligibility, setEligibility] = useState<RatingEligibilityStatus>("no_elegible");
  const [existingRating, setExistingRating] = useState<CalificacionItem | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasSupportedLocal, setHasSupportedLocal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [loadingItem, setLoadingItem] = useState<boolean>(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [logisticaY, setLogisticaY] = useState<number>(0);

  useEffect(() => {
    if (!user?.id || !need?.id || !isSupabaseConfigured()) return;
    supabase
      .from("contribuciones")
      .select("id")
      .eq("necesidad_id", need.id)
      .eq("usuario_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasSupportedLocal(Boolean(data));
      });
  }, [need?.id, user?.id]);

  useEffect(() => {
    async function loadItem() {
      if (!id) {
        setLoadingItem(false);
        return;
      }
      setLoadingItem(true);
      const all = await getNeeds();
      let found = all.find((n) => n.id === id);

      // Si no estaba en la lista local/paginada, intentar consulta directa a Supabase por ID
      if (!found && isSupabaseConfigured()) {
        try {
          const { data: singleData } = await supabase
            .from("necesidades")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (singleData) {
            found = singleData as Necesidad;
          }
        } catch (e) {
          console.warn("Consulta directa por ID falló:", e);
        }
      }

      if (found) {
        setNeed(found);
        // Cargar perfil de confiabilidad del creador
        if (found.creador_id) {
          obtenerPerfilConfiabilidad(found.creador_id).then(setCreatorProfile);
          setLoadingRatings(true);
          obtenerCalificacionesDeUsuario(found.creador_id, 1, 10)
            .then(setRatings)
            .finally(() => setLoadingRatings(false));
        }
      }
      setLoadingItem(false);
    }
    loadItem();
  }, [id]);

  useEffect(() => {
    async function checkEligibility() {
      if (!user?.id || !need?.id) return;
      const result = await puedeCalificar(need.id, user.id);
      setEligibility(result.status);
      if (result.calificacionExistente) {
        setExistingRating(result.calificacionExistente);
      }
    }
    if (need?.id) checkEligibility();
  }, [user?.id, need?.id]);

  // Scroll automático a la sección de logística si se solicita desde una notificación
  useEffect(() => {
    if (scrollTo === "logistica" && need) {
      const timer = setTimeout(() => {
        if (logisticaY > 0) {
          scrollViewRef.current?.scrollTo({ y: logisticaY - 15, animated: true });
        } else {
          scrollViewRef.current?.scrollTo({ y: 450, animated: true });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [scrollTo, need, logisticaY]);

  const refreshRatingsAndProfile = async () => {
    if (!need?.creador_id || !need?.id || !user?.id) return;
    obtenerPerfilConfiabilidad(need.creador_id).then(setCreatorProfile);
    obtenerCalificacionesDeUsuario(need.creador_id, 1, 10).then(setRatings);
    const result = await puedeCalificar(need.id, user.id);
    setEligibility(result.status);
    if (result.calificacionExistente) setExistingRating(result.calificacionExistente);
    else setExistingRating(null);
  };

  if (loadingItem) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.notFoundText}>Cargando información...</Text>
      </SafeAreaView>
    );
  }

  if (!need) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.notFoundCard}>
          <Ionicons name="alert-circle-outline" size={56} color={COLORS.danger} />
          <Text style={styles.notFoundTitle}>Esta publicación ya no está disponible</Text>
          <Text style={styles.notFoundSubtext}>
            La solicitud u oferta que buscas fue eliminada o cerrada por su creador.
          </Text>
          <TouchableOpacity
            style={styles.backToHomeButton}
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.85}
          >
            <Ionicons name="home" size={18} color="#FFFFFF" />
            <Text style={styles.backToHomeText}>Volver al Feed Principal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = need.completado || need.progreso_actual >= need.meta_cantidad;

  const handleIncrement = async () => {
    if (!need) return;

    // Si YA apoyó (toggle OFF / cancelar reserva): ejecutar de inmediato sin modal
    if (hasSupportedLocal) {
      setHasSupportedLocal(false);
      const res = await incrementNeedProgress(need.id, user?.id);
      if (res) setNeed(res.need);
      return;
    }

    // Si NO ha apoyado aún (toggle ON): abrir el modal opcional de logística
    setShowConfirmModal(true);
  };

  const handleConfirmWithoutDetails = async () => {
    if (!need) return;
    setShowConfirmModal(false);
    setHasSupportedLocal(true);
    const res = await incrementNeedProgress(need.id, user?.id);
    if (res) {
      setNeed(res.need);
      if (res.added && need.creador_id) {
        refreshRatingsAndProfile();
      }
    }
  };

  const handleConfirmWithDetails = async (logistica: ContribucionLogistica) => {
    if (!need) return;
    setShowConfirmModal(false);
    setHasSupportedLocal(true);
    const res = await incrementNeedProgress(need.id, user?.id);
    if (res) {
      setNeed(res.need);
      if (res.added && need.creador_id) {
        refreshRatingsAndProfile();
      }
    }
    if (user?.id) {
      const success = await guardarLogisticaContribucion(need.id, user.id, logistica);
      if (!success) {
        showToast(
          "✅ Ayuda confirmada",
          "Tu ayuda quedó confirmada, pero no pudimos guardar los detalles de logística. Puedes coordinar por WhatsApp.",
          "alert"
        );
      }
    }
  };

  const handleToggleComplete = async () => {
    const updated = await toggleNeedCompleted(need.id, !isCompleted);
    if (updated) {
      setNeed(updated);
    }
  };

  const hasWhatsApp =
    need.contacto_whatsapp &&
    need.contacto_whatsapp !== "Opcional" &&
    need.contacto_whatsapp.replace(/\D/g, "").length >= 7;

  const handleOpenWhatsApp = async () => {
    if (!hasWhatsApp) return;
    const rawNumber = need.contacto_whatsapp.replace(/\D/g, "");
    const cleanNumber = rawNumber.startsWith("57") ? rawNumber : `57${rawNumber}`;
    const message = need.modo === "OFERTA"
      ? `Hola, vi tu oferta en Hu-Manos Colombia: "${need.titulo}". Me interesa este apoyo. ¿Cómo coordinamos?`
      : `Hola, vi tu solicitud en Hu-Manos Colombia: "${need.titulo}". Quiero ayudar. ¿Cómo coordinamos?`;
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback: abrir en wa.me desde el navegador (funciona aunque no esté la app)
        await Linking.openURL(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`);
      }
    } catch {
      Alert.alert(
        "Contactar por WhatsApp",
        `Número: +${cleanNumber}`,
        [
          { text: "Cerrar", style: "cancel" },
          {
            text: "Abrir navegador",
            onPress: () => Linking.openURL(`https://wa.me/${cleanNumber}`),
          },
        ]
      );
    }
  };

  const handleOpenGoogleMaps = () => {
    if (need.latitud && need.longitud) {
      const lat = need.latitud;
      const lng = need.longitud;
      const label = need.titulo || "Ubicación Hu-Manos";
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

      if (Platform.OS === "android") {
        Linking.openURL(`geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`).catch(() => {
          Linking.openURL(googleMapsUrl);
        });
      } else if (Platform.OS === "ios") {
        Linking.openURL(`maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`).catch(() => {
          Linking.openURL(googleMapsUrl);
        });
      } else {
        Linking.openURL(googleMapsUrl);
      }
    } else {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(need.ubicacion)}`;
      Linking.openURL(googleMapsUrl);
    }
  };

  const handleShare = async () => {
    if (!need) return;
    const shareMessage = need.modo === "OFERTA"
      ? `🎁 *OFERTA DE APOYO - HU-MANOS COLOMBIA* 🎁\n\n*Oferta:* ${need.titulo}\n📍 *Ubicación:* ${need.ubicacion}\n📊 *Disponibilidad:* ${need.progreso_actual} de ${need.meta_cantidad} ${need.unidad_medida || "unidades"} reclamados\n\nVer oferta en la app: https://hu-manos-colombia.app/detail/${need.id}`
      : `🚨 *HU-MANO COLOMBIA* 🚨\n\n*Solicitud:* ${need.titulo}\n📍 *Ubicación:* ${need.ubicacion}\n📊 *Progreso:* ${need.progreso_actual} de ${need.meta_cantidad}\n\nVer evento en la app: https://hu-manos-colombia.app/detail/${need.id}`;
    try {
      await Share.share({ title: need.titulo, message: shareMessage });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar con Botón para Regresar */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/(tabs)");
            }
          }}
        >
          <Ionicons name="arrow-back-sharp" size={22} color={COLORS.primary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.navBarTitle}>
          {need.modo === "OFERTA" ? "Detalle de Oferta" : "Detalle de Solicitud"}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
      >
        {/* Header Badges */}
        <View style={styles.badgeRow}>
          <ModoBadge modo={need.modo} />
          <CategoryBadge category={need.categoria} />
          <TypeBadge type={need.tipo} />
          <Text style={styles.timeText}>{getTimeAgo(need.creado_en)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{need.titulo}</Text>

        {/* Imagen principal de la necesidad */}
        {need.imagen_url ? (
          <View style={styles.detailImageContainer}>
            <Image
              source={{ uri: need.imagen_url }}
              style={styles.detailImage}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Location Banner */}
        <View style={styles.locationBanner}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>Ubicación en Colombia</Text>
            <Text style={styles.locationText}>{need.ubicacion}</Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.sectionHeader}>
            {need.modo === "OFERTA" ? "Estado de la Oferta de Ayuda" : "Estado del Apoyo Comunitario"}
          </Text>
          <ProgressBar
            current={need.progreso_actual}
            total={need.meta_cantidad}
            unit={need.unidad_medida || (need.modo === "OFERTA" ? "unidades" : "ayudas")}
            isCompleted={isCompleted}
            modo={need.modo}
          />
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Descripción y Detalles</Text>
          <Text style={styles.descriptionText}>
            {need.descripcion || "No hay detalles adicionales provistos."}
          </Text>
        </View>

        {/* Tarjeta de Navegación GPS / Google Maps */}
        <View style={styles.mapPreviewCard}>
          <View style={styles.mapIconCircle}>
            <Ionicons name="location-sharp" size={26} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mapTitle}>Punto de Acopio / Coordenadas GPS</Text>
            <Text style={styles.mapSubtitle} numberOfLines={1}>{need.ubicacion}</Text>
            {need.latitud && need.longitud ? (
              <Text style={styles.mapCoordsText}>
                GPS: {need.latitud.toFixed(4)}, {need.longitud.toFixed(4)}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.openMapButton}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate" size={18} color="#FFFFFF" />
            <Text style={styles.openMapText}>Cómo Llegar</Text>
          </TouchableOpacity>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.actionSection}>
          {!isCompleted ? (
            <TouchableOpacity style={styles.sumoButton} onPress={handleIncrement}>
              <Ionicons
                name={hasSupportedLocal ? "checkmark-circle" : need.modo === "OFERTA" ? "download-outline" : "add-circle"}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.sumoText}>
                {need.modo === "OFERTA"
                  ? hasSupportedLocal
                    ? "✓ Ya Reservaste (Toca para cancelar)"
                    : "📥 Lo necesito / Reservar"
                  : hasSupportedLocal
                  ? "✓ Ya Te Sumaste (Toca para remover)"
                  : "🙋 Confirmar que voy a ayudar"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.resolvedBanner}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
              <Text style={styles.resolvedText}>
                {need.modo === "OFERTA" ? "¡Esta oferta ha sido 100% Agotada!" : "¡Esta solicitud ha sido 100% Cubierta!"}
              </Text>
            </View>
          )}

          {hasWhatsApp && (
            <TouchableOpacity style={styles.whatsappButton} onPress={handleOpenWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.whatsappText}>Contactar por WhatsApp Directo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.text} />
            <Text style={styles.shareText}>Compartir con la Comunidad</Text>
          </TouchableOpacity>

          {user?.id === need.creador_id && (
            <>
              <TouchableOpacity style={styles.toggleCompleteButton} onPress={handleToggleComplete}>
                <Ionicons
                  name={isCompleted ? "refresh" : "checkmark-done"}
                  size={18}
                  color={COLORS.textMuted}
                />
                <Text style={styles.toggleCompleteText}>
                  {isCompleted
                    ? need.modo === "OFERTA" ? "Reabrir Oferta" : "Reactivar Solicitud"
                    : need.modo === "OFERTA" ? "Marcar Oferta como Agotada por el Creador" : "Marcar como Cubierto por el Creador"}
                </Text>
              </TouchableOpacity>

              {/* Sección exclusiva del Creador: Personas que confirmaron ayuda y logística */}
              <View
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  if (y > 0) setLogisticaY(y);
                }}
              >
                <LogisticaContribucionesSection necesidadId={need.id} modo={need.modo} />
              </View>
            </>
          )}
        </View>

        {/* ── Sección de Confiabilidad del Publicador ── */}
        {need.creador_id && (
          <View style={styles.reliabilitySection}>
            <Text style={styles.sectionHeader}>Confiabilidad del Publicador</Text>

            {/* Perfil de confiabilidad: Badge + Estrellas */}
            <View style={styles.reliabilityHeader}>
              <ReliabilityBadge
                level={creatorProfile?.reliability_level || "nuevo"}
                averageRating={creatorProfile?.average_rating || 0}
                totalRatings={creatorProfile?.total_ratings || 0}
              />
              <StarRatingDisplay
                rating={creatorProfile?.average_rating || 0}
                totalRatings={creatorProfile?.total_ratings || 0}
                size={15}
              />
            </View>

            {/* Botón de calificación (solo si eligibilidad lo permite) */}
            {(eligibility === "puede_calificar" || eligibility === "ya_califico") && (
              <TouchableOpacity
                style={[
                  styles.rateButton,
                  eligibility === "ya_califico" && styles.rateButtonEditing,
                ]}
                onPress={() => setShowRatingModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={eligibility === "ya_califico" ? "pencil" : "star"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.rateButtonText}>
                  {eligibility === "ya_califico"
                    ? "Editar Mi Evaluación"
                    : "Calificar al Publicador"}
                </Text>
              </TouchableOpacity>
            )}

            {eligibility === "no_elegible" && (
              <View style={styles.eligibilityNotice}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.eligibilityText}>
                  {need.modo === "OFERTA"
                    ? "Solo los beneficiarios con reservaciones confirmadas en esta oferta pueden calificar."
                    : "Solo los voluntarios con contribuciones confirmadas en este evento pueden calificar."}
                </Text>
              </View>
            )}

            {/* Lista paginada de calificaciones */}
            <Text style={styles.ratingsListTitle}>
              Evaluaciones de la Comunidad ({creatorProfile?.total_ratings || 0})
            </Text>
            <CalificacionesList ratings={ratings} loading={loadingRatings} />
          </View>
        )}
      </ScrollView>

      {/* Modal opcional de logística y coordinación */}
      <ConfirmarAyudaModal
        visible={showConfirmModal}
        modo={need.modo}
        tituloNecesidad={need.titulo}
        onClose={() => setShowConfirmModal(false)}
        onConfirmWithoutDetails={handleConfirmWithoutDetails}
        onConfirmWithDetails={handleConfirmWithDetails}
      />

      {/* Modal de Calificación */}
      {need.creador_id && user?.id && (
        <CalificarUsuarioModal
          visible={showRatingModal}
          necesidadId={need.id}
          calificadoId={need.creador_id}
          calificadorId={user.id}
          calificacionExistente={existingRating}
          onClose={() => setShowRatingModal(false)}
          onSuccess={refreshRatingsAndProfile}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  navBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: "auto",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 28,
  },
  detailImageContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailImage: {
    width: "100%",
    height: 220,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  progressCard: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  mapPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  mapSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  mapCoordsText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "700",
    marginTop: 2,
  },
  openMapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  openMapText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  actionSection: {
    marginTop: 8,
    gap: 10,
  },
  sumoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sumoText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  resolvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondaryLight,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  resolvedText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "800",
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.whatsappGreen,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  whatsappText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shareText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  toggleCompleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  toggleCompleteText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  reliabilitySection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    marginTop: 8,
  },
  reliabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  rateButtonEditing: {
    backgroundColor: COLORS.primary,
  },
  rateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  eligibilityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  eligibilityText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  ratingsListTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
  },
  notFoundCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  notFoundSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  backToHomeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    width: "100%",
  },
  backToHomeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

