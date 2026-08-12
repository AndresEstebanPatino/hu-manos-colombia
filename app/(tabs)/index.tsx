import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../src/components/Header";
import { SearchBar } from "../../src/components/SearchBar";
import { CategoryChipScroll } from "../../src/components/CategoryChip";
import { NeedCard } from "../../src/components/NeedCard";
import { Necesidad, CategoriaNecesidad } from "../../src/types/need";
import {
  getNeeds,
  incrementNeedProgress,
  toggleNeedCompleted,
  deleteNeed,
  resetToSeedData,
} from "../../src/services/storage";
import { supabase, isSupabaseConfigured } from "../../src/lib/supabase";
import { COLORS } from "../../src/constants/theme";

import { useAuth } from "../../src/context/AuthContext";

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [needs, setNeeds] = useState<Necesidad[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoriaNecesidad | "TODAS">("TODAS");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      const data = await getNeeds();
      setNeeds(data);
    } catch (error) {
      console.error("Error al cargar data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Suscripción a Supabase Realtime en vivo para inserciones, actualizaciones y eliminaciones
  useEffect(() => {
    loadData();

    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel("realtime-necesidades")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "necesidades" },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleIncrement = async (id: string, userId?: string) => {
    const res = await incrementNeedProgress(id, userId || user?.id);
    if (res) {
      setNeeds((prev) => prev.map((item) => (item.id === id ? res.need : item)));
    }
  };

  const handleToggleComplete = async (id: string, newStatus: boolean) => {
    const updated = await toggleNeedCompleted(id, newStatus);
    if (updated) {
      setNeeds((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteNeed(id);
    if (success) {
      setNeeds((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleResetData = async () => {
    const freshData = await resetToSeedData();
    setNeeds(freshData);
  };

  const handlePressDetail = (id: string) => {
    router.push(`/detail/${id}`);
  };

  // Conteos para los botones superiores del Header (Activas son las que no han sido cerradas manualmente)
  const activeCount = needs.filter((n) => !n.completado).length;
  const completedCount = needs.filter((n) => n.completado).length;

  // Filtrado de solicitudes
  const filteredNeeds = needs.filter((item) => {
    const isClosedManually = Boolean(item.completado);

    // Filtro por Estado (Activas vs Cubiertas)
    if (showCompleted !== isClosedManually) return false;

    // Filtro por Categoría
    if (selectedCategory !== "TODAS" && item.categoria !== selectedCategory) {
      return false;
    }

    // Filtro por Búsqueda (Título, Descripción, Ubicación)
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      const matchTitle = item.titulo.toLowerCase().includes(query);
      const matchDesc = item.descripcion.toLowerCase().includes(query);
      const matchLoc = item.ubicacion.toLowerCase().includes(query);
      return matchTitle || matchDesc || matchLoc;
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Branding + Selector Activas/Cubiertas + Presencia Online */}
        <Header
          showCompleted={showCompleted}
          onToggleStatus={(completedStatus) => setShowCompleted(completedStatus)}
          activeCount={activeCount}
          completedCount={completedCount}
        />

        {/* Buscador Rápido */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />

        {/* Carousel / Scroll Horizontal de Categorías */}
        <CategoryChipScroll
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Feed de Solicitudes en Tiempo Real */}
        <FlatList
          data={filteredNeeds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NeedCard
              need={item}
              onIncrement={handleIncrement}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDelete}
              onPressDetail={handlePressDetail}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={showCompleted ? "checkmark-done-circle-outline" : "search-outline"}
                size={54}
                color="#94A3B8"
              />
              <Text style={styles.emptyTitle}>
                {showCompleted
                  ? "No hay solicitudes cubiertas en esta sección"
                  : "No se encontraron solicitudes activas"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No se encontraron resultados para "${searchQuery}"`
                  : selectedCategory !== "TODAS"
                  ? "Prueba seleccionando otra categoría o publica una nueva solicitud."
                  : "Sé el primero en pedir ayuda para tu comunidad."}
              </Text>

              {needs.length === 0 || searchQuery || selectedCategory !== "TODAS" ? (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("TODAS");
                  }}
                >
                  <Text style={styles.resetButtonText}>Limpiar Filtros</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.demoSeedButton} onPress={handleResetData}>
                <Ionicons name="refresh" size={16} color={COLORS.primary} />
                <Text style={styles.demoSeedText}>Restaurar Solicitudes de Prueba</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Floating Action Button (+ Crear Solicitud) */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.fab}
          onPress={() => router.push("/create")}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
          <Text style={styles.fabText}>Pedir Ayuda</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  resetButton: {
    marginTop: 16,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resetButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  demoSeedButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  demoSeedText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
