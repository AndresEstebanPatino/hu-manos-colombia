import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CategoriaNecesidad, TipoNecesidad } from "../types/need";
import { CATEGORY_CONFIGS, COLORS } from "../constants/theme";

interface CategoryBadgeProps {
  category: CategoriaNecesidad;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const config = CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS.OTRO;

  return (
    <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.badgeText, { color: config.badgeText }]}>{config.label}</Text>
    </View>
  );
};

interface TypeBadgeProps {
  type: TipoNecesidad;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const isResource = type === "RECURSO";
  return (
    <View
      style={[
        styles.typeBadge,
        isResource ? styles.resourceBadge : styles.volunteerBadge,
      ]}
    >
      <Text
        style={[
          styles.typeBadgeText,
          isResource ? styles.resourceText : styles.volunteerText,
        ]}
      >
        {isResource ? "📦 Recurso" : "👥 Voluntarios"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emoji: {
    fontSize: 12,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  resourceBadge: {
    backgroundColor: COLORS.primaryLight,
    borderColor: "#BFDBFE",
  },
  volunteerBadge: {
    backgroundColor: COLORS.neutralLight,
    borderColor: COLORS.border,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  resourceText: {
    color: COLORS.primary,
  },
  volunteerText: {
    color: COLORS.neutralDark,
  },
});

