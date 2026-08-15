import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PantallaLista } from "../../src/features/reencuentro/ui/PantallaLista";
import { SupabaseReportsQuery } from "../../src/features/reencuentro/services/supabase-reports-query";
import { SupabaseReportMutation } from "../../src/features/reencuentro/services/supabase-report-mutation";
import { crearCaptureService } from "../../src/features/reencuentro/services/capture-service";
import {
  construirAvistamiento,
  ReportePersona,
  RolPrivilegiado,
} from "../../src/features/reencuentro/domain";
import { useAuth } from "../../src/context/AuthContext";
import { COLORS } from "../../src/constants/theme";

const query = new SupabaseReportsQuery();
const mutation = new SupabaseReportMutation();
const captura = crearCaptureService();

export default function ListaRoute() {
  const { user, esCoordinador } = useAuth();
  const roles: RolPrivilegiado[] = esCoordinador ? ["COORDINADOR"] : [];

  // "La vi": crea un ENCONTRADA vinculado (offline-first) y lo sincroniza.
  const onAvistamiento = async (r: ReportePersona) => {
    const input = construirAvistamiento(r, user?.id ?? "invitado");
    await captura.crear(input);
    await captura.sync.sync();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <PantallaLista
        query={query}
        actorId={user?.id ?? null}
        roles={roles}
        mutation={mutation}
        onAvistamiento={onAvistamiento}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
});
