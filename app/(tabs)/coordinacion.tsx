import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PantallaCoordinacion } from "../../src/features/reencuentro/ui/PantallaCoordinacion";
import { SupabaseMatchGateway } from "../../src/features/reencuentro/services/supabase-match-gateway";
import { SupabaseSolicitudesQuery } from "../../src/features/reencuentro/services/supabase-solicitudes-query";
import { SupabaseCoordinadorAprobacion } from "../../src/features/reencuentro/services/supabase-coordinador-aprobacion";
import { SupabaseNotificacionesGateway } from "../../src/features/reencuentro/services/supabase-notificaciones-gateway";
import { notificarCoordinadoresCoincidencia } from "../../src/features/reencuentro/services/notificar-coordinadores";
import { SupabaseReportsQuery } from "../../src/features/reencuentro/services/supabase-reports-query";
import { SupabaseReportMutation } from "../../src/features/reencuentro/services/supabase-report-mutation";
import { COLORS } from "../../src/constants/theme";

const service = new SupabaseMatchGateway();
const solicitudesQuery = new SupabaseSolicitudesQuery();
const aprobacion = new SupabaseCoordinadorAprobacion();
const notificaciones = new SupabaseNotificacionesGateway();
const dedupQuery = new SupabaseReportsQuery();
const mutation = new SupabaseReportMutation();

export default function CoordinacionRoute() {
  return (
    <SafeAreaView style={styles.safe}>
      <PantallaCoordinacion
        service={service}
        solicitudesQuery={solicitudesQuery}
        aprobacion={aprobacion}
        notificaciones={notificaciones}
        onCoincidenciaConfirmada={(id) => notificarCoordinadoresCoincidencia(id)}
        dedupQuery={dedupQuery}
        mutation={mutation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
});
