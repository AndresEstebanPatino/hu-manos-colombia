import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { ModoNecesidad, TipoEntrega, ContribucionLogistica } from "../types/need";

interface ConfirmarAyudaModalProps {
  visible: boolean;
  modo?: ModoNecesidad;
  tituloNecesidad: string;
  onClose: () => void;
  onConfirmWithoutDetails: () => void;
  onConfirmWithDetails: (logistica: ContribucionLogistica) => void;
}

export const ConfirmarAyudaModal: React.FC<ConfirmarAyudaModalProps> = ({
  visible,
  modo = "SOLICITUD",
  tituloNecesidad,
  onClose,
  onConfirmWithoutDetails,
  onConfirmWithDetails,
}) => {
  const isOferta = modo === "OFERTA";

  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega | undefined>(undefined);
  const [ubicacionContacto, setUbicacionContacto] = useState("");
  const [notasLogistica, setNotasLogistica] = useState("");

  const handleConfirmWithDetails = () => {
    onConfirmWithDetails({
      tipo_entrega: tipoEntrega,
      ubicacion_contacto: ubicacionContacto.trim() || undefined,
      notas_logistica: notasLogistica.trim() || undefined,
    });
    resetForm();
  };

  const handleConfirmWithoutDetails = () => {
    onConfirmWithoutDetails();
    resetForm();
  };

  const resetForm = () => {
    setTipoEntrega(undefined);
    setUbicacionContacto("");
    setNotasLogistica("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalContent}>
          {/* Header Bar con Botón Cerrar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.modalTitle}>
                ¿Cómo prefieres coordinar? (Opcional)
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Nombre de la necesidad / oferta */}
          <Text style={styles.needTitleSub} numberOfLines={1}>
            {isOferta ? `🎁 ${tituloNecesidad}` : `🚨 ${tituloNecesidad}`}
          </Text>

          {/* 🔒 AVISO DE PRIVACIDAD OBLIGATORIO Y TRANSPARENTE */}
          <View style={styles.privacyNoticeCard}>
            <Text style={styles.privacyNoticeText}>
              🔒 Esta información solo la verá quien publicó la {isOferta ? "oferta" : "solicitud"}, para ayudar a coordinar el encuentro. No se hace pública ni la ven otros usuarios.
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Chips de Selección: Tipo de Entrega / Encuentro */}
            <Text style={styles.inputLabel}>Opción de entrega o encuentro (Opcional)</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.chip,
                  tipoEntrega === "RECOGE" && styles.chipSelected,
                ]}
                onPress={() => setTipoEntrega(tipoEntrega === "RECOGE" ? undefined : "RECOGE")}
              >
                <Text style={[styles.chipText, tipoEntrega === "RECOGE" && styles.chipTextSelected]}>
                  🚗 Yo recojo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.chip,
                  tipoEntrega === "NECESITA_ENTREGA" && styles.chipSelected,
                ]}
                onPress={() => setTipoEntrega(tipoEntrega === "NECESITA_ENTREGA" ? undefined : "NECESITA_ENTREGA")}
              >
                <Text style={[styles.chipText, tipoEntrega === "NECESITA_ENTREGA" && styles.chipTextSelected]}>
                  📦 Necesito que me lleven
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.chip,
                  tipoEntrega === "SE_ENCUENTRAN" && styles.chipSelected,
                ]}
                onPress={() => setTipoEntrega(tipoEntrega === "SE_ENCUENTRAN" ? undefined : "SE_ENCUENTRAN")}
              >
                <Text style={[styles.chipText, tipoEntrega === "SE_ENCUENTRAN" && styles.chipTextSelected]}>
                  🤝 Nos encontramos
                </Text>
              </TouchableOpacity>
            </View>

            {/* Campo 1: Punto de referencia o dirección */}
            <Text style={styles.inputLabel}>Punto de referencia o dirección (Opcional)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="location-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Frente a la iglesia del parque, Apto 302..."
                placeholderTextColor="#94A3B8"
                value={ubicacionContacto}
                onChangeText={setUbicacionContacto}
              />
            </View>

            {/* Campo 2: Notas adicionales de logística */}
            <Text style={styles.inputLabel}>Notas adicionales para el creador (Opcional)</Text>
            <View style={[styles.inputWrap, styles.textAreaWrap]}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Ej. Puedo pasar hoy después de las 5pm..."
                placeholderTextColor="#94A3B8"
                value={notasLogistica}
                onChangeText={setNotasLogistica}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* ══ DOS BOTONES VISUALMENTE PROMINENTES AL MISMO NIVEL ══ */}
            <View style={styles.dualButtonsContainer}>
              {/* Botón 1: Confirmar SIN detalles */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.btnSecondaryEqual}
                onPress={handleConfirmWithoutDetails}
              >
                <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
                <Text style={styles.btnSecondaryText}>Confirmar sin detalles</Text>
              </TouchableOpacity>

              {/* Botón 2: Confirmar CON detalles */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.btnPrimaryEqual}
                onPress={handleConfirmWithDetails}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>
                  {isOferta ? "Confirmar reserva" : "Confirmar ayuda"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  headerTitleGroup: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
  },
  needTitleSub: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 12,
  },
  privacyNoticeCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  privacyNoticeText: {
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 17,
    fontWeight: "500",
  },
  scrollBody: {
    paddingBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  chipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    minHeight: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    paddingVertical: 8,
  },
  textAreaWrap: {
    minHeight: 70,
    alignItems: "flex-start",
  },
  textArea: {
    textAlignVertical: "top",
  },
  dualButtonsContainer: {
    flexDirection: "column",
    gap: 10,
    marginTop: 14,
  },
  btnSecondaryEqual: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  btnPrimaryEqual: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
