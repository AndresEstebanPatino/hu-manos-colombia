import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StarRatingInputProps {
  rating: number; // 1 a 5
  onChangeRating: (newRating: number) => void;
  size?: number;
  disabled?: boolean;
}

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  rating,
  onChangeRating,
  size = 32,
  disabled = false,
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const isFilled = star <= rating;
        return (
          <TouchableOpacity
            key={star}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => onChangeRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={isFilled ? "star" : "star-outline"}
              size={size}
              color={isFilled ? "#F59E0B" : "#CBD5E1"}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  starButton: {
    padding: 2,
  },
});
