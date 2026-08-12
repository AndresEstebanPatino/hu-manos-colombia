import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Necesidad } from "../../src/types/need";
import { getNeeds, incrementNeedProgress, toggleNeedCompleted, getTimeAgo } from "../../src/services/storage";
import { CategoryBadge, TypeBadge } from "../../src/components/StatusBadge";
import { ProgressBar } from "../../src/components/ProgressBar";
import { COLORS } from "../../src/constants/theme";

import { useAuth } from "../../src/context/AuthContext";

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [need, setNeed] = useState<Necesidad | null>(null);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      const all = await getNeeds();
      const found = all.find((n) => n.id === id);
      if (found) {
        setNeed(found);
      }
    }
    loadItem();
  }, [id]);

  if (!need) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFoundText}>Cargando información...</Text>
      </SafeAreaView>
    );
  }

  const isCompleted = need.completado || need.progreso_actual >= need.meta_cantidad;

  const handleIncrement = async () => {
    const res = await incrementNeedProgress(need.id, user?.id);
    if (res) {
      setNeed(res.need);
    }
  };

  const handleToggleComplete = async () => {
    const updated = await toggleNeedCompleted(need.id, !isCompleted);
    if (updated) {
      setNeed(updated);
    }
  };

  const handleOpenWhatsApp = () => {
    const rawNumber = need.contacto_whatsapp.replace(/\D/g, "");
    const cleanNumber = rawNumber.startsWith("57") ? rawNumber : `57${rawNumber}`;
    const message = `Hola, vi tu solicitud en Hu-Mano Colombia: "${need.titulo}". Quiero ayudar. ¿Cómo coordinamos?`;
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert("Contacto", `Número de contacto: +${cleanNumber}`);
    });
  };

  const handleShare = async () => {
    const shareMessage = `🚨 *HU-MANO COLOMBIA* 🚨\n\n*Solicitud:* ${need.titulo}\n📍 *Ubicación:* ${need.ubicacion}\n📊 *Progreso:* ${need.progreso_actual} de ${need.meta_cantidad}\n\nContacta por WhatsApp: https://wa.me/${need.contacto_whatsapp.replace(/\D/g, "")}`;
    await Share.share({ title: need.titulo, message: shareMessage });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Badges */}
        <View style={styles.badgeRow}>
          <CategoryBadge category={need.categoria} />
          <TypeBadge type={need.tipo} />
          <Text style={styles.timeText}>{getTimeAgo(need.creado_en)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{need.titulo}</Text>

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
          <Text style={styles.sectionHeader}>Estado del Apoyo Comunitario</Text>
          <ProgressBar
            current={need.progreso_actual}
            total={need.meta_cantidad}
            unit={need.unidad_medida || "ayudas"}
            isCompleted={isCompleted}
          />
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Descripción y Detalles</Text>
          <Text style={styles.descriptionText}>
            {need.descripcion || "No hay detalles adicionales provistos."}
          </Text>
        </View>

        {/* Mock Map Preview Card */}
        <View style={styles.mapPreviewCard}>
          <Ionicons name="map-sharp" size={32} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mapTitle}>Punto de Acopio / Coordenadas</Text>
            <Text style={styles.mapSubtitle}>{need.ubicacion}</Text>
          </View>
          <TouchableOpacity
            style={styles.openMapButton}
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  need.ubicacion
                )}`
              )
            }
          >
            <Ionicons name="navigate-circle" size={20} color="#FFFFFF" />
            <Text style={styles.openMapText}>Mapa</Text>
          </TouchableOpacity>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.actionSection}>
          {!isCompleted ? (
            <TouchableOpacity style={styles.sumoButton} onPress={handleIncrement}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.sumoText}>Ofrecer Ayuda (+1 Me Sumo)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.resolvedBanner}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
              <Text style={styles.resolvedText}>¡Esta necesidad ha sido 100% Cubierta!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.whatsappButton} onPress={handleOpenWhatsApp}>
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.whatsappText}>Contactar por WhatsApp Directo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.text} />
            <Text style={styles.shareText}>Compartir con la Comunidad</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toggleCompleteButton} onPress={handleToggleComplete}>
            <Ionicons
              name={isCompleted ? "refresh" : "checkmark-done"}
              size={18}
              color={COLORS.textMuted}
            />
            <Text style={styles.toggleCompleteText}>
              {isCompleted ? "Reactivar Solicitud" : "Marcar como Cubierto por el Creador"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  mapTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  mapSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
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
});
