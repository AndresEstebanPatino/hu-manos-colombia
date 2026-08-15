import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/theme";
import { GrupoDuplicados } from "../domain";

interface Props {
  grupos: GrupoDuplicados[];
  onMarcarDuplicado: (duplicadoId: string, maestroId: string) => void;
}

/**
 * Panel de posibles duplicados (human-in-the-loop): agrupa reportes parecidos y
 * deja al coordinador marcar cada candidato como DUPLICADO del maestro (el más
 * antiguo). No renderiza nada si no hay grupos.
 */
export function PanelDuplicados({ grupos, onMarcarDuplicado }: Props) {
  if (grupos.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Posibles duplicados ({grupos.length})</Text>
      {grupos.map((g) => (
        <View key={g.maestro.id} style={styles.card} testID={`grupo-${g.maestro.id}`}>
          <Text style={styles.maestro}>Se conserva: {g.maestro.nombre ?? "Sin nombre"}</Text>
          {g.duplicados.map((d) => (
            <View key={d.id} style={styles.dupRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dupNombre}>{d.nombre ?? "Sin nombre"}</Text>
                <Text style={styles.meta}>
                  {typeof d.edadAprox === "number" ? `~${d.edadAprox} años` : "edad desconocida"}
                  {d.ultimaUbicacion?.texto ? ` · ${d.ultimaUbicacion.texto}` : ""}
                </Text>
              </View>
              <Pressable
                testID={`marcar-dup-${d.id}`}
                style={styles.boton}
                onPress={() => onMarcarDuplicado(d.id, g.maestro.id)}
                accessibilityRole="button"
              >
                <Text style={styles.botonTexto}>Marcar duplicado</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 4, gap: 10 },
  titulo: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 8,
  },
  maestro: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  dupRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dupNombre: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.textMuted },
  boton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  botonTexto: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
});
