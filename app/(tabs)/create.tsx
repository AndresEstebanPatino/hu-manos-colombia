import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar as RNStatusBar,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CategoriaNecesidad, TipoNecesidad, ModoNecesidad } from "../../src/types/need";
import { createNeed, formatWhatsAppNumber, getValidSupabaseUserId } from "../../src/services/storage";
import { CATEGORY_CONFIGS, COLORS } from "../../src/constants/theme";
import { useNotifications } from "../../src/context/NotificationContext";
import { useAuth } from "../../src/context/AuthContext";
import { notifyNewNeedCreated } from "../../src/services/pushNotifications";
import { supabase, isSupabaseConfigured } from "../../src/lib/supabase";
import { getCurrentGPSCoordinates } from "../../src/services/locationService";
import { LocationPickerModal } from "../../src/components/LocationPickerModal";
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

/**
 * Lógica dinámica para la unidad de medida según tipo y categoría seleccionada
 */
export const getDynamicUnitInfo = (tipo: TipoNecesidad, categoria: CategoriaNecesidad) => {
  if (tipo === "VOLUNTARIO" || categoria === "MANO_DE_OBRA") {
    return {
      defaultUnit: "voluntarios",
      placeholder: "Ej: voluntarios, personas, horas",
      suggestions: ["voluntarios", "personas", "turnos", "horas"],
    };
  }

  switch (categoria) {
    case "BEBES_LACTANCIA":
      return {
        defaultUnit: "paquetes",
        placeholder: "Ej: latas de fórmula, pañales",
        suggestions: ["paquetes", "latas de fórmula", "pañales", "kits de aseo"],
      };
    case "ALIMENTOS":
      return {
        defaultUnit: "mercados",
        placeholder: "Ej: mercados, botellas de agua, kilos",
        suggestions: ["mercados", "botellas de agua", "enlatados", "kilos"],
      };
    case "ROPA_COBIJAS":
      return {
        defaultUnit: "cobijas",
        placeholder: "Ej: cobijas, colchonetas, prendas",
        suggestions: ["cobijas", "colchonetas", "prendas", "kits de abrigo"],
      };
    case "SALUD":
      return {
        defaultUnit: "kits de auxilio",
        placeholder: "Ej: kits de gasas, medicamentos",
        suggestions: ["kits de auxilio", "medicamentos", "médicos", "sueros"],
      };
    case "OTRO":
    default:
      return {
        defaultUnit: "unidades",
        placeholder: "Ej: herramientas, linternas, cajas",
        suggestions: ["unidades", "paquetes", "herramientas", "kits"],
      };
  }
};

export default function CreateNeedScreen() {
  const router = useRouter();
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const [modo, setModo] = useState<ModoNecesidad>("SOLICITUD");
  const [tipo, setTipo] = useState<TipoNecesidad>("RECURSO");
  const [categoria, setCategoria] = useState<CategoriaNecesidad>("ALIMENTOS");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [metaCantidad, setMetaCantidad] = useState("1");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [coords, setCoords] = useState<{ latitud?: number; longitud?: number } | null>(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estados para autocompletado debounced de OpenStreetMap Nominatim
  const [osmSuggestions, setOsmSuggestions] = useState<NominatimPlace[]>([]);
  const [loadingOsm, setLoadingOsm] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const currentUnitInfo = getDynamicUnitInfo(tipo, categoria);

  // Debounce de ~800ms para autocompletado de direcciones con OpenStreetMap
  useEffect(() => {
    if (!ubicacion || ubicacion.trim().length < 3) {
      setOsmSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingOsm(true);
      try {
        const places = await buscarDireccionOSM(ubicacion);
        setOsmSuggestions(places);
        setShowSuggestions(places.length > 0);
      } catch (err) {
        console.log("OSM autocompletado info:", err);
      } finally {
        setLoadingOsm(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [ubicacion]);

  const handleSelectOsmPlace = (place: NominatimPlace) => {
    const formattedTitle = formatNominatimTitle(place.display_name);
    setUbicacion(formattedTitle);
    setCoords({
      latitud: parseFloat(place.lat),
      longitud: parseFloat(place.lon),
    });
    setShowSuggestions(false);
    showToast("📍 Dirección Verificada (OSM)", formattedTitle, "success");
  };

  const handleConfirmMapLocation = (res: { latitud: number; longitud: number; direccion: string }) => {
    setCoords({ latitud: res.latitud, longitud: res.longitud });
    setUbicacion(res.direccion);
    showToast("📍 Ubicación Seleccionada", `Dirección: ${res.direccion}`, "success");
  };

  // Actualizar automáticamente la unidad de medida cuando cambia el Tipo o la Categoría
  useEffect(() => {
    setUnidadMedida(currentUnitInfo.defaultUnit);
  }, [tipo, categoria]);

  const handleSelectImageSource = () => {
    Alert.alert(
      "📷 Agregar Foto a la Solicitud",
      "Elige de dónde deseas capturar o seleccionar la imagen:",
      [
        {
          text: "📷 Tomar Foto con la Cámara",
          onPress: () => processImagePick("CAMERA"),
        },
        {
          text: "🖼️ Elegir de la Galería",
          onPress: () => processImagePick("GALLERY"),
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ]
    );
  };

  const processImagePick = async (sourceType: "CAMERA" | "GALLERY") => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (sourceType === "CAMERA") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permiso requerido", "Activa el permiso de cámara en la configuración del dispositivo.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permiso requerido", "Activa el acceso a la galería en la configuración del dispositivo.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        const rawUri = result.assets[0].uri;
        setImagenUri(rawUri);
        setImagenUrl(null);

        // Subir a Supabase Storage mediante función unificada que usa FileSystem + base64
        if (isSupabaseConfigured()) {
          setUploadingImage(true);
          try {
            await getValidSupabaseUserId();
            const publicUrl = await uploadImageToSupabaseStorage(rawUri);
            setImagenUrl(publicUrl);
          } catch (uploadErr: any) {
            console.error("Upload error:", uploadErr);
            Alert.alert("⚠️ Error al subir foto", `No se pudo subir la foto al servidor: ${uploadErr?.message || "Error de red."}`);
          } finally {
            setUploadingImage(false);
          }
        }
      }
    } catch (err) {
      console.error("ImagePicker error:", err);
    }
  };

  const handleFetchGPS = async () => {
    setLoadingGPS(true);
    try {
      const res = await getCurrentGPSCoordinates();
      if (res) {
        setCoords({ latitud: res.latitud, longitud: res.longitud });
        if (res.direccionAproximada && !ubicacion) {
          setUbicacion(res.direccionAproximada);
        }
        showToast("📍 Ubicación GPS Capturada", `Coordenadas: ${res.latitud.toFixed(4)}, ${res.longitud.toFixed(4)}`, "success");
      } else {
        Alert.alert("Permiso o GPS no disponible", "Activa el GPS en tu dispositivo o navegador para ubicar la ayuda en el mapa.");
      }
    } catch (err) {
      console.error("GPS error:", err);
    } finally {
      setLoadingGPS(false);
    }
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !ubicacion.trim()) {
      Alert.alert("Campos requeridos", "Por favor completa el título descriptivo y la ubicación.");
      return;
    }

    const cantidadNum = parseInt(metaCantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      Alert.alert("Cantidad inválida", "Ingresa una meta numérica válida (ej: 1, 5, 20).");
      return;
    }

    setSubmitting(true);

    let finalLat = coords?.latitud;
    let finalLng = coords?.longitud;

    // Si el usuario escribió la dirección manualmente sin tocar una sugerencia ni usar GPS, intentar geocodificar con OSM
    if (!finalLat && ubicacion.trim().length >= 3) {
      try {
        const places = await buscarDireccionOSM(ubicacion.trim());
        if (places && places.length > 0) {
          finalLat = parseFloat(places[0].lat);
          finalLng = parseFloat(places[0].lon);
        }
      } catch (err) {
        console.log("Geocodificación OSM fallback info:", err);
      }
    }

    try {
      const created = await createNeed({
        tipo,
        modo,
        categoria,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        ubicacion: ubicacion.trim(),
        contacto_whatsapp: whatsapp.trim() ? formatWhatsAppNumber(whatsapp.trim()) : "Opcional",
        meta_cantidad: cantidadNum,
        unidad_medida: unidadMedida.trim() || currentUnitInfo.defaultUnit,
        creador_id: user?.id,
        latitud: finalLat,
        longitud: finalLng,
        imagen_url: imagenUrl || undefined,
      });

      // Confirmar que la necesidad fue creada válidamente con ID
      if (!created || !created.id) {
        throw new Error("No se pudo obtener la confirmación de guardado de la necesidad.");
      }

      // Notificación visual de éxito SOLO tras confirmación de guardado en el servidor
      showToast(
        "🎉 ¡Publicado con Éxito!",
        `Tu solicitud "${created.titulo}" ya está guardada y visible para toda la comunidad.`,
        "success"
      );

      // Disparar Notificación Push a los demás usuarios de Hu-Manos Colombia
      notifyNewNeedCreated(
        created.titulo,
        created.ubicacion,
        created.id,
        created.creador_id || user?.id
      );

      // Limpiar formulario y volver al feed principal
      setTitulo("");
      setDescripcion("");
      setUbicacion("");
      setWhatsapp("");
      setMetaCantidad("1");
      setUnidadMedida("");
      setCoords(null);
      setImagenUri(null);
      setImagenUrl(null);

      router.push("/");
    } catch (err: any) {
      console.error("❌ Error al publicar necesidad:", err);
      Alert.alert(
        "⚠️ No se pudo publicar la solicitud",
        `Ocurrió un problema al guardar tu ayuda en el servidor:\n\n${err?.message || "Error de conexión o permisos en la base de datos."}\n\nPor favor intenta nuevamente. Tu información ingresada no se ha perdido.`,
        [{ text: "Entendido", style: "default" }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {modo === "SOLICITUD" ? "Publicar Solicitud de Ayuda" : "Publicar Oferta de Ayuda"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {modo === "SOLICITUD"
              ? "Sin registros ni esperas. Tu comunidad te escucha."
              : "Comparte víveres, transporte o tu tiempo con la comunidad."}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Selector de Modo: SOLICITUD vs OFERTA */}
          <Text style={styles.label}>¿Qué deseas publicar?</Text>
          <View style={styles.modoSelectorRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.modoOptionCard,
                modo === "SOLICITUD" && styles.modoOptionCardSolicitud,
              ]}
              onPress={() => setModo("SOLICITUD")}
            >
              <Text style={styles.modoIconEmoji}>🆘</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modoTitleText, modo === "SOLICITUD" && styles.modoTitleTextSolicitud]}>
                  Necesito Ayuda
                </Text>
                <Text style={styles.modoDescText}>Publicar una solicitud</Text>
              </View>
              {modo === "SOLICITUD" ? (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.danger} />
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.modoOptionCard,
                modo === "OFERTA" && styles.modoOptionCardOferta,
              ]}
              onPress={() => setModo("OFERTA")}
            >
              <Text style={styles.modoIconEmoji}>🤝</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modoTitleText, modo === "OFERTA" && styles.modoTitleTextOferta]}>
                  Puedo Ofrecer Ayuda
                </Text>
                <Text style={styles.modoDescText}>Publicar donación o apoyo</Text>
              </View>
              {modo === "OFERTA" ? (
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.modoOptionCard, styles.modoOptionCardPersona]}
              onPress={() => router.push("/reencuentro")}
            >
              <Text style={styles.modoIconEmoji}>🔎</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modoTitleText, styles.modoTitleTextPersona]}>
                  Reportar Persona
                </Text>
                <Text style={styles.modoDescText}>Buscar o reportar a alguien (Reencuentro)</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Selector de Tipo (Recurso vs Voluntario) */}
          <Text style={styles.label}>
            {modo === "SOLICITUD" ? "1. ¿Qué estás necesitando?" : "1. ¿Qué estás ofreciendo?"}
          </Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.typeOption,
                tipo === "RECURSO" && styles.typeOptionSelectedResource,
              ]}
              onPress={() => setTipo("RECURSO")}
            >
              <Ionicons
                name="cube-outline"
                size={22}
                color={tipo === "RECURSO" ? COLORS.primary : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.typeOptionTitle,
                    tipo === "RECURSO" && styles.typeOptionTitleSelectedResource,
                  ]}
                >
                  {modo === "SOLICITUD" ? "Donación de Recurso" : "Recurso / Bien Físico"}
                </Text>
                <Text style={styles.typeOptionDesc}>
                  {modo === "SOLICITUD"
                    ? "Alimentos, cobijas, pañales, medicinas o kits."
                    : "Alimentos sobrantes, ropa, cobijas, agua o suministros."}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.typeOption,
                tipo === "VOLUNTARIO" && styles.typeOptionSelectedVoluntario,
              ]}
              onPress={() => setTipo("VOLUNTARIO")}
            >
              <Ionicons
                name="people-outline"
                size={22}
                color={tipo === "VOLUNTARIO" ? COLORS.primary : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.typeOptionTitle,
                    tipo === "VOLUNTARIO" && styles.typeOptionTitleSelectedVoluntario,
                  ]}
                >
                  {modo === "SOLICITUD" ? "Manos Voluntarias" : "Tiempo / Manos Voluntarias"}
                </Text>
                <Text style={styles.typeOptionDesc}>
                  {modo === "SOLICITUD"
                    ? "Remoción de escombros, cocina comunitaria o médicos."
                    : "Camioneta 4x4, apoyo en remoción, cocina o curaciones."}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Selector de Categoría */}
          <Text style={styles.label}>2. Categoría de la ayuda *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {Object.values(CATEGORY_CONFIGS).map((config) => {
              const isSelected = categoria === config.key;
              return (
                <TouchableOpacity
                  key={config.key}
                  activeOpacity={0.8}
                  style={[
                    styles.categoryChip,
                    isSelected ? styles.categoryChipSelected : styles.categoryChipUnselected,
                  ]}
                  onPress={() => setCategoria(config.key as CategoriaNecesidad)}
                >
                  <Text style={styles.categoryEmoji}>{config.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected ? styles.categoryChipTextSelected : styles.categoryChipTextUnselected,
                    ]}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Título de la Necesidad / Oferta */}
          <Text style={styles.label}>
            {modo === "SOLICITUD" ? "3. Título descriptivo de la solicitud *" : "3. Título descriptivo de la oferta *"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              modo === "SOLICITUD"
                ? tipo === "VOLUNTARIO"
                  ? "Ej: Se necesitan 10 personas para despejar vía derrumbada"
                  : "Ej: Se requieren 15 cobijas térmicas y colchonetas"
                : tipo === "VOLUNTARIO"
                ? "Ej: Ofrezco camioneta 4x4 y tiempo para transporte de víveres"
                : "Ej: Dispongo de 20 paquetes de agua y cobijas limpias"
            }
            placeholderTextColor="#94A3B8"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={100}
          />

          {/* Meta y Unidad Dinámica */}
          <View style={styles.rowTwoInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                {modo === "SOLICITUD" ? "4. Meta requerida *" : "4. Cantidad disponible *"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 10"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={metaCantidad}
                onChangeText={setMetaCantidad}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>5. Unidad de medida</Text>
              <TextInput
                style={styles.input}
                placeholder={currentUnitInfo.placeholder}
                placeholderTextColor="#94A3B8"
                value={unidadMedida}
                onChangeText={setUnidadMedida}
              />
            </View>
          </View>

          {/* Sugerencias Rápidas de Unidades de Medida */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Sugerencias rápidas:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {currentUnitInfo.suggestions.map((suggestion) => {
                const isSelected = unidadMedida === suggestion;
                return (
                  <TouchableOpacity
                    key={suggestion}
                    activeOpacity={0.7}
                    onPress={() => setUnidadMedida(suggestion)}
                    style={[
                      styles.suggestionChip,
                      isSelected && styles.suggestionChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.suggestionText,
                        isSelected && styles.suggestionTextSelected,
                      ]}
                    >
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Ubicación Exacta con Captura de GPS o Pin en Mapa Tipo Uber */}
          <View style={styles.labelRowWithGPS}>
            <Text style={styles.labelNoMargin}>6. Ubicación en Colombia *</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.mapPickerBtn}
                onPress={() => setShowMapPicker(true)}
              >
                <Ionicons name="map-sharp" size={14} color={COLORS.primary} />
                <Text style={styles.mapPickerBtnText}>Pin en Mapa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.gpsButton, coords?.latitud ? styles.gpsButtonSuccess : null]}
                onPress={handleFetchGPS}
                disabled={loadingGPS}
              >
                <Ionicons
                  name={coords?.latitud ? "checkmark-circle" : "location"}
                  size={14}
                  color={coords?.latitud ? "#16A34A" : COLORS.primary}
                />
                <Text style={[styles.gpsButtonText, coords?.latitud ? styles.gpsButtonTextSuccess : undefined]}>
                  {loadingGPS ? "GPS..." : coords?.latitud ? "GPS OK" : "Mi GPS"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputWithIcon}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.inputFlex}
              placeholder="Ej: Cancha Barrio Boston, Pereira (Risaralda)"
              placeholderTextColor="#94A3B8"
              value={ubicacion}
              onChangeText={(text) => {
                setUbicacion(text);
                setCoords(null);
              }}
            />
            {loadingOsm ? (
              <Text style={styles.osmLoadingBadge}>Buscando OSM...</Text>
            ) : null}
          </View>

          {/* Autocompletado de Sugerencias OpenStreetMap Nominatim */}
          {showSuggestions && osmSuggestions.length > 0 ? (
            <View style={styles.osmSuggestionsContainer}>
              <View style={styles.osmSuggestionsHeader}>
                <Ionicons name="map-outline" size={14} color={COLORS.primary} />
                <Text style={styles.osmSuggestionsHeaderText}>
                  Sugerencias OpenStreetMap (Colombia):
                </Text>
              </View>
              {osmSuggestions.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.osmSuggestionItem}
                  activeOpacity={0.7}
                  onPress={() => handleSelectOsmPlace(item)}
                >
                  <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
                  <Text style={styles.osmSuggestionText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Número de WhatsApp con Selector de Código de País (+57 por defecto) */}
          <Text style={styles.label}>7. Número de WhatsApp / Celular (Opcional)</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="logo-whatsapp" size={20} color={COLORS.whatsappGreen} style={{ marginLeft: 12 }} />
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryCodeBadgeText}>🇨🇴 +57</Text>
            </View>
            <TextInput
              style={styles.inputFlex}
              placeholder="3125550192"
              placeholderTextColor="#94A3B8"
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
            />
          </View>

          {/* Descripción Detallada */}
          <Text style={styles.label}>8. Descripción o instrucciones adicionales</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Explica detalladamente la situación, el estado de la emergencia o qué elementos específicos se necesitan..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={descripcion}
            onChangeText={setDescripcion}
            textAlignVertical="top"
          />

          {/* Foto Opcional del Evento / Necesidad */}
          <Text style={styles.label}>9. Foto del lugar o recurso (Opcional)</Text>
          <TouchableOpacity
            style={styles.imagePickerBtn}
            onPress={handleSelectImageSource}
            activeOpacity={0.8}
            disabled={uploadingImage}
          >
            <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
            <Text style={styles.imagePickerText}>
              {uploadingImage
                ? "Subiendo imagen..."
                : imagenUri
                ? "Cambiar foto seleccionada"
                : "Adjuntar foto (Cámara o Galería)"}
            </Text>
            {imagenUrl ? <Ionicons name="checkmark-circle" size={18} color="#16A34A" /> : null}
          </TouchableOpacity>

          {/* Preview de la imagen seleccionada */}
          {imagenUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imagenUri }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => { setImagenUri(null); setImagenUrl(null); }}
              >
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              {imagenUrl ? (
                <View style={styles.uploadedBadge}>
                  <Ionicons name="cloud-done" size={12} color="#FFFFFF" />
                  <Text style={styles.uploadedBadgeText}>Subida</Text>
                </View>
              ) : uploadingImage ? (
                <View style={[styles.uploadedBadge, { backgroundColor: "#F59E0B" }]}>
                  <Text style={styles.uploadedBadgeText}>Subiendo...</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Botón de Publicación Dinámico según Modo */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.submitButton,
              modo === "OFERTA" && styles.submitButtonOferta,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || uploadingImage}
          >
            <Ionicons name={modo === "SOLICITUD" ? "paper-plane-sharp" : "heart"} size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {submitting
                ? modo === "SOLICITUD"
                  ? "Publicando Solicitud..."
                  : "Publicando Oferta..."
                : modo === "SOLICITUD"
                ? "Publicar Solicitud Ahora"
                : "Publicar Oferta de Ayuda"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Interactivo de Ubicación Tipo Uber */}
      <LocationPickerModal
        visible={showMapPicker}
        initialCoords={coords?.latitud && coords?.longitud ? { latitude: coords.latitud, longitude: coords.longitud } : undefined}
        onConfirmLocation={handleConfirmMapLocation}
        onClose={() => setShowMapPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  modoSelectorRow: {
    gap: 10,
    marginBottom: 8,
  },
  modoOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 12,
  },
  modoOptionCardSolicitud: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  modoOptionCardOferta: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  modoOptionCardPersona: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  modoTitleTextPersona: {
    color: COLORS.primary,
  },
  modoIconEmoji: {
    fontSize: 24,
  },
  modoTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  modoTitleTextSolicitud: {
    color: COLORS.danger,
  },
  modoTitleTextOferta: {
    color: "#047857",
  },
  modoDescText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  countryCodeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 6,
    marginRight: 4,
  },
  countryCodeBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
  },
  labelNoMargin: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  labelRowWithGPS: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 6,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  gpsButtonSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  gpsButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  gpsButtonTextSuccess: {
    color: "#16A34A",
  },
  mapPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  mapPickerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  typeSelector: {
    gap: 8,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 12,
  },
  typeOptionSelectedResource: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  typeOptionSelectedVoluntario: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  typeOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  typeOptionTitleSelectedResource: {
    color: COLORS.primary,
  },
  typeOptionTitleSelectedVoluntario: {
    color: COLORS.primary,
  },
  typeOptionDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  categoryChipUnselected: {
    backgroundColor: COLORS.neutralLight,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 13,
  },
  categoryChipTextUnselected: {
    color: COLORS.neutralDark,
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  rowTwoInputs: {
    flexDirection: "row",
    gap: 12,
  },
  suggestionsContainer: {
    marginTop: 6,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  suggestionChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  suggestionTextSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  inputFlex: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  osmLoadingBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    paddingRight: 10,
  },
  osmSuggestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  osmSuggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  osmSuggestionsHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },
  osmSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  osmSuggestionText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 16,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonOferta: {
    backgroundColor: "#059669",
    shadowColor: "#059669",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: COLORS.primaryLight,
  },
  imagePickerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  imagePreviewContainer: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
  },
  uploadedBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  uploadedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
