import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

interface ProgressBarProps {
  current: number;
  total: number;
  unit?: string;
  isCompleted?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  unit = "ayudas",
  isCompleted = false,
}) => {
  const percentage = Math.min(Math.round((current / Math.max(total, 1)) * 100), 100);
  const isMetaReached = current >= total;
  const barColor = isCompleted || isMetaReached ? COLORS.secondary : COLORS.primary;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.progressText}>
          <Text style={styles.currentNumber}>{current}</Text> de {total} {unit}
        </Text>
        <Text style={[styles.percentageText, { color: barColor }]}>
          {isCompleted
            ? "✅ Cubierta / Cerrada"
            : isMetaReached
            ? `🎉 Meta Alcanzada (${unit})`
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
