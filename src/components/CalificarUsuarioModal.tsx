import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StarRatingInput } from "./StarRatingInput";
import { enviarCalificacion, borrarCalificacion, CalificacionItem } from "../services/reliabilityService";
import { COLORS } from "../constants/theme";

interface CalificarUsuarioModalProps {
  visible: boolean;
  necesidadId: string;
  calificadoId: string;
  calificadorId: string;
  calificacionExistente?: CalificacionItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CalificarUsuarioModal: React.FC<CalificarUsuarioModalProps> = ({
  visible,
  necesidadId,
  calificadoId,
  calificadorId,
  calificacionExistente,
  onClose,
  onSuccess,
}) => {
  const [estrellas, setEstrellas] = useState<number>(5);
  const [comentario, setComentario] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      if (calificacionExistente) {
        setEstrellas(calificacionExistente.estrellas || 5);
        setComentario(calificacionExistente.comentario || "");
      } else {
        setEstrellas(5);
        setComentario("");
      }
    }
  }, [visible, calificacionExistente]);

  const handleSubmit = async () => {
    if (estrellas < 1 || estrellas > 5) {
      Alert.alert("Requerido", "Por favor selecciona una puntuación de 1 a 5 estrellas.");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await enviarCalificacion(
        necesidadId,
        calificadoId,
        calificadorId,
        estrellas,
        comentario
      );

      if (ok) {
        Alert.alert("¡Gracias!", "Tu evaluación comunitaria ha sido registrada.");
        onSuccess();
        onClose();
      } else {
        Alert.alert("Aviso", "No se pudo guardar la evaluación. Revisa tu conexión.");
      }
    } catch (err) {
      Alert.alert("Error", "Ocurrió un problema al guardar tu evaluación.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!calificacionExistente?.id) return;

    Alert.alert("Eliminar Calificación", "¿Deseas borrar tu evaluación para este usuario?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          const ok = await borrarCalificacion(calificacionExistente.id);
          setSubmitting(false);
          if (ok) {
            onSuccess();
            onClose();
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="star" size={22} color="#F59E0B" />
              <Text style={styles.headerTitle}>
                {calificacionExistente ? "Editar Tu Evaluación" : "Evaluar Apoyo Recibido"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Tu calificación ayuda a la comunidad a verificar el cumplimiento de los eventos y evitar estafas.
          </Text>

          {/* Selector de Estrellas */}
          <Text style={styles.label}>1. Puntuación (1 a 5 estrellas) *</Text>
          <View style={styles.ratingBox}>
            <StarRatingInput rating={estrellas} onChangeRating={setEstrellas} size={36} />
            <Text style={styles.ratingLabel}>
              {estrellas === 5
                ? "⭐⭐⭐⭐⭐ ¡Excelente cumplimiento!"
                : estrellas === 4
                ? "⭐⭐⭐⭐ Muy bueno"
                : estrellas === 3
                ? "⭐⭐⭐ Cumplió lo básico"
                : estrellas === 2
                ? "⭐⭐ Deficiente"
                : "⭐ Incompleto o insatisfecho"}
            </Text>
          </View>

          {/* Comentario Opcional */}
          <Text style={styles.label}>2. Comentario o Testimonio (Opcional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ej: Cumplió entregando las cobijas a tiempo en la comunidad."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={comentario}
            onChangeText={setComentario}
          />

          <View style={styles.buttonsRow}>
            {calificacionExistente ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={submitting}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {calificacionExistente ? "Actualizar Evaluación" : "Guardar Evaluación"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  ratingBox: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 70,
    textAlignVertical: "top",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
