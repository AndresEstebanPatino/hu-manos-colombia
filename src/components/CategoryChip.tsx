import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { CategoriaNecesidad } from "../types/need";
import { ALL_CATEGORIES_FILTER, COLORS } from "../constants/theme";

interface CategoryChipProps {
  selectedCategory: CategoriaNecesidad | "TODAS";
  onSelectCategory: (cat: CategoriaNecesidad | "TODAS") => void;
}

export const CategoryChipScroll: React.FC<CategoryChipProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {ALL_CATEGORIES_FILTER.map((cat) => {
        const isSelected = selectedCategory === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            activeOpacity={0.7}
            onPress={() => onSelectCategory(cat.key as CategoriaNecesidad | "TODAS")}
            style={[
              styles.chip,
              isSelected ? styles.chipSelected : styles.chipUnselected,
            ]}
          >
            <Text style={styles.emojiText}>{cat.emoji}</Text>
            <Text
              style={[
                styles.chipLabel,
                isSelected ? styles.chipLabelSelected : styles.chipLabelUnselected,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 6,
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipUnselected: {
    backgroundColor: COLORS.neutralLight,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emojiText: {
    fontSize: 14,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 13,
    flexShrink: 0,
  },
  chipLabelUnselected: {
    color: COLORS.neutralDark,
    fontWeight: "600",
  },
  chipLabelSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

