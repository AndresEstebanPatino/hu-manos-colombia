import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { MapaIntegrado } from "../../src/components/MapaIntegrado";
import { getNeeds } from "../../src/services/storage";
import { Necesidad } from "../../src/types/need";
import { SupabaseReportsQuery } from "../../src/features/reencuentro/services/supabase-reports-query";
import { reencuentroPersonaMarcadores } from "../../src/features/reencuentro/services/mapa-marcadores";
import { PersonaMarker } from "../../src/components/MapaIntegrado.types";
import { COLORS } from "../../src/constants/theme";

const query = new SupabaseReportsQuery();
type Filtro = "TODO" | "SERVICIOS" | "PERSONAS";

/**
 * Mapa unificado: servicios (needs) + personas de reencuentro (BUSCADA/ENCONTRADA)
 * en el mismo mapa (reutiliza MapaIntegrado), con filtro. Las personas sin
 * coordenadas no aparecen en el mapa pero siguen en la lista.
 */
export default function MapaRoute() {
  const router = useRouter();
  const [needs, setNeeds] = useState<Necesidad[]>([]);
  const [personas, setPersonas] = useState<PersonaMarker[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("TODO");

  useEffect(() => {
    (async () => {
      try {
        setNeeds(await getNeeds());
      } catch {
        /* los needs son secundarios aquí */
      }
      try {
        const reportes = await query.listarBuscadasPublicas();
        setPersonas(reencuentroPersonaMarcadores(reportes));
      } catch {
        /* sin conexión: el mapa muestra lo que haya */
      }
    })();
  }, []);

  const showNeeds = filtro === "TODO" || filtro === "SERVICIOS";
  const showPersonas = filtro === "TODO" || filtro === "PERSONAS";

  const filtros: { key: Filtro; label: string }[] = [
    { key: "TODO", label: "Todo" },
    { key: "SERVICIOS", label: "Servicios" },
    { key: "PERSONAS", label: "Personas" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.filtros}>
        {filtros.map((f) => (
          <Pressable
            key={f.key}
            testID={`filtro-${f.key}`}
            style={[styles.chip, filtro === f.key && styles.chipActivo]}
            onPress={() => setFiltro(f.key)}
            accessibilityRole="button"
          >
            <Text style={[styles.chipTxt, filtro === f.key && styles.chipTxtActivo]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      <MapaIntegrado
        needs={showNeeds ? needs : []}
        personas={showPersonas ? personas : []}
        onSelectNeed={(id) => router.push(`/detail/${id}`)}
        onSelectPersona={() => router.push("/reencuentro/lista")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  filtros: { flexDirection: "row", gap: 8, padding: 12 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.card,
  },
  chipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  chipTxtActivo: { color: "#fff" },
});
