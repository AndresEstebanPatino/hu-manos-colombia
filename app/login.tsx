import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/context/AuthContext";
import { COLORS } from "../src/constants/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle, signInWithPhone, signInQuick, isLoading } = useAuth();

  const [mode, setMode] = useState<"OPTIONS" | "PHONE">("OPTIONS");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      Alert.alert("¡Sesión Iniciada!", "Te has identificado con tu cuenta de Google.");
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg = err?.message || "";
      if (!msg.includes("cancelado") && !msg.includes("cancel")) {
        Alert.alert(
          "⚠️ No se pudo iniciar sesión",
          msg || "Ocurrió un error al conectar con Google. Intenta de nuevo."
        );
      }
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
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert("Error", "Ocurrió un problema al registrar el teléfono.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/(tabs)");
            }
          }}
        >
          <Ionicons name="arrow-back-sharp" size={20} color={COLORS.primary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.navBarTitle}>Identificarse / Login</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerCard}>
            <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
            <Text style={styles.title}>Bienvenido a Hu-Manos Colombia</Text>
            <Text style={styles.subtitle}>
              Identifícate para validar tus publicaciones, comunicarte de forma segura y colaborar en tu comunidad.
            </Text>
          </View>

          {mode === "OPTIONS" && (
            <View style={styles.optionsContainer}>
              {/* Google OAuth Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={22} color="#EA4335" />
                <Text style={styles.googleText}>Ingresar con Cuenta de Google</Text>
              </TouchableOpacity>

              {/* Phone OTP Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.phoneButton}
                onPress={() => setMode("PHONE")}
              >
                <Ionicons name="phone-portrait-sharp" size={22} color={COLORS.whatsappGreen} />
                <Text style={styles.phoneText}>Ingresar con Celular / WhatsApp</Text>
              </TouchableOpacity>

              {/* Continuar como Invitado */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.quickButton}
                onPress={async () => {
                  await signInQuick("Invitado Voluntario");
                  Alert.alert("Perfil Activo", "Has ingresado como invitado voluntario.");
                  router.replace("/(tabs)");
                }}
              >
                <Ionicons name="person-circle-outline" size={22} color="#64748B" />
                <Text style={styles.guestText}>Continuar como Invitado (Modo Anónimo)</Text>
              </TouchableOpacity>
            </View>
          )}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  navBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 12,
    marginTop: 10,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
  },
  phoneText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#047857",
  },
  quickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
  },
  guestText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
