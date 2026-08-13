import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ModoNecesidad } from "../types/need";
import { COLORS } from "../constants/theme";

interface ProgressBarProps {
  current: number;
  total: number;
  unit?: string;
  isCompleted?: boolean;
  modo?: ModoNecesidad;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  unit = "ayudas",
  isCompleted = false,
  modo = "SOLICITUD",
}) => {
  const isOferta = modo === "OFERTA";
  const percentage = Math.min(Math.round((current / Math.max(total, 1)) * 100), 100);
  const isMetaReached = current >= total;
  const barColor = isCompleted || isMetaReached ? COLORS.secondary : isOferta ? "#059669" : COLORS.primary;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.progressText}>
          <Text style={styles.currentNumber}>{current}</Text> de {total} {unit} {isOferta ? "(ofrecidos)" : "(necesitados)"}
        </Text>
        <Text style={[styles.percentageText, { color: barColor }]}>
          {isCompleted
            ? isOferta
              ? "✅ Oferta Entregada / Finalizada"
              : "✅ Cubierta / Cerrada"
            : isMetaReached
            ? isOferta
              ? "🎉 Toda la oferta entregada"
              : `🎉 Meta Alcanzada (${unit})`
            : `${percentage}%`}
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  currentNumber: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 14,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "700",
  },
  track: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});
