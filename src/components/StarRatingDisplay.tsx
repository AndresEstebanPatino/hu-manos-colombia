import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

interface StarRatingDisplayProps {
  rating: number; // Ej: 4.3
  totalRatings?: number;
  size?: number;
  showText?: boolean;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  rating,
  totalRatings,
  size = 16,
  showText = true,
}) => {
  const safeRating = Math.max(0, Math.min(5, rating || 0));
  const fullStars = Math.floor(safeRating);
  const hasHalfStar = safeRating - fullStars >= 0.3 && safeRating - fullStars <= 0.8;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {/* Estrellas Llenas */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Ionicons key={`full-${i}`} name="star" size={size} color="#F59E0B" />
        ))}
        {/* Media Estrella */}
        {hasHalfStar && <Ionicons name="star-half" size={size} color="#F59E0B" />}
        {/* Estrellas Vacías */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#CBD5E1" />
        ))}
      </View>

      {showText && (
        <Text style={styles.ratingText}>
          {safeRating.toFixed(1)} {totalRatings !== undefined ? `(${totalRatings})` : ""}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
});
