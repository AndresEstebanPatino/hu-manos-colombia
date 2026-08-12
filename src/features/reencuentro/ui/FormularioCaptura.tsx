import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../../../constants/theme";
import { CrearReporteInput, TipoReporte } from "../domain";
import { CrearReporteResultado } from "../services/crear-reporte";

interface Props {
  /** Id del usuario/invitado que captura (de AuthContext). */
  creadoPorId: string;
  /** Caso de uso de captura (inyectado para testeo). */
  onCrear: (input: CrearReporteInput) => Promise<CrearReporteResultado>;
}

/**
 * Pantalla de captura de persona (BUSCADA / ENCONTRADA). Offline-first:
 * al enviar, el reporte se guarda local y se sincroniza al recuperar señal.
 */
export function FormularioCaptura({ creadoPorId, onCrear }: Props) {
  const [tipo, setTipo] = useState<TipoReporte>("BUSCADA");
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [senas, setSenas] = useState("");
  const [contacto, setContacto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<CrearReporteResultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rol = tipo === "BUSCADA" ? "FAMILIAR" : "SOCORRISTA";

  const limpiar = () => {
    setNombre("");
    setEdad("");
    setUbicacion("");
    setSenas("");
    setContacto("");
    setResultado(null);
  };

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const edadNum = edad.trim() ? Number(edad.trim()) : undefined;
      const input: CrearReporteInput = {
        tipo,
        creadoPorRol: rol,
        creadoPorId,
        nombre: nombre.trim() || undefined,
        edadAprox: typeof edadNum === "number" && Number.isFinite(edadNum) ? edadNum : undefined,
        ultimaUbicacion: ubicacion.trim() ? { texto: ubicacion.trim() } : undefined,
        senasParticulares: senas.trim() || undefined,
        reportante:
          tipo === "BUSCADA" && contacto.trim() ? { contactoWhatsapp: contacto.trim() } : undefined,
      };
      const res = await onCrear(input);
      setResultado(res);
    } catch {
      setError("No se pudo guardar el reporte. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <View style={styles.container}>
        <Text style={styles.titulo}>Reporte guardado ✓</Text>
        <Text style={styles.muted}>
          Se guardó en el dispositivo y se enviará al recuperar conexión.
        </Text>
        {resultado.advertencias.map((a, i) => (
          <Text key={i} style={styles.advertencia}>
            • {a}
          </Text>
        ))}
        <Pressable style={styles.boton} onPress={limpiar} accessibilityRole="button">
          <Text style={styles.botonTexto}>Reportar otra persona</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Reportar persona</Text>

      <View style={styles.toggleRow}>
        <Pressable
          testID="toggle-buscada"
          style={[styles.toggle, tipo === "BUSCADA" && styles.toggleActivo]}
          onPress={() => setTipo("BUSCADA")}
        >
          <Text style={[styles.toggleTexto, tipo === "BUSCADA" && styles.toggleTextoActivo]}>
            Buscada
          </Text>
        </Pressable>
        <Pressable
          testID="toggle-encontrada"
          style={[styles.toggle, tipo === "ENCONTRADA" && styles.toggleActivo]}
          onPress={() => setTipo("ENCONTRADA")}
        >
          <Text style={[styles.toggleTexto, tipo === "ENCONTRADA" && styles.toggleTextoActivo]}>
            Encontrada
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nombre (o apodo)"
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        style={styles.input}
        placeholder="Edad aproximada"
        value={edad}
        onChangeText={setEdad}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Última ubicación conocida"
        value={ubicacion}
        onChangeText={setUbicacion}
      />
      <TextInput
        style={[styles.input, styles.inputMulti]}
        placeholder="Ropa / señas particulares"
        value={senas}
        onChangeText={setSenas}
        multiline
      />
      {tipo === "BUSCADA" && (
        <TextInput
          style={styles.input}
          placeholder="Tu WhatsApp para avisarte"
          value={contacto}
          onChangeText={setContacto}
          keyboardType="phone-pad"
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.boton, enviando && styles.botonDisabled]}
        onPress={enviar}
        disabled={enviando}
        accessibilityRole="button"
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Reportar</Text>}
      </Pressable>
      <Text style={styles.muted}>
        Funciona sin conexión: se guarda y se envía al volver la señal.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: COLORS.background, flexGrow: 1 },
  titulo: { fontSize: 22, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  muted: { fontSize: 13, color: COLORS.textMuted },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  toggleActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleTexto: { color: COLORS.text, fontWeight: "600" },
  toggleTextoActivo: { color: "#fff" },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },
  boton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  botonDisabled: { opacity: 0.6 },
  botonTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
  advertencia: { color: COLORS.flagYellow, fontSize: 13 },
  error: { color: COLORS.flagRedSoft, fontSize: 13 },
});
