import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormularioRegistroCoordinador } from "../../src/features/reencuentro/ui/FormularioRegistroCoordinador";
import { SupabaseCoordinadorOnboarding } from "../../src/features/reencuentro/services/supabase-coordinador-onboarding";
import { COLORS } from "../../src/constants/theme";

const onboarding = new SupabaseCoordinadorOnboarding();

export default function RegistroRoute() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
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
