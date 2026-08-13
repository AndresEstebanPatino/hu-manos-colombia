import React from "react";
import { View, Text, StyleSheet, Image, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CalificacionItem } from "../services/reliabilityService";
import { StarRatingDisplay } from "./StarRatingDisplay";
import { getTimeAgo } from "../services/storage";
import { COLORS } from "../constants/theme";

interface CalificacionesListProps {
  ratings: CalificacionItem[];
  loading?: boolean;
  emptyMessage?: string;
}

export const CalificacionesList: React.FC<CalificacionesListProps> = ({
  ratings,
  loading = false,
  emptyMessage = "Sin evaluaciones recientes aún.",
}) => {
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando evaluaciones comunitarias...</Text>
      </View>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="chatbox-ellipses-outline" size={32} color="#94A3B8" />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {ratings.map((item) => (
        <View key={item.id || item.created_at} style={styles.card}>
          <View style={styles.headerRow}>
            {item.calificador?.avatar_url ? (
              <Image source={{ uri: item.calificador.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(item.calificador?.full_name || "V").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.metaContainer}>
              <Text style={styles.userName}>{item.calificador?.full_name || "Voluntario Verificado"}</Text>
              <StarRatingDisplay rating={item.estrellas} size={14} />
            </View>

            <Text style={styles.dateText}>{getTimeAgo(item.created_at)}</Text>
          </View>

          {item.comentario ? <Text style={styles.commentText}>{item.comentario}</Text> : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    gap: 10,
    marginTop: 8,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  metaContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  commentText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
});
