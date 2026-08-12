import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from "react-native";
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
              isSelected
                ? { backgroundColor: cat.color, borderColor: cat.color }
                : { backgroundColor: cat.badgeBg, borderColor: "transparent" },
            ]}
          >
            <Text style={styles.emojiText}>{cat.emoji}</Text>
            <Text
              style={[
                styles.chipLabel,
                isSelected
                  ? { color: "#FFFFFF", fontWeight: "700" }
                  : { color: cat.badgeText, fontWeight: "600" },
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emojiText: {
    fontSize: 14,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 13,
  },
});
