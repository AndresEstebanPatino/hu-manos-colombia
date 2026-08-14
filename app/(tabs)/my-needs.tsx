import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StatusBar as RNStatusBar,
  Platform,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Necesidad, CategoriaNecesidad, TipoNecesidad, ModoNecesidad } from "../../src/types/need";
import { ModoBadge } from "../../src/components/StatusBadge";
import { LogisticaContribucionesSection } from "../../src/components/LogisticaContribucionesSection";
import {
  getUserNeeds,
  updateNeed,
  toggleNeedCompleted,
  deleteNeed,
  getTimeAgo,
  formatWhatsAppNumber,
  getValidSupabaseUserId,
} from "../../src/services/storage";
import { CATEGORY_CONFIGS, COLORS } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";
import { useNotifications } from "../../src/context/NotificationContext";
import { ProgressBar } from "../../src/components/ProgressBar";
import { AuthModal } from "../../src/components/AuthModal";
import { supabase, isSupabaseConfigured } from "../../src/lib/supabase";
import {
  buscarDireccionOSM,
  formatNominatimTitle,
  NominatimPlace,
} from "../../src/services/nominatimGeocoding";
import {
  compressImageForUpload,
  uploadImageToSupabaseStorage,
  SUPABASE_STORAGE_BUCKET,
} from "../../src/services/imageCompression";

export default function MyNeedsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [myNeeds, setMyNeeds] = useState<Necesidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Estados para el Modal de Edición
  const [editingNeed, setEditingNeed] = useState<Necesidad | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editMeta, setEditMeta] = useState("1");
  const [editProgreso, setEditProgreso] = useState("0");
  const [editUnidad, setEditUnidad] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editUbicacion, setEditUbicacion] = useState("");
  const [editImagenUrl, setEditImagenUrl] = useState<string | null>(null);
  const [editCoords, setEditCoords] = useState<{ latitud?: number; longitud?: number } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Autocompletado OSM para edición
  const [osmSuggestions, setOsmSuggestions] = useState<NominatimPlace[]>([]);
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchMyNeeds = useCallback(async () => {
    if (!user) {
      setMyNeeds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUserNeeds(user.id);
      setMyNeeds(data);
    } catch (err) {
      console.error("Error al obtener mis solicitudes:", err);
      showToast("Error", "No se pudieron cargar tus solicitudes", "alert");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchMyNeeds();
    }, [fetchMyNeeds])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyNeeds();
  };

  // --- ACCIÓN: MARCAR COMO CUBIERTA / REABRIR ---
  const handleToggleCompleted = async (item: Necesidad) => {
    if (!user || item.creador_id !== user.id) {
      Alert.alert("Acceso denegado", "Solo el creador de la necesidad puede modificar su estado.");
      return;
    }

    const newStatus = !item.completado;
    const updated = await toggleNeedCompleted(item.id, newStatus);

    if (updated) {
      setMyNeeds((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, completado: newStatus } : n))
      );
      showToast(
        newStatus ? "🎉 Solicitud Cubierta" : "🔄 Solicitud Reabierta",
        newStatus
          ? "Has marcado esta necesidad como completada"
          : "La solicitud vuelve a estar activa",
        newStatus ? "success" : "info"
      );
    } else {
      showToast("Error", "No se pudo actualizar el estado de la solicitud", "alert");
    }
  };

  // --- ACCIÓN: ELIMINAR SOLICITUD ---
  const handleDelete = (item: Necesidad) => {
    if (!user || item.creador_id !== user.id) {
      Alert.alert("Acceso denegado", "Solo el creador puede eliminar esta solicitud.");
      return;
    }

    Alert.alert(
      "Eliminar Solicitud",
      `¿Estás seguro de eliminar "${item.titulo}"?\nEsta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const success = await deleteNeed(item.id, user.id);
            if (success) {
              setMyNeeds((prev) => prev.filter((n) => n.id !== item.id));
              showToast("🗑️ Solicitud Eliminada", "La solicitud fue eliminada correctamente", "delete");
            } else {
              showToast("Error", "No se pudo eliminar la solicitud", "alert");
            }
          },
        },
      ]
    );
  };

  // --- ACCIÓN: ABRIR MODAL DE EDICIÓN ---
  const handleOpenEdit = (item: Necesidad) => {
    if (!user || item.creador_id !== user.id) {
      Alert.alert("Acceso denegado", "Solo el creador puede editar esta necesidad.");
      return;
    }

    setEditingNeed(item);
    setEditTitulo(item.titulo);
    setEditDescripcion(item.descripcion || "");
    setEditMeta(String(item.meta_cantidad || 1));
    setEditProgreso(String(item.progreso_actual || 0));
    setEditUnidad(item.unidad_medida || "unidades");
    setEditWhatsapp(item.contacto_whatsapp || "");
    setEditUbicacion(item.ubicacion || "");
    setEditImagenUrl(item.imagen_url || null);
    setEditCoords({ latitud: item.latitud, longitud: item.longitud });
    setShowSuggestions(false);
  };

  // Debounce para autocompletado de direcciones en edición
  useEffect(() => {
    if (!editUbicacion || editUbicacion.trim().length < 3) {
      setOsmSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingOsm(true);
      try {
        const places = await buscarDireccionOSM(editUbicacion);
        setOsmSuggestions(places);
        setShowSuggestions(places.length > 0);
      } catch (err) {
        console.log("OSM edit error:", err);
      } finally {
        setLoadingOsm(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [editUbicacion]);

  const handleSelectOsmPlace = (place: NominatimPlace) => {
    const formattedTitle = formatNominatimTitle(place.display_name);
    setEditUbicacion(formattedTitle);
    setEditCoords({
      latitud: parseFloat(place.lat),
      longitud: parseFloat(place.lon),
    });
    setShowSuggestions(false);
  };

  // Selección de Imagen con Expo Image Picker (Cámara o Galería)
  const handleSelectImageSource = () => {
    Alert.alert(
      "📷 Cambiar Foto de la Solicitud",
      "Elige de dónde deseas capturar o seleccionar la nueva imagen:",
      [
        {
          text: "📷 Tomar Foto con la Cámara",
          onPress: () => processEditImagePick("CAMERA"),
        },
        {
          text: "🖼️ Elegir de la Galería",
          onPress: () => processEditImagePick("GALLERY"),
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ]
    );
  };

  const processEditImagePick = async (sourceType: "CAMERA" | "GALLERY") => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (sourceType === "CAMERA") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permiso Requerido", "Permite acceso a la cámara en la configuración.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permiso Requerido", "Permite acceso a la galería para cambiar la foto.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        uploadEditImage(uri);
      }
    } catch (err) {
      console.error("Error al seleccionar imagen:", err);
    }
  };

  const uploadEditImage = async (rawUri: string) => {
    if (!isSupabaseConfigured()) return;
    setUploadingImage(true);

    try {
      await getValidSupabaseUserId();
      const publicUrl = await uploadImageToSupabaseStorage(rawUri);

      if (publicUrl) {
        setEditImagenUrl(publicUrl);
        showToast("📸 Foto cargada", "La nueva foto se actualizará al guardar.", "success");
      }
    } catch (err: any) {
      console.error("Error al subir foto en edición:", err);
      Alert.alert(
        "⚠️ Error al subir foto",
        `No se pudo subir la foto al servidor: ${err?.message || "Error de red o almacenamiento."}`
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // --- ACCIÓN: GUARDAR EDICIÓN ---
  const handleSaveEdit = async () => {
    if (!editingNeed || !user) return;

    if (!editTitulo.trim() || !editUbicacion.trim()) {
      Alert.alert("Campos requeridos", "Ingresa un título descriptivo y la ubicación.");
      return;
    }

    const metaNum = parseInt(editMeta, 10);
    const progresoNum = parseInt(editProgreso, 10);

    if (isNaN(metaNum) || metaNum <= 0) {
      Alert.alert("Meta inválida", "Ingresa una meta numérica válida.");
      return;
    }

    if (isNaN(progresoNum) || progresoNum < 0) {
      Alert.alert("Progreso inválido", "El progreso numérico debe ser 0 o superior.");
      return;
    }

    setSavingEdit(true);

    let finalLat = editCoords?.latitud;
    let finalLng = editCoords?.longitud;

    // Si cambió la ubicación y no hay coordenadas, intentar geocodificar con OSM
    if (!finalLat && editUbicacion.trim().length >= 3) {
      try {
        const places = await buscarDireccionOSM(editUbicacion.trim());
        if (places && places.length > 0) {
          finalLat = parseFloat(places[0].lat);
          finalLng = parseFloat(places[0].lon);
        }
      } catch (e) {
        console.log("Geocoding edit fallback info:", e);
      }
    }

    const isNowCompleted = progresoNum >= metaNum;

    const updatedData: Partial<Necesidad> = {
      titulo: editTitulo.trim(),
      descripcion: editDescripcion.trim(),
      meta_cantidad: metaNum,
      progreso_actual: progresoNum,
      unidad_medida: editUnidad.trim() || "unidades",
      contacto_whatsapp: editWhatsapp.trim() ? formatWhatsAppNumber(editWhatsapp.trim()) : "Opcional",
      ubicacion: editUbicacion.trim(),
      latitud: finalLat,
      longitud: finalLng,
      imagen_url: editImagenUrl || undefined,
      completado: isNowCompleted,
    };

    const updated = await updateNeed(editingNeed.id, updatedData, user.id);

    setSavingEdit(false);

    if (updated) {
      setMyNeeds((prev) => prev.map((n) => (n.id === editingNeed.id ? updated : n)));
      setEditingNeed(null);
      showToast("✏️ Necesidad Actualizada", "Tus cambios se han guardado exitosamente", "success");
    } else {
      showToast("Error de Guardado", "No se pudo actualizar la necesidad en Supabase", "alert");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Row */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="megaphone" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Mis Alertas Publicadas</Text>
              <Text style={styles.headerSubtitle}>
                Gestiona, edita o actualiza tus solicitudes
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F1F5F9",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                gap: 4,
              }}
              onPress={() => router.push("/acerca-de" as any)}
            >
              <Ionicons name="information-circle" size={18} color={COLORS.primary} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.primary }}>Políticas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Si el usuario NO ha iniciado sesión */}
        {!user ? (
          <View style={styles.authBanner}>
            <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
            <Text style={styles.authBannerTitle}>Identifícate para ver tus Alertas</Text>
            <Text style={styles.authBannerText}>
              Inicia sesión con tu cuenta de Google o número celular para administrar las solicitudes de ayuda que has publicado.
            </Text>
            <TouchableOpacity
              style={styles.signInBtn}
              activeOpacity={0.8}
              onPress={() => setShowAuthModal(true)}
            >
              <Ionicons name="person-circle" size={20} color="#FFFFFF" />
              <Text style={styles.signInBtnText}>Iniciar Sesión / Identificarme</Text>
            </TouchableOpacity>
            <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando tus solicitudes...</Text>
          </View>
        ) : (
          <FlatList
            data={myNeeds}
            keyExtractor={(item) => item.id}
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
                <Ionicons name="document-text-outline" size={56} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Aún no has publicado ninguna solicitud</Text>
                <Text style={styles.emptySubtitle}>
                  Cuando crees una alerta o solicitud de ayuda para tu comunidad, podrás hacerle seguimiento y actualizar su progreso aquí.
                </Text>
                <TouchableOpacity
                  style={styles.createBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push("/create")}
                >
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.createBtnText}>Publicar una Necesidad</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => {
              const catConfig = CATEGORY_CONFIGS[item.categoria];
              const isOwner = Boolean(user && item.creador_id === user.id);

              return (
                <View style={[styles.card, item.completado && styles.cardCompleted]}>
                  {/* Top Bar: Categoría + Estado + Fecha */}
                  <View style={styles.cardHeaderRow}>
                    <ModoBadge modo={item.modo} />
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryEmoji}>{catConfig?.emoji || "📌"}</Text>
                      <Text style={styles.categoryLabel}>{catConfig?.label || item.categoria}</Text>
                    </View>

                    <View style={styles.statusAndDateRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          item.completado ? styles.statusCompleted : styles.statusActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            item.completado
                              ? styles.statusCompletedText
                              : styles.statusActiveText,
                          ]}
                        >
                          {item.completado
                            ? item.modo === "OFERTA"
                              ? "✅ Oferta Agotada"
                              : "✅ Necesidad Cubierta"
                            : item.modo === "OFERTA"
                            ? "🎁 Oferta Activa"
                            : "🚨 Solicitud Activa"}
                        </Text>
                      </View>
                      <Text style={styles.timeAgoText}>{getTimeAgo(item.creado_en)}</Text>
                    </View>
                  </View>

                  {/* Imagen de la necesidad si existe */}
                  {item.imagen_url ? (
                    <Image
                      source={{ uri: item.imagen_url }}
                      style={styles.needImage}
                      resizeMode="cover"
                    />
                  ) : null}

                  {/* Título y Descripción */}
                  <Text style={styles.cardTitle}>{item.titulo}</Text>
                  {item.descripcion ? (
                    <Text style={styles.cardDesc} numberOfLines={3}>
                      {item.descripcion}
                    </Text>
                  ) : null}

                  <Text style={styles.locationText}>📍 {item.ubicacion}</Text>

                  {/* Progreso Visual */}
                  <View style={styles.progressContainer}>
                    <ProgressBar
                      current={item.progreso_actual}
                      total={item.meta_cantidad}
                      unit={item.unidad_medida || (item.modo === "OFERTA" ? "unidades" : "ayudas")}
                      modo={item.modo}
                    />
                  </View>

                  {/* Botones de Acción Exclusivos del Creador */}
                  {isOwner ? (
                    <>
                      <View style={styles.actionButtonsRow}>
                        {/* Botón Editar */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={styles.editButton}
                          onPress={() => handleOpenEdit(item)}
                        >
                          <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.editButtonText}>Editar</Text>
                        </TouchableOpacity>

                        {/* Botón Marcar Completada / Reabrir */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.toggleButton,
                            item.completado ? styles.reopenButton : styles.completeButton,
                          ]}
                          onPress={() => handleToggleCompleted(item)}
                        >
                          <Ionicons
                            name={item.completado ? "refresh-outline" : "checkmark-circle-outline"}
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text style={styles.toggleButtonText}>
                            {item.completado
                              ? "Reabrir"
                              : item.modo === "OFERTA"
                              ? "Marcar Oferta como Agotada"
                              : "Marcar Necesidad como Cubierta"}
                          </Text>
                        </TouchableOpacity>

                        {/* Botón Eliminar */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={styles.deleteButton}
                          onPress={() => handleDelete(item)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          <Text style={styles.deleteButtonText}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Sección exclusiva del Creador: Personas que confirmaron ayuda y logística */}
                      <LogisticaContribucionesSection necesidadId={item.id} modo={item.modo} />
                    </>
                  ) : (
                    <View style={styles.nonOwnerBanner}>
                      <Text style={styles.nonOwnerText}>
                        🔒 Solo lectura (creado por otro usuario)
                      </Text>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        {/* --- MODAL DE EDICIÓN DE NECESIDAD --- */}
        {editingNeed ? (
          <Modal
            visible={!!editingNeed}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setEditingNeed(null)}
          >
            <SafeAreaView style={styles.modalSafeArea}>
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                {/* Header del Modal */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setEditingNeed(null)}
                    style={styles.closeModalBtn}
                  >
                    <Ionicons name="close-sharp" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                  <Text style={styles.modalTitleText}>Editar Solicitud de Ayuda</Text>
                  <View style={{ width: 32 }} />
                </View>

                <ScrollView contentContainerStyle={styles.editFormScroll}>
                  {/* Título */}
                  <Text style={styles.inputLabel}>1. Título descriptivo *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editTitulo}
                    onChangeText={setEditTitulo}
                    placeholder="Ej: Urgente: 10 mercados para albergue"
                  />

                  {/* Fila Meta y Progreso Manual */}
                  <View style={styles.rowTwoCols}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>2. Progreso Actual</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editProgreso}
                        onChangeText={setEditProgreso}
                        keyboardType="numeric"
                        placeholder="Ej: 5"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>3. Meta Total *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editMeta}
                        onChangeText={setEditMeta}
                        keyboardType="numeric"
                        placeholder="Ej: 10"
                      />
                    </View>
                  </View>

                  {/* Unidad de Medida */}
                  <Text style={styles.inputLabel}>4. Unidad de medida</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editUnidad}
                    onChangeText={setEditUnidad}
                    placeholder="Ej: mercados, cobijas, voluntarios"
                  />

                  {/* Ubicación con Autocompletado OSM */}
                  <Text style={styles.inputLabel}>5. Ubicación en Colombia *</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="location-outline" size={18} color={COLORS.primary} style={{ marginLeft: 10 }} />
                    <TextInput
                      style={styles.textInputFlex}
                      value={editUbicacion}
                      onChangeText={(t) => {
                        setEditUbicacion(t);
                        setEditCoords(null);
                      }}
                      placeholder="Ej: Cancha Barrio Boston, Pereira"
                    />
                    {loadingOsm ? (
                      <Text style={styles.osmBadge}>Buscando...</Text>
                    ) : null}
                  </View>

                  {/* Sugerencias flotantes OSM */}
                  {showSuggestions && osmSuggestions.length > 0 ? (
                    <View style={styles.osmSuggestionsBox}>
                      <Text style={styles.osmSuggestionsTitle}>Sugerencias OpenStreetMap:</Text>
                      {osmSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item.place_id}
                          style={styles.osmSuggestionRow}
                          onPress={() => handleSelectOsmPlace(item)}
                        >
                          <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
                          <Text style={styles.osmSuggestionText} numberOfLines={2}>
                            {item.display_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  {/* WhatsApp */}
                  <Text style={styles.inputLabel}>6. WhatsApp / Celular de contacto</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="logo-whatsapp" size={18} color={COLORS.whatsappGreen} style={{ marginLeft: 10 }} />
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.countryCodeBadgeText}>🇨🇴 +57</Text>
                    </View>
                    <TextInput
                      style={styles.textInputFlex}
                      value={editWhatsapp}
                      onChangeText={setEditWhatsapp}
                      keyboardType="phone-pad"
                      placeholder="3125550192"
                    />
                  </View>

                  {/* Foto Adjunta */}
                  <Text style={styles.inputLabel}>7. Imagen o fotografía (Opcional)</Text>
                  {editImagenUrl ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: editImagenUrl }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setEditImagenUrl(null)}
                      >
                        <Ionicons name="trash-bin" size={16} color="#FFFFFF" />
                        <Text style={styles.removeImageText}>Quitar Imagen</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickImageBtn}
                      activeOpacity={0.8}
                      onPress={handleSelectImageSource}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                      )}
                      <Text style={styles.pickImageText}>
                        {uploadingImage ? "Subiendo foto..." : "Cambiar / Agregar Fotografía"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Descripción */}
                  <Text style={styles.inputLabel}>8. Descripción detallada</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={editDescripcion}
                    onChangeText={setEditDescripcion}
                    multiline={true}
                    numberOfLines={4}
                    placeholder="Detalles sobre cómo entregar la ayuda o puntos de acopio..."
                  />

                  {/* Botón Guardar */}
                  <TouchableOpacity
                    style={[styles.saveBtn, savingEdit && styles.saveBtnDisabled]}
                    activeOpacity={0.85}
                    onPress={handleSaveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    )}
                    <Text style={styles.saveBtnText}>
                      {savingEdit ? "Guardando Cambios..." : "Guardar Cambios"}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Modal>
        ) : null}
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
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  authBanner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  authBannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 12,
    textAlign: "center",
  },
  authBannerText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCompleted: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  statusAndDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  statusActiveText: {
    color: COLORS.primary,
  },
  statusCompleted: {
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  statusCompletedText: {
    color: "#15803D",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  timeAgoText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  needImage: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 14,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },
  toggleButton: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  completeButton: {
    backgroundColor: "#16A34A",
  },
  reopenButton: {
    backgroundColor: "#475569",
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  deleteButton: {
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
  },
  nonOwnerBanner: {
    backgroundColor: "#F1F5F9",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  nonOwnerText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },

  // --- MODAL DE EDICIÓN STYLES ---
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  editFormScroll: {
    padding: 18,
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  rowTwoCols: {
    flexDirection: "row",
    gap: 12,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  countryCodeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 6,
  },
  countryCodeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  textInputFlex: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  osmBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    paddingRight: 10,
  },
  osmSuggestionsBox: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
  },
  osmSuggestionsTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  osmSuggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  osmSuggestionText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
  },
  imagePreviewContainer: {
    alignItems: "center",
    gap: 8,
  },
  imagePreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  removeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  removeImageText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  pickImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  pickImageText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
