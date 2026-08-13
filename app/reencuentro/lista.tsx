import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { PantallaLista } from "../../src/features/reencuentro/ui/PantallaLista";
import { SupabaseReportsQuery } from "../../src/features/reencuentro/services/supabase-reports-query";
import { COLORS } from "../../src/constants/theme";

const query = new SupabaseReportsQuery();

export default function ListaRoute() {
  return (
    <SafeAreaView style={styles.safe}>
      <PantallaLista query={query} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
});
