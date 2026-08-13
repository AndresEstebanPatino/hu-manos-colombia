import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { reportScamNeed, ReportReason } from "../services/storage";

interface ReportModalProps {
  visible: boolean;
  necesidadId: string;
  necesidadTitulo: string;
  userId: string;
  onClose: () => void;
  onSuccess: (newCount?: number) => void;
}

const REASON_OPTIONS: { key: ReportReason; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    key: "PIDE_DINERO",
    label: "Pide dinero o transferencias bancarias",
    icon: "cash-outline",
  },
  {
    key: "CONTACTO_SOSPECHOSO",
    label: "Contacto sospechoso / Teléfono falso",
    icon: "call-outline",
  },
  {
    key: "INFO_FALSA",
    label: "Información o datos de la emergencia falsos",
    icon: "alert-circle-outline",
  },
  {
    key: "OTRO",
    label: "Otro motivo",
    icon: "ellipsis-horizontal-circle-outline",
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  necesidadId,
  necesidadTitulo,
  userId,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>("PIDE_DINERO");
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userId || userId.startsWith("guest-") || userId === "anonimo") {
      Alert.alert(
        "Inicio de Sesión Requerido",
        "Necesitas iniciar sesión para poder enviar un reporte."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await reportScamNeed(necesidadId, userId, selectedReason, comentario);
      if (res.success) {
        Alert.alert(
          "🚨 Reporte Registrado",
          res.message,
          [
            {
              text: "Entendido",
              onPress: () => {
                onClose();
                onSuccess(res.newSpamCount);
              },
            },
          ]
        );
      } else {
        Alert.alert("Aviso de Reporte", res.message);
        onClose();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo procesar el reporte.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardContainer}
          >
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <Ionicons name="flag" size={24} color={COLORS.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Reportar Solicitud</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    "{necesidadTitulo}"
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.instruction}>
                Selecciona la razón principal por la que consideras que esta solicitud es sospechosa:
              </Text>

              {/* Opciones de Razón */}
              <View style={styles.optionsContainer}>
                {REASON_OPTIONS.map((opt) => {
                  const isSelected = selectedReason === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                      ]}
                      onPress={() => setSelectedReason(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={isSelected ? COLORS.danger : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={isSelected ? COLORS.danger : "#CBD5E1"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comentario Adicional */}
              <Text style={styles.commentLabel}>Comentario o detalle adicional (Opcional):</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Explica brevemente por qué reportas este caso..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                value={comentario}
                onChangeText={setComentario}
                maxLength={250}
              />

              {/* Botones de Acción */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Enviar Reporte</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  keyboardContainer: {
    width: "100%",
    maxWidth: 480,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  instruction: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 14,
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 10,
  },
  optionCardSelected: {
    borderColor: COLORS.danger,
    backgroundColor: "#FEF2F2",
  },
  optionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
  },
  optionLabelSelected: {
    fontWeight: "700",
    color: COLORS.danger,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
    minHeight: 65,
    textAlignVertical: "top",
    backgroundColor: "#F8FAFC",
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    gap: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
