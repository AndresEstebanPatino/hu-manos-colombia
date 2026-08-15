import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

// DEMO: personas de ejemplo con coordenadas (Chocó/Putumayo) para ver marcadores
// mientras no haya reportes reales con GPS. Poner MOSTRAR_DEMO=false o quitar antes de producción.
const MOSTRAR_DEMO = true;
const DEMO_PERSONAS: PersonaMarker[] = [
  { id: "demo-1", lat: 5.6947, lng: -76.6611, nombre: "María Mosquera (demo)", tipo: "BUSCADA", ubicacion: "Quibdó, Chocó" },
  { id: "demo-2", lat: 6.2308, lng: -77.4028, nombre: "Carlos Rentería (demo)", tipo: "BUSCADA", ubicacion: "Bahía Solano, Chocó" },
  { id: "demo-3", lat: 1.1478, lng: -76.6491, nombre: "Persona identificada (demo)", tipo: "ENCONTRADA", ubicacion: "Mocoa, Putumayo" },
];

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
  const [ampliado, setAmpliado] = useState(false);

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
  const personasMapa = [...(MOSTRAR_DEMO ? DEMO_PERSONAS : []), ...personas];

  const filtros: { key: Filtro; label: string }[] = [
    { key: "TODO", label: "Todo" },
    { key: "SERVICIOS", label: "Servicios" },
    { key: "PERSONAS", label: "Personas" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
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
        <Pressable
          testID="mapa-ampliar"
          style={[styles.chip, styles.ampliar]}
          onPress={() => setAmpliado((v) => !v)}
          accessibilityRole="button"
        >
          <Text style={styles.chipTxt}>{ampliado ? "Reducir ✕" : "Ampliar ⤢"}</Text>
        </Pressable>
      </View>
      <MapaIntegrado
        needs={showNeeds ? needs : []}
        personas={showPersonas ? personasMapa : []}
        mapHeight={ampliado ? 560 : 300}
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
  ampliar: { marginLeft: "auto", borderColor: COLORS.primary },
});
