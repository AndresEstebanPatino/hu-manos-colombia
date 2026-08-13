import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

export type ReliabilityLevel = "nuevo" | "muy_confiable" | "confiable" | "regular" | "riesgo";

interface ReliabilityBadgeProps {
  level?: ReliabilityLevel;
  totalRatings?: number;
  averageRating?: number;
  compact?: boolean;
}

export const RELIABILITY_CONFIGS: Record<
  ReliabilityLevel,
  { label: string; color: string; bg: string; icon: string; description: string }
> = {
  nuevo: {
    label: "Nuevo",
    color: "#64748B",
    bg: "#F1F5F9",
    icon: "radio-button-off",
    description: "Usuario registrado recientemente. Aún no acumula suficientes evaluaciones comunitarias.",
  },
  muy_confiable: {
    label: "Muy Confiable",
    color: "#15803D",
    bg: "#DCFCE7",
    icon: "checkmark-seal",
    description: "Excelente reputación. Apoyos verificados y altas calificaciones por la comunidad.",
  },
  confiable: {
    label: "Confiable",
    color: "#16A34A",
    bg: "#F0FDF4",
    icon: "shield-checkmark",
    description: "Usuario validado con múltiples contribuciones efectivas a necesidades comunitarias.",
  },
  regular: {
    label: "Regular",
    color: "#B45309",
    bg: "#FEF3C7",
    icon: "alert-circle",
    description: "Evaluaciones mixtas por la comunidad. Se recomienda verificar detalles antes de coordinar.",
  },
  riesgo: {
    label: "Bajo Reporte",
    color: "#B91C1C",
    bg: "#FEE2E2",
    icon: "warning",
    description: "Calificaciones bajas o reportes de incumplimiento. Procede con precaución.",
  },
};

export const ReliabilityBadge: React.FC<ReliabilityBadgeProps> = ({
  level = "nuevo",
  totalRatings = 0,
  averageRating = 0,
  compact = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = RELIABILITY_CONFIGS[level] || RELIABILITY_CONFIGS.nuevo;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color }]}
        onPress={() => setShowTooltip(true)}
      >
        <Ionicons name={config.icon as any} size={compact ? 12 : 14} color={config.color} />
        <Text style={[styles.badgeText, { color: config.color }, compact && { fontSize: 10 }]}>
          {config.label}
        </Text>
      </TouchableOpacity>

      {/* Modal Tooltip de Explicación de Confiabilidad */}
      <Modal visible={showTooltip} transparent animationType="fade" onRequestClose={() => setShowTooltip(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTooltip(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon as any} size={28} color={config.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Nivel de Confiabilidad: {config.label}</Text>
                <Text style={styles.modalStats}>
                  ⭐ {averageRating.toFixed(1)} / 5.0 • {totalRatings} {totalRatings === 1 ? "evaluación" : "evaluaciones"}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setShowTooltip(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>{config.description}</Text>

            <View style={styles.antiScamNotice}>
              <Ionicons name="shield-checkmark-sharp" size={16} color="#16A34A" />
              <Text style={styles.antiScamText}>
                Las calificaciones son otorgadas exclusivamente por voluntarios que han realizado contribuciones confirmadas.
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowTooltip(false)}>
              <Text style={styles.closeBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalStats: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  modalDescription: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  antiScamNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  antiScamText: {
    flex: 1,
    fontSize: 11,
    color: "#166534",
    lineHeight: 15,
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
