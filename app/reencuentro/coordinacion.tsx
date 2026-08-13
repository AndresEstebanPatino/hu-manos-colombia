import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { PantallaCoordinacion } from "../../src/features/reencuentro/ui/PantallaCoordinacion";
import { SupabaseMatchGateway } from "../../src/features/reencuentro/services/supabase-match-gateway";
import { COLORS } from "../../src/constants/theme";

const service = new SupabaseMatchGateway();

export default function CoordinacionRoute() {
  return (
    <SafeAreaView style={styles.safe}>
      <PantallaCoordinacion service={service} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
});
