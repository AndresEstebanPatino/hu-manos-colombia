import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationProvider } from "../src/context/NotificationContext";
import { AuthProvider } from "../src/context/AuthContext";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { COLORS } from "../src/constants/theme";

export default function RootLayout() {
  const router = useRouter();

  // Escuchar cuando el usuario toca una notificación push para abrir la pantalla de detalles del evento
  useEffect(() => {
    if (typeof window !== "undefined" && Platform.OS !== "web") {
      try {
        const Notifications = require("expo-notifications");
        const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response?.notification?.request?.content?.data;
          if (data && data.needId) {
            router.push(`/detail/${data.needId}`);
          }
        });

        return () => {
          subscription.remove();
        };
      } catch (e) {}
    }
  }, [router]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="detail/[id]"
                options={{
                  headerShown: true,
                  title: "Detalle de Solicitud",
                  headerBackTitle: "Atrás",
                  headerTintColor: COLORS.primary,
                }}
              />
              <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
            </Stack>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
