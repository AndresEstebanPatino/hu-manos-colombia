import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CategoriaNecesidad, TipoNecesidad } from "../../src/types/need";
import { createNeed, formatWhatsAppNumber } from "../../src/services/storage";
import { CATEGORY_CONFIGS, COLORS } from "../../src/constants/theme";
import { useNotifications } from "../../src/context/NotificationContext";
import { useAuth } from "../../src/context/AuthContext";
import { notifyNewNeedCreated } from "../../src/services/pushNotifications";
import { supabase, isSupabaseConfigured } from "../../src/lib/supabase";

export default function CreateNeedScreen() {
  const router = useRouter();
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const [tipo, setTipo] = useState<TipoNecesidad>("RECURSO");
  const [categoria, setCategoria] = useState<CategoriaNecesidad>("ALIMENTOS");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [metaCantidad, setMetaCantidad] = useState("1");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    try {
      const created = await createNeed({
        tipo,
        categoria,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        ubicacion: ubicacion.trim(),
        contacto_whatsapp: whatsapp.trim() ? formatWhatsAppNumber(whatsapp.trim()) : "Opcional",
        meta_cantidad: cantidadNum,
        unidad_medida: unidadMedida.trim() || (tipo === "VOLUNTARIO" ? "voluntarios" : "unidades"),
        creador_id: user?.id || "anonimo",
      });

      // Insertar explícitamente en la tabla 'notificaciones' de Supabase
      if (isSupabaseConfigured()) {
        try {
          await supabase.from("notificaciones").insert([
            {
              titulo: "🚨 Nueva solicitud creada",
              mensaje: `${titulo.trim()} - ${ubicacion.trim()}`,
              tipo: "NUEVO_EVENTO",
              necesidad_id: created.id,
              creado_por: user?.id || "anonimo",
            },
          ]);
        } catch (notifErr) {
          console.log("Info notificación:", notifErr);
        }
      }

      showToast("🎉 ¡Publicado con Éxito!", `Tu solicitud "${created.titulo}" ya está visible para la comunidad.`, "success");

      // Disparar Notificación Push a los demás usuarios de Hu-Manos Colombia
      notifyNewNeedCreated(
        created.titulo,
        created.ubicacion,
        created.id,
        user?.id || "anonimo"
      );

      // Limpiar formulario y volver al feed
      setTitulo("");
      setDescripcion("");
      setUbicacion("");
      setWhatsapp("");
      setMetaCantidad("1");
      setUnidadMedida("");
      router.push("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la solicitud. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Publicar Solicitud de Ayuda</Text>
          <Text style={styles.headerSubtitle}>
            Sin registros ni esperas. Tu comunidad te escucha.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Selector de Tipo (Recurso vs Voluntario) */}
          <Text style={styles.label}>1. ¿Qué estás necesitando?</Text>
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
                  Donación de Recurso
                </Text>
                <Text style={styles.typeOptionDesc}>
                  Alimentos, cobijas, pañales, medicinas o kits.
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
                color={tipo === "VOLUNTARIO" ? COLORS.flagYellow : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.typeOptionTitle,
                    tipo === "VOLUNTARIO" && styles.typeOptionTitleSelectedVoluntario,
                  ]}
                >
                  Manos Voluntarias
                </Text>
                <Text style={styles.typeOptionDesc}>
                  Remoción de escombros, cocina comunitaria, médicos o transporte.
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
                    isSelected && { backgroundColor: config.color, borderColor: config.color },
                  ]}
                  onPress={() => setCategoria(config.key as CategoriaNecesidad)}
                >
                  <Text style={styles.categoryEmoji}>{config.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && { color: "#FFFFFF" },
                    ]}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Título de la Necesidad */}
          <Text style={styles.label}>3. Título claro y conciso *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Se requieren 10 cobijas térmicas para albergue temporal"
            placeholderTextColor="#94A3B8"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={100}
          />

          {/* Meta y Unidad */}
          <View style={styles.rowTwoInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>4. Meta requerida *</Text>
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
                placeholder={tipo === "VOLUNTARIO" ? "voluntarios" : "unidades / mercados"}
                placeholderTextColor="#94A3B8"
                value={unidadMedida}
                onChangeText={setUnidadMedida}
              />
            </View>
          </View>

          {/* Ubicación Exacta */}
          <Text style={styles.label}>6. Ubicación o punto de encuentro en Colombia *</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.inputFlex}
              placeholder="Ej: Cancha Barrio Boston, Pereira (Risaralda)"
              placeholderTextColor="#94A3B8"
              value={ubicacion}
              onChangeText={setUbicacion}
            />
          </View>

          {/* Número de WhatsApp */}
          <Text style={styles.label}>7. Número de WhatsApp / Celular (Opcional)</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="logo-whatsapp" size={20} color={COLORS.whatsappGreen} style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.inputFlex}
              placeholder="Ej: 3125550192 (se añade +57 automáticamente)"
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

          {/* Botón de Publicación */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Ionicons name="paper-plane-sharp" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {submitting ? "Publicando en Colombia..." : "Publicar Solicitud Ahora"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
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
    borderColor: COLORS.flagYellow,
    backgroundColor: COLORS.flagYellowLight,
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
    color: COLORS.flagYellow,
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
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
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
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
