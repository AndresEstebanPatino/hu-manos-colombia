import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { COLORS } from "../../../constants/theme";
import {
  CrearReporteInput,
  TipoReporte,
  LocationProvider,
  Geocoder,
  formatearCoords,
} from "../domain";
import { CrearReporteResultado } from "../services/crear-reporte";

interface Props {
  /** Id del usuario/invitado que captura (de AuthContext). */
  creadoPorId: string;
  /** Caso de uso de captura (inyectado para testeo). */
  onCrear: (input: CrearReporteInput) => Promise<CrearReporteResultado>;
  /** GPS del dispositivo; si falta, se oculta "Usar mi ubicación". */
  locationProvider?: LocationProvider;
  /** Geocodificación inversa (coords -> texto); opcional (fallback: "lat, lng"). */
  geocoder?: Geocoder;
  /** Elige/sube una foto y devuelve su URL; si falta, se oculta "Agregar foto". */
  onSubirFoto?: () => Promise<string | null>;
}

/**
 * Pantalla de captura de persona (BUSCADA / ENCONTRADA). Offline-first:
 * al enviar, el reporte se guarda local y se sincroniza al recuperar señal.
 */
export function FormularioCaptura({ creadoPorId, onCrear, locationProvider, geocoder, onSubirFoto }: Props) {
  const [tipo, setTipo] = useState<TipoReporte>("BUSCADA");
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [senas, setSenas] = useState("");
  const [contacto, setContacto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<CrearReporteResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Checkboxes de salvaguardas legales
  const [consentimientoFoto, setConsentimientoFoto] = useState(false);
  const [autorizacionMenor, setAutorizacionMenor] = useState(false);

  const rol = tipo === "BUSCADA" ? "FAMILIAR" : "SOCORRISTA";

  const edadNum = edad.trim() ? Number(edad.trim()) : undefined;
  const esMenorDetectado = typeof edadNum === "number" && Number.isFinite(edadNum) && edadNum < 18;

  const limpiar = () => {
    setNombre("");
    setEdad("");
    setUbicacion("");
    setSenas("");
    setContacto("");
    setFotoUrl(null);
    setResultado(null);
    setConsentimientoFoto(false);
    setAutorizacionMenor(false);
  };

  async function usarUbicacion() {
    if (!locationProvider) return;
    setUbicando(true);
    setError(null);
    try {
      const coords = await locationProvider.obtenerActual();
      if (!coords) {
        setError("No pudimos obtener tu ubicación. Revisa los permisos de GPS.");
        return;
      }
      const texto = geocoder ? await geocoder.describir(coords) : null;
      setUbicacion(texto ?? formatearCoords(coords));
    } finally {
      setUbicando(false);
    }
  }

  async function agregarFoto() {
    if (!onSubirFoto || !consentimientoFoto) return;
    setSubiendoFoto(true);
    try {
      const url = await onSubirFoto();
      if (url) setFotoUrl(url);
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function enviar() {
    if (esMenorDetectado && !autorizacionMenor) {
      setError("Debes confirmar la autorización del representante legal para reportar a un menor.");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const input: CrearReporteInput = {
        tipo,
        creadoPorRol: rol,
        creadoPorId,
        nombre: nombre.trim() || undefined,
        edadAprox: typeof edadNum === "number" && Number.isFinite(edadNum) ? edadNum : undefined,
        ultimaUbicacion: ubicacion.trim() ? { texto: ubicacion.trim() } : undefined,
        senasParticulares: senas.trim() || undefined,
        foto: fotoUrl ? { urlRemota: fotoUrl, comprimida: true } : undefined,
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

  const submitDisabled = enviando || (esMenorDetectado && !autorizacionMenor);

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

      {/* TAREA 2: Banner contextual de menor de edad */}
      {esMenorDetectado && (
        <View style={styles.bannerMenor} testID="banner-menor">
          <Text style={styles.bannerMenorTitulo}>
            👶 Estás reportando a un menor de edad. Por ley, este reporte requiere autorización de su representante legal.
          </Text>
          <Pressable
            testID="checkbox-autorizacion-menor"
            style={styles.checkboxRow}
            onPress={() => setAutorizacionMenor(!autorizacionMenor)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: autorizacionMenor }}
          >
            <View style={[styles.checkbox, autorizacionMenor && styles.checkboxChecked]}>
              {autorizacionMenor ? <Text style={styles.checkboxCheckmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabelAlert}>
              Soy el padre, madre o representante legal de este menor, o cuento con su autorización expresa.
            </Text>
          </Pressable>

          <View style={styles.callButtonsRow}>
            <Pressable
              style={styles.callBtn}
              onPress={() => Linking.openURL("tel:141")}
              accessibilityRole="button"
            >
              <Text style={styles.callBtnTxt}>📞 Llamar a ICBF (141)</Text>
            </Pressable>
            <Pressable
              style={styles.callBtn}
              onPress={() => Linking.openURL("tel:122")}
              accessibilityRole="button"
            >
              <Text style={styles.callBtnTxt}>📞 Llamar a Fiscalía (122)</Text>
            </Pressable>
          </View>
        </View>
      )}

      {locationProvider ? (
        <Pressable
          testID="usar-ubicacion"
          style={[styles.ubicBtn, ubicando && styles.botonDisabled]}
          onPress={usarUbicacion}
          disabled={ubicando}
          accessibilityRole="button"
        >
          {ubicando ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.ubicBtnTexto}>📍 Usar mi ubicación</Text>
          )}
        </Pressable>
      ) : null}
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

      {/* TAREA 1: Consentimiento de foto para todos los reportes */}
      {onSubirFoto ? (
        <View style={styles.fotoSection}>
          <Pressable
            testID="checkbox-consentimiento-foto"
            style={styles.checkboxRow}
            onPress={() => setConsentimientoFoto(!consentimientoFoto)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consentimientoFoto }}
          >
            <View style={[styles.checkbox, consentimientoFoto && styles.checkboxChecked]}>
              {consentimientoFoto ? <Text style={styles.checkboxCheckmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Confirmo que soy la persona en la foto, un familiar directo, o tengo autorización de quien la representa legalmente para reportarla.
            </Text>
          </Pressable>

          <Pressable
            testID="agregar-foto"
            style={[styles.ubicBtn, (subiendoFoto || !consentimientoFoto) && styles.botonDisabled]}
            onPress={agregarFoto}
            disabled={subiendoFoto || !consentimientoFoto}
            accessibilityRole="button"
          >
            {subiendoFoto ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.ubicBtnTexto}>
                {fotoUrl ? "✅ Foto agregada — cambiar" : "📷 Agregar foto"}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

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
        style={[styles.boton, submitDisabled && styles.botonDisabled]}
        onPress={enviar}
        disabled={submitDisabled}
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
  bannerMenor: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  bannerMenorTitulo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
    lineHeight: 18,
  },
  callButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  callBtn: {
    flex: 1,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  callBtnTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  fotoSection: {
    gap: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxCheckmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  checkboxLabelAlert: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#B45309",
    lineHeight: 18,
  },
  boton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  botonDisabled: { opacity: 0.5 },
  botonTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ubicBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  ubicBtnTexto: { color: COLORS.primary, fontWeight: "700" },
  advertencia: { color: COLORS.flagYellow, fontSize: 13 },
  error: { color: COLORS.flagRedSoft, fontSize: 13 },
});

