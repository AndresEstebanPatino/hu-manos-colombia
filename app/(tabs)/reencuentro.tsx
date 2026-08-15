import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { FormularioCaptura } from "../../src/features/reencuentro/ui/FormularioCaptura";
import { crearCaptureService } from "../../src/features/reencuentro/services/capture-service";
import { elegirYSubirFoto } from "../../src/features/reencuentro/services/foto-captura";
import { iniciarAutoSync } from "../../src/features/reencuentro/services/auto-sync";
import { NetInfoConnectivityMonitor } from "../../src/features/reencuentro/services/netinfo-connectivity-monitor";
import { ExpoLocationProvider } from "../../src/features/reencuentro/services/expo-location-provider";
import { NominatimGeocoder } from "../../src/features/reencuentro/services/nominatim-geocoder";
import { useAuth } from "../../src/context/AuthContext";
import { COLORS } from "../../src/constants/theme";

const service = crearCaptureService();
const connectivity = new NetInfoConnectivityMonitor();
const locationProvider = new ExpoLocationProvider();
const geocoder = new NominatimGeocoder();

export default function ReencuentroTab() {
  const { user } = useAuth();

  // Al recuperar señal, sincroniza la cola local en segundo plano.
  useEffect(() => iniciarAutoSync(service.sync, connectivity), []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.linkRow}>
        <Link href="/reencuentro/lista" asChild>
          <Pressable style={styles.linkBtn} accessibilityRole="button">
            <Text style={styles.linkTxt}>🔎 Ver personas buscadas</Text>
          </Pressable>
        </Link>
        <Link href={"/reencuentro/mapa" as any} asChild>
          <Pressable style={styles.linkBtn} accessibilityRole="button">
            <Text style={styles.linkTxt}>🗺️ Mapa de personas y servicios</Text>
          </Pressable>
        </Link>
        <Link href="/reencuentro/registro" asChild>
          <Pressable style={styles.linkBtnAlt} accessibilityRole="button">
            <Text style={styles.linkTxtAlt}>🧭 Registrarse como coordinador de zona</Text>
          </Pressable>
        </Link>
      </View>
      <FormularioCaptura
        creadoPorId={user?.id ?? "anonimo"}
        onCrear={async (input) => {
          const res = await service.crear(input);
          void service.sync.sync(); // sube apenas se captura; si no hay red, queda en cola
          return res;
        }}
        locationProvider={locationProvider}
        geocoder={geocoder}
        onSubirFoto={() => elegirYSubirFoto("GALERIA")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  linkRow: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  linkBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  linkTxt: { color: COLORS.primary, fontWeight: "700" },
  linkBtnAlt: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  linkTxtAlt: { color: COLORS.text, fontWeight: "700" },
});
