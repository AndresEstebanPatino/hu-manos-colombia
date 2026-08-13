import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { supabase, isSupabaseConfigured } from "../../src/lib/supabase";
import { COLORS } from "../../src/constants/theme";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        if (isSupabaseConfigured()) {
          const code = params.code as string | undefined;
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else {
            // Verificar si vinieron parámetros en la URL inicial de Deep Link
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const parsed = Linking.parse(initialUrl);
              if (parsed.queryParams?.code) {
                await supabase.auth.exchangeCodeForSession(parsed.queryParams.code as string);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error al procesar callback de autenticación:", err);
      } finally {
        if (isMounted) {
          // Navegar explícitamente al feed principal de la app
          router.replace("/(tabs)");
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [params.code, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.title}>Iniciando sesión con Google...</Text>
      <Text style={styles.subtitle}>Te estamos redirigiendo al feed principal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
