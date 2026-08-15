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
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../src/components/Header";
import { SearchBar } from "../../src/components/SearchBar";
import { CategoryChipScroll } from "../../src/components/CategoryChip";
import { NeedCard } from "../../src/components/NeedCard";
import { MapaIntegrado } from "../../src/components/MapaIntegrado";
import { AuthModal } from "../../src/components/AuthModal";
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
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = windowWidth < 380;

  const [needs, setNeeds] = useState<Necesidad[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoriaNecesidad | "TODAS">("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthInitial, setShowAuthInitial] = useState(false);
  const [viewMode, setViewMode] = useState<"LIST" | "MAP">("LIST");
  const [modoFilter, setModoFilter] = useState<"TODO" | "SOLICITUD" | "OFERTA">("TODO");

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

  // Abrir la pantalla de registro si el usuario no ha iniciado sesión
  useEffect(() => {
    if (!user) {
      setShowAuthInitial(true);
    } else {
      setShowAuthInitial(false);
    }
  }, [user]);

  // Suscripción a Supabase Realtime en vivo para inserciones, actualizaciones y eliminaciones
  useEffect(() => {
    loadData();

    if (isSupabaseConfigured()) {
      const channelName = `realtime-necesidades-${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(channelName)
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
    if (!user?.id) return;
    const success = await deleteNeed(id, user.id);
    if (success) {
      setNeeds((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handlePressDetail = (id: string) => {
    router.push(`/detail/${id}`);
  };

  const handleResetData = async () => {
    const resetList = await resetToSeedData();
    setNeeds(resetList);
  };

  const activeCount = needs.filter((item) => !item.completado).length;
  const completedCount = needs.filter((item) => item.completado).length;

  const filteredNeeds = needs.filter((item) => {
    const isClosedManually = Boolean(item.completado);

    if (showCompleted !== isClosedManually) return false;

    if (modoFilter !== "TODO") {
      const itemModo = item.modo || "SOLICITUD";
      if (itemModo !== modoFilter) return false;
    }

    if (selectedCategory !== "TODAS" && item.categoria !== selectedCategory) {
      return false;
    }

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

        {/* Banner Permanente de Seguridad Anti-Estafas */}
        <View style={styles.securityBanner}>
          <Ionicons name="shield-checkmark-sharp" size={16} color="#16A34A" />
          <Text style={styles.securityBannerText}>
            <Text style={{ fontWeight: "800", color: "#15803D" }}>SEGURIDAD ANTI-ESTAFAS: </Text>
            Las ayudas son 100% gratuitas. NUNCA transfieras dinero a cuentas personales.
          </Text>
        </View>

        {/* Buscador Rápido y Selector de Vista (Lista / Mapa GPS) */}
        <View style={[styles.searchAndToggleRow, { paddingRight: isSmallScreen ? 8 : 16 }]}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery("")}
            />
          </View>

          {/* Toggle Switch: Lista vs Mapa GPS */}
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.viewToggleBtn, viewMode === "LIST" && styles.viewToggleBtnActive]}
              onPress={() => setViewMode("LIST")}
            >
              <Ionicons name="list-sharp" size={16} color={viewMode === "LIST" ? "#FFFFFF" : COLORS.textMuted} />
              <Text style={[styles.viewToggleText, viewMode === "LIST" && styles.viewToggleTextActive]}>
                Lista
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.viewToggleBtn, viewMode === "MAP" && styles.viewToggleBtnActive]}
              onPress={() => setViewMode("MAP")}
            >
              <Ionicons name="map-sharp" size={16} color={viewMode === "MAP" ? "#FFFFFF" : COLORS.textMuted} />
              <Text style={[styles.viewToggleText, viewMode === "MAP" && styles.viewToggleTextActive]}>
                Mapa GPS
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtro por Modo: Todas / Solicitudes / Ofertas */}
        <View style={styles.modoFilterRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modoFilterChip,
              modoFilter === "TODO" && styles.modoFilterChipActive,
            ]}
            onPress={() => setModoFilter("TODO")}
          >
            <Text
              style={[
                styles.modoFilterText,
                modoFilter === "TODO" && styles.modoFilterTextActive,
              ]}
            >
              Todas ({needs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modoFilterChip,
              modoFilter === "SOLICITUD" && styles.modoFilterChipSolicitudActive,
            ]}
            onPress={() => setModoFilter("SOLICITUD")}
          >
            <Text
              style={[
                styles.modoFilterText,
                modoFilter === "SOLICITUD" && styles.modoFilterTextSolicitudActive,
              ]}
            >
              🆘 Solicitudes ({needs.filter((n) => (n.modo || "SOLICITUD") === "SOLICITUD").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modoFilterChip,
              modoFilter === "OFERTA" && styles.modoFilterChipOfertaActive,
            ]}
            onPress={() => setModoFilter("OFERTA")}
          >
            <Text
              style={[
                styles.modoFilterText,
                modoFilter === "OFERTA" && styles.modoFilterTextOfertaActive,
              ]}
            >
              🤝 Ofertas ({needs.filter((n) => n.modo === "OFERTA").length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Carousel / Scroll Horizontal de Categorías */}
        <View style={{ flexShrink: 0 }}>
          <CategoryChipScroll
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </View>

        {/* Vista Alternable: Lista vs Mapa GPS */}
        {viewMode === "MAP" ? (
          <MapaIntegrado needs={filteredNeeds} onSelectNeed={handlePressDetail} />
        ) : (
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
        )}


        {/* Botón Flotante (FAB) elevado para publicar sin saturar el Navbar inferior */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.fab}
          onPress={() => router.push("/create")}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>Publicar</Text>
        </TouchableOpacity>

        {/* Modal de Registro / Inicio de Sesión Obligatorio al abrir por primera vez */}
        <AuthModal
          visible={showAuthInitial || !user}
          onClose={() => setShowAuthInitial(false)}
        />
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
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  securityBannerText: {
    flex: 1,
    fontSize: 11,
    color: "#166534",
    lineHeight: 15,
  },
  searchAndToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    gap: 8,
  },
  viewToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  viewToggleTextActive: {
    color: "#FFFFFF",
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
  modoFilterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  modoFilterChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modoFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modoFilterChipSolicitudActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  modoFilterChipOfertaActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  modoFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  modoFilterTextActive: {
    color: "#FFFFFF",
  },
  modoFilterTextSolicitudActive: {
    color: "#FFFFFF",
  },
  modoFilterTextOfertaActive: {
    color: "#FFFFFF",
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
    bottom: 28,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 99,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
