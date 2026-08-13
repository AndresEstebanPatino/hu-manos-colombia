import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/theme";
import { SolicitudCoordinador } from "../domain";

interface Props {
  solicitudes: SolicitudCoordinador[];
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
}

/**
 * Panel de solicitudes de coordinador pendientes (camino 'b', human-in-the-loop).
 * Aprobar otorga el rol COORDINADOR (vía RPC atómico). Si no hay pendientes, no
 * renderiza nada (no ocupa espacio en el tablero).
 */
export function PanelSolicitudes({ solicitudes, onAprobar, onRechazar }: Props) {
  if (solicitudes.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Solicitudes de coordinador ({solicitudes.length})</Text>
      {solicitudes.map((s) => (
        <View key={s.id} style={styles.card} testID={`solicitud-${s.id}`}>
          <Text style={styles.nombre}>{s.nombreCompleto}</Text>
          <Text style={styles.meta}>
            {s.zona}
            {s.organizacion ? ` · ${s.organizacion}` : ""}
          </Text>
          <Text style={styles.meta}>
            {s.email} · {s.telefono}
          </Text>

          <View style={styles.acciones}>
            <Pressable
              testID={`aprobar-${s.id}`}
              style={[styles.boton, styles.aprobar]}
              onPress={() => onAprobar(s.id)}
              accessibilityRole="button"
            >
              <Text style={styles.botonTexto}>Aprobar</Text>
            </Pressable>
            <Pressable
              testID={`rechazar-${s.id}`}
              style={[styles.boton, styles.rechazar]}
              onPress={() => onRechazar(s.id)}
              accessibilityRole="button"
            >
              <Text style={styles.botonTextoOscuro}>Rechazar</Text>
            </Pressable>
          </View>
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
    gap: 4,
  },
  nombre: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  meta: { fontSize: 13, color: COLORS.textMuted },
  acciones: { flexDirection: "row", gap: 8, marginTop: 8 },
  boton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  aprobar: { backgroundColor: COLORS.secondary },
  rechazar: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  botonTexto: { color: "#fff", fontWeight: "700" },
  botonTextoOscuro: { color: COLORS.text, fontWeight: "700" },
});
