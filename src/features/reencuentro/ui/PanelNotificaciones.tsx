import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/theme";
import { NotificacionPendiente } from "../domain";

interface Props {
  pendientes: NotificacionPendiente[];
  onNotificar: (item: NotificacionPendiente) => void;
}

/**
 * Panel del canal A (human-in-the-loop): coincidencias listas para avisar a la
 * familia. El botón abre WhatsApp con el mensaje prudente; el coordinador lo envía.
 * Si no hay contacto, el botón queda deshabilitado. No renderiza nada si está vacío.
 */
export function PanelNotificaciones({ pendientes, onNotificar }: Props) {
  if (pendientes.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Avisar a familias ({pendientes.length})</Text>
      {pendientes.map((p) => (
        <View key={p.coincidenciaId} style={styles.card} testID={`notif-${p.coincidenciaId}`}>
          <Text style={styles.nombre}>{p.nombre ?? "Persona"}</Text>
          <Text style={styles.meta}>
            {p.contacto ? `📱 ${p.contacto}` : "Sin contacto de WhatsApp del reportante"}
          </Text>
          <Pressable
            testID={`notificar-${p.coincidenciaId}`}
            style={[styles.boton, !p.contacto && styles.botonDisabled]}
            onPress={() => onNotificar(p)}
            disabled={!p.contacto}
            accessibilityRole="button"
          >
            <Text style={styles.botonTexto}>Notificar familia (WhatsApp)</Text>
          </Pressable>
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
  boton: {
    marginTop: 8,
    backgroundColor: COLORS.whatsappGreen,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  botonDisabled: { opacity: 0.5 },
  botonTexto: { color: "#fff", fontWeight: "700" },
});
