import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { FormularioCaptura } from "../../src/features/reencuentro/ui/FormularioCaptura";
import { crearCaptureService } from "../../src/features/reencuentro/services/capture-service";
import { useAuth } from "../../src/context/AuthContext";
import { COLORS } from "../../src/constants/theme";

const service = crearCaptureService();

export default function ReportarPersonaRoute() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <FormularioCaptura creadoPorId={user?.id ?? "anonimo"} onCrear={service.crear} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
});
