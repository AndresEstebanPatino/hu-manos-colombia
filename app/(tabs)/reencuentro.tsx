import React, { useEffect } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { FormularioCaptura } from "../../src/features/reencuentro/ui/FormularioCaptura";
import { crearCaptureService } from "../../src/features/reencuentro/services/capture-service";
import { iniciarAutoSync } from "../../src/features/reencuentro/services/auto-sync";
import { NetInfoConnectivityMonitor } from "../../src/features/reencuentro/services/netinfo-connectivity-monitor";
import { useAuth } from "../../src/context/AuthContext";
import { COLORS } from "../../src/constants/theme";

const service = crearCaptureService();
const connectivity = new NetInfoConnectivityMonitor();

export default function ReencuentroTab() {
  const { user } = useAuth();

  // Al recuperar señal, sincroniza la cola local en segundo plano.
  useEffect(() => iniciarAutoSync(service.sync, connectivity), []);

  return (
    <SafeAreaView style={styles.safe}>
      <FormularioCaptura creadoPorId={user?.id ?? "anonimo"} onCrear={service.crear} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
});
