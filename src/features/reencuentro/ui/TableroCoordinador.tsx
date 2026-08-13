import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/theme";
import { Coincidencia } from "../domain";
import { etiquetaBanda, ordenarPorBanda } from "./banda";

interface Props {
  coincidencias: Coincidencia[];
  onConfirmar: (id: string) => void;
  onRechazar: (id: string) => void;
}

/**
 * Tablero de matching asistido (human-in-the-loop). La IA sugiere y prioriza;
 * el coordinador confirma o rechaza. Ninguna coincidencia se comunica sola.
 */
export function TableroCoordinador({ coincidencias, onConfirmar, onRechazar }: Props) {
  const ordenadas = ordenarPorBanda(coincidencias);

  if (ordenadas.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>Coincidencias por revisar</Text>
        <Text style={styles.muted}>No hay coincidencias sugeridas por ahora.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Coincidencias por revisar</Text>
      {ordenadas.map((c) => (
        <View key={c.id} style={styles.card} testID={`coincidencia-${c.id}`}>
          <Text style={styles.banda}>{etiquetaBanda(c.banda)}</Text>

          {c.involucraFallecido ? (
            <Text style={styles.alerta}>
              ⚠ Caso con fallecido: requiere segunda validación y NO se notifica por la app.
            </Text>
          ) : null}

          <View style={styles.chips}>
            {c.evidencia.map((e, i) => (
              <Text key={i} style={styles.chip}>
                {e.campo}: {e.detalle}
              </Text>
            ))}
          </View>

          <View style={styles.acciones}>
            <Pressable
              style={[styles.boton, styles.confirmar]}
              onPress={() => onConfirmar(c.id)}
              accessibilityRole="button"
            >
              <Text style={styles.botonTexto}>Confirmar</Text>
            </Pressable>
            <Pressable
              style={[styles.boton, styles.rechazar]}
              onPress={() => onRechazar(c.id)}
              accessibilityRole="button"
            >
              <Text style={styles.botonTextoOscuro}>Rechazar</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: COLORS.background, flexGrow: 1 },
  titulo: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  muted: { fontSize: 14, color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 8,
  },
  banda: { fontSize: 15, fontWeight: "700", color: COLORS.primary },
  alerta: { fontSize: 13, color: COLORS.flagRedSoft, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    fontSize: 12,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  acciones: { flexDirection: "row", gap: 8, marginTop: 4 },
  boton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  confirmar: { backgroundColor: COLORS.secondary },
  rechazar: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  botonTexto: { color: "#fff", fontWeight: "700" },
  botonTextoOscuro: { color: COLORS.text, fontWeight: "700" },
});
