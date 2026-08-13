import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants/theme";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWindowDimensions } from "react-native";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithPhone, signInQuick, signOut, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const [mode, setMode] = useState<"OPTIONS" | "PHONE" | "QUICK">("OPTIONS");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      Alert.alert("¡Sesión Iniciada!", "Te has identificado con tu cuenta de Google.");
      onClose();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("cancelado") || msg.includes("cancel")) {
        // El usuario canceló intencionalmente — no mostrar error alarmante
        return;
      }
      Alert.alert(
        "⚠️ No se pudo iniciar sesión",
        msg || "Ocurrió un error al conectar con Google. Verifica tu conexión e intenta de nuevo."
      );
    }
  };

  const handlePhoneSubmit = async () => {
    if (!telefono.trim()) {
      Alert.alert("Requerido", "Ingresa un número de celular de Colombia (+57).");
      return;
    }
    try {
      await signInWithPhone(telefono, nombre);
      Alert.alert("¡Verificado!", "Has registrado tu número de teléfono.");
      onClose();
    } catch (err) {
      Alert.alert("Error", "Ocurrió un problema al registrar el teléfono.");
    }
  };

  const handleQuickSubmit = async () => {
    if (!nombre.trim()) {
      Alert.alert("Requerido", "Ingresa tu nombre para identificarte en las ayudas.");
      return;
    }
    try {
      await signInQuick(nombre, telefono);
      Alert.alert("¡Bienvenido!", `Hola ${nombre}, tu perfil de ayuda está activo.`);
      onClose();
    } catch (err) {
      Alert.alert("Error", "No se pudo crear el perfil.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom + 20, 24) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <Text style={styles.title}>
                {user ? "Perfil de Usuario" : "Bienvenido a Hu-Manos Colombia"}
              </Text>
            </View>
            {user ? (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Si ya tiene sesión activa */}
          {user ? (
            <View style={styles.userProfileBox}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{user.nombre.charAt(0).toUpperCase()}</Text>
              </View>

              <Text style={styles.userNameText}>{user.nombre}</Text>
              <Text style={styles.userMethodBadge}>
                {user.metodo_auth === "GOOGLE"
                  ? "🌐 Cuenta de Google Verificada"
                  : user.metodo_auth === "TELEFONO"
                  ? `📱 Celular: ${user.telefono}`
                  : "⚡ Perfil Rápido Activo"}
              </Text>

              <TouchableOpacity
                style={styles.myAlertsButton}
                onPress={() => {
                  onClose();
                  router.push("/my-needs" as any);
                }}
              >
                <Ionicons name="megaphone" size={18} color="#FFFFFF" />
                <Text style={styles.myAlertsButtonText}>Mis Alertas Publicadas ➔</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aboutButton}
                onPress={() => {
                  onClose();
                  router.push("/acerca-de" as any);
                }}
              >
                <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                <Text style={styles.aboutButtonText}>Sobre la App / Políticas ℹ️</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.primary} />
                <Text style={styles.signOutText}>Cerrar Sesión / Cambiar Cuenta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.body}>
              {mode === "OPTIONS" && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.subtitle}>
                    Identifícate para evitar duplicados en las ayudas comunitarias y recibir seguridad.
                  </Text>

                  {/* Google OAuth Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.googleButton}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-google" size={20} color="#EA4335" />
                    <Text style={styles.googleText}>Ingresar con Cuenta de Google</Text>
                  </TouchableOpacity>

                  {/* Phone OTP Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.phoneButton}
                    onPress={() => setMode("PHONE")}
                  >
                    <Ionicons name="phone-portrait-sharp" size={20} color={COLORS.whatsappGreen} />
                    <Text style={styles.phoneText}>Ingresar con Celular / WhatsApp</Text>
                  </TouchableOpacity>

                  {/* Continuar como Invitado */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.quickButton}
                    onPress={async () => {
                      await signInQuick("Invitado Voluntario");
                      Alert.alert("Perfil Activo", "Has ingresado como invitado.");
                      onClose();
                    }}
                  >
                    <Ionicons name="person-circle-outline" size={20} color="#64748B" />
                    <Text style={styles.guestText}>Continuar como Invitado (Modo Anónimo)</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Formulario de Teléfono */}
              {mode === "PHONE" && (
                <View style={styles.formContainer}>
                  <TouchableOpacity onPress={() => setMode("OPTIONS")} style={styles.backLink}>
                    <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                    <Text style={styles.backText}>Volver a opciones</Text>
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Tu Nombre (Opcional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Carlos Restrepo"
                    placeholderTextColor="#94A3B8"
                    value={nombre}
                    onChangeText={setNombre}
                  />

                  <Text style={styles.inputLabel}>Número de Celular (+57) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 3125550192"
                    placeholderTextColor="#94A3B8"
                    value={telefono}
                    onChangeText={setTelefono}
                    keyboardType="phone-pad"
                  />

                  <TouchableOpacity style={styles.submitBtn} onPress={handlePhoneSubmit}>
                    <Text style={styles.submitBtnText}>Verificar Teléfono</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Formulario Rápido */}
              {mode === "QUICK" && (
                <View style={styles.formContainer}>
                  <TouchableOpacity onPress={() => setMode("OPTIONS")} style={styles.backLink}>
                    <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                    <Text style={styles.backText}>Volver a opciones</Text>
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Tu Nombre Completo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Ana María Gómez"
                    placeholderTextColor="#94A3B8"
                    value={nombre}
                    onChangeText={setNombre}
                  />

                  <Text style={styles.inputLabel}>Celular o Barrio (Opcional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 3001112233"
                    placeholderTextColor="#94A3B8"
                    value={telefono}
                    onChangeText={setTelefono}
                  />

                  <TouchableOpacity style={styles.submitBtn} onPress={handleQuickSubmit}>
                    <Text style={styles.submitBtnText}>Activar Perfil Rápido</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
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
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  userProfileBox: {
    alignItems: "center",
    paddingVertical: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  userNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  userMethodBadge: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  myAlertsButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  myAlertsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  aboutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aboutButtonText: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: "700",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  signOutText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    gap: 12,
  },
  optionsContainer: {
    gap: 12,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
    lineHeight: 18,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
  },
  googleText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
    borderWidth: 1.5,
    borderColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },
  quickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentAmberLight,
    borderWidth: 1.5,
    borderColor: COLORS.accentAmber,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
  },
  quickText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B45309",
  },
  guestText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  formContainer: {
    gap: 10,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
