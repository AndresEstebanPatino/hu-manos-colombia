import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Necesidad, CategoriaNecesidad } from "../types/need";
import { COLORS, CATEGORY_CONFIGS } from "../constants/theme";
import { DEFAULT_COLOMBIA_REGION } from "../services/locationService";

interface NeedMapProps {
  needs: Necesidad[];
  onSelectNeed?: (needId: string) => void;
}

const CITY_COORDS_LOOKUP: Record<string, { lat: number; lng: number }> = {
  pereira: { lat: 4.8133, lng: -75.6961 },
  manizales: { lat: 5.0689, lng: -75.5174 },
  quibdó: { lat: 5.6947, lng: -76.6611 },
  quibdo: { lat: 5.6947, lng: -76.6611 },
  cali: { lat: 3.4516, lng: -76.5320 },
  bogotá: { lat: 4.6097, lng: -74.0817 },
  bogota: { lat: 4.6097, lng: -74.0817 },
  medellín: { lat: 6.2442, lng: -75.5812 },
  medellin: { lat: 6.2442, lng: -75.5812 },
  mocoa: { lat: 1.1478, lng: -76.6491 },
  armenia: { lat: 4.5339, lng: -75.6811 },
};

export const getMarkerColor = (categoria: CategoriaNecesidad, completado: boolean): string => {
  if (completado) return "#16A34A";
  switch (categoria) {
    case "SALUD":
    case "BEBES_LACTANCIA":
      return "#DC2626";
    case "MANO_DE_OBRA":
      return "#D97706";
    case "ALIMENTOS":
    case "ROPA_COBIJAS":
    case "OTRO":
    default:
      return "#1E40AF";
  }
};

export const getResolvedCoordinates = (need: Necesidad) => {
  if (need.latitud && need.longitud) {
    return { latitude: need.latitud, longitude: need.longitud };
  }

  const locLower = need.ubicacion.toLowerCase();
  for (const [cityKey, coords] of Object.entries(CITY_COORDS_LOOKUP)) {
    if (locLower.includes(cityKey)) {
      const offsetLat = (Math.random() - 0.5) * 0.04;
      const offsetLng = (Math.random() - 0.5) * 0.04;
      return { latitude: coords.lat + offsetLat, longitude: coords.lng + offsetLng };
    }
  }

  return {
    latitude: DEFAULT_COLOMBIA_REGION.latitude + (Math.random() - 0.5) * 0.2,
    longitude: DEFAULT_COLOMBIA_REGION.longitude + (Math.random() - 0.5) * 0.2,
  };
};

export const NeedMap: React.FC<NeedMapProps> = ({ needs, onSelectNeed }) => {
  const router = useRouter();
  const [selectedNeed, setSelectedNeed] = useState<Necesidad | null>(needs[0] || null);

  const handleOpenDetail = (needId: string) => {
    if (onSelectNeed) {
      onSelectNeed(needId);
    } else {
      router.push(`/detail/${needId}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Banner de Información en la Web */}
      <View style={styles.webNoticeBox}>
        <Text style={styles.webNoticeTitle}>🗺️ Mapa Comunitario GPS (Colombia)</Text>
        <Text style={styles.webNoticeSubtitle}>
          La vista de mapa interactivo en tiempo real está habilitada para dispositivos móviles (iOS y Android).
        </Text>
      </View>

      {/* Leyenda de Colores */}
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#DC2626" }]} />
            <Text style={styles.legendText}>Salud / Bebés</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#D97706" }]} />
            <Text style={styles.legendText}>Voluntarios</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#1E40AF" }]} />
            <Text style={styles.legendText}>Recursos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#16A34A" }]} />
            <Text style={styles.legendText}>Cubiertas</Text>
          </View>
        </View>
      </View>

      {/* Tarjetas Interactivas de Ubicación GPS en Web */}
      <ScrollView contentContainerStyle={styles.webMapScroll}>
        {needs.map((need) => {
          const color = getMarkerColor(need.categoria, need.completado);
          const catConfig = CATEGORY_CONFIGS[need.categoria];
          const coords = getResolvedCoordinates(need);
          const isSelected = selectedNeed?.id === need.id;

          return (
            <TouchableOpacity
              key={need.id}
              activeOpacity={0.8}
              style={[
                styles.webMapPinCard,
                { borderLeftColor: color },
                isSelected && styles.webMapPinCardSelected,
              ]}
              onPress={() => setSelectedNeed(need)}
            >
              <View style={styles.webPinHeader}>
                <View style={[styles.webPinBadge, { backgroundColor: color }]}>
                  <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>
                    {catConfig?.emoji || "📍"} GPS
                  </Text>
                </View>
                <Text style={styles.webPinCoords}>
                  {coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)}
                </Text>
              </View>

              <Text style={styles.webPinTitle}>{need.titulo}</Text>
              <Text style={styles.webPinLocation}>📍 {need.ubicacion}</Text>

              <View style={styles.webPinFooter}>
                <Text style={styles.webPinProgress}>
                  Progreso: {need.progreso_actual} / {need.meta_cantidad} {need.unidad_medida || "ayudas"}
                </Text>
                <TouchableOpacity
                  style={styles.webPinDetailBtn}
                  onPress={() => handleOpenDetail(need.id)}
                >
                  <Text style={styles.webPinDetailText}>Abrir Evento ➔</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  webNoticeBox: {
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  webNoticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  webNoticeSubtitle: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 2,
    lineHeight: 16,
  },
  legendContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  legendRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  webMapScroll: {
    padding: 16,
    gap: 12,
  },
  webMapPinCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  webMapPinCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  webPinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  webPinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  webPinCoords: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  webPinTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  webPinLocation: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "700",
    marginBottom: 8,
  },
  webPinFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  webPinProgress: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  webPinDetailBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  webPinDetailText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
