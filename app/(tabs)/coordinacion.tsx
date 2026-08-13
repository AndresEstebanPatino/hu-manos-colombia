import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { PantallaCoordinacion } from "../../src/features/reencuentro/ui/PantallaCoordinacion";
import { SupabaseMatchGateway } from "../../src/features/reencuentro/services/supabase-match-gateway";
import { SupabaseSolicitudesQuery } from "../../src/features/reencuentro/services/supabase-solicitudes-query";
import { SupabaseCoordinadorAprobacion } from "../../src/features/reencuentro/services/supabase-coordinador-aprobacion";
import { COLORS } from "../../src/constants/theme";

const service = new SupabaseMatchGateway();
const solicitudesQuery = new SupabaseSolicitudesQuery();
const aprobacion = new SupabaseCoordinadorAprobacion();

export default function CoordinacionRoute() {
  return (
    <SafeAreaView style={styles.safe}>
      <PantallaCoordinacion
        service={service}
        solicitudesQuery={solicitudesQuery}
        aprobacion={aprobacion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
});
