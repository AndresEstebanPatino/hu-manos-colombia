import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { FormularioRegistroCoordinador } from "../../src/features/reencuentro/ui/FormularioRegistroCoordinador";
import { SupabaseCoordinadorOnboarding } from "../../src/features/reencuentro/services/supabase-coordinador-onboarding";
import { COLORS } from "../../src/constants/theme";

const onboarding = new SupabaseCoordinadorOnboarding();

export default function RegistroRoute() {
  return (
    <SafeAreaView style={styles.safe}>
      <FormularioRegistroCoordinador
        onSubmit={async (input) => {
          await onboarding.registrar(input);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
});
