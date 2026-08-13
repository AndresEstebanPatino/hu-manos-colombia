import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { COLORS } from "../../../constants/theme";
import {
  ReportePersona,
  ReportsQueryPort,
  RolPrivilegiado,
  ReportMutationPort,
  aplicarFiltros,
  puedeMarcarResuelto,
} from "../domain";
import { mensajeDifusion, urlCompartirWhatsApp } from "../services/compartir";

interface Props {
  query: ReportsQueryPort;
  /** Inyectable para testeo (por defecto abre WhatsApp con Linking). */
  abrirUrl?: (url: string) => void;
  /** Usuario actual (null = anónimo). Habilita "Marcar encontrada" si autoriza. */
  actorId?: string | null;
  /** Roles del usuario actual (para la guarda de resolución). */
  roles?: RolPrivilegiado[];
  /** Puerto de mutación; si falta, se oculta "Marcar encontrada". */
  mutation?: ReportMutationPort;
  /** Handler de avistamiento ("La vi"); si falta, se oculta el botón. */
  onAvistamiento?: (r: ReportePersona) => Promise<void> | void;
}

/** Lista pública de personas BUSCADAS: buscador tolerante + filtros + compartir. */
export function PantallaLista({
  query,
  abrirUrl = (u) => {
    void Linking.openURL(u);
  },
  actorId = null,
  roles = [],
  mutation,
  onAvistamiento,
}: Props) {
  const [reportes, setReportes] = useState<ReportePersona[]>([]);
  const [texto, setTexto] = useState("");
  const [soloConFoto, setSoloConFoto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accionando, setAccionando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setReportes(await query.listarBuscadasPublicas());
    } catch {
      setError("No se pudo cargar la lista.");
    } finally {
      setCargando(false);
    }
  }, [query]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = useMemo(
    () => aplicarFiltros(reportes, { texto, tipo: "BUSCADA", soloConFoto }),
    [reportes, texto, soloConFoto]
  );

  const compartir = (r: ReportePersona) => abrirUrl(urlCompartirWhatsApp(mensajeDifusion(r)));

  const avistar = (r: ReportePersona) => {
    if (!onAvistamiento) return;
    Alert.alert(
      "¿La viste?",
      `Vas a avisar que viste a ${r.nombre ?? "esta persona"}. Un coordinador lo validará; no se notifica a la familia todavía.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, la vi",
          onPress: async () => {
            setAccionando(r.id);
            try {
              await onAvistamiento(r);
              Alert.alert("¡Gracias!", "Tu aviso llegó al coordinador para validación.");
            } catch {
              Alert.alert("No se pudo enviar", "Intenta de nuevo cuando tengas conexión.");
            } finally {
              setAccionando(null);
            }
          },
        },
      ]
    );
  };

  const resolver = (r: ReportePersona) => {
    if (!mutation) return;
    Alert.alert(
      "Marcar como encontrada",
      `¿Confirmas que ${r.nombre ?? "esta persona"} ya fue encontrada? El caso se cerrará.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, encontrada",
          onPress: async () => {
            setAccionando(r.id);
            try {
              await mutation.marcarResuelto(r.id);
              await cargar();
            } catch {
              Alert.alert("No se pudo", "Intenta de nuevo cuando tengas conexión.");
            } finally {
              setAccionando(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.buscador}
        placeholder="Buscar por nombre, ubicación o señas…"
        placeholderTextColor={COLORS.textMuted}
        value={texto}
        onChangeText={setTexto}
      />

      <Pressable
        testID="chip-foto"
        style={[styles.chip, soloConFoto && styles.chipActivo]}
        onPress={() => setSoloConFoto((v) => !v)}
        accessibilityRole="button"
      >
        <Text style={[styles.chipTexto, soloConFoto && styles.chipTextoActivo]}>Con foto</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cargando ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : visibles.length === 0 ? (
        <Text style={styles.vacio}>No hay personas que coincidan con la búsqueda.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {visibles.map((r) => (
            <View key={r.id} style={styles.card} testID={`reporte-${r.id}`}>
              {r.foto?.urlRemota ? (
                <Image source={{ uri: r.foto.urlRemota }} style={styles.foto} />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <Text style={styles.fotoInicial}>{(r.nombre ?? "?").charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.nombre}>{r.nombre ?? "Sin nombre"}</Text>
                {typeof r.edadAprox === "number" ? (
                  <Text style={styles.meta}>~{r.edadAprox} años</Text>
                ) : null}
                {r.ultimaUbicacion?.texto ? (
                  <Text style={styles.meta}>{r.ultimaUbicacion.texto}</Text>
                ) : null}
                <View style={styles.acciones}>
                  <Pressable
                    style={styles.compartir}
                    onPress={() => compartir(r)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.compartirTexto}>Compartir</Text>
                  </Pressable>

                  {onAvistamiento ? (
                    <Pressable
                      testID={`avistar-${r.id}`}
                      style={styles.avistar}
                      onPress={() => avistar(r)}
                      disabled={accionando === r.id}
                      accessibilityRole="button"
                    >
                      <Text style={styles.avistarTexto}>La vi</Text>
                    </Pressable>
                  ) : null}

                  {mutation && puedeMarcarResuelto(r, actorId ?? "", roles) ? (
                    <Pressable
                      testID={`resolver-${r.id}`}
                      style={styles.resolver}
                      onPress={() => resolver(r)}
                      disabled={accionando === r.id}
                      accessibilityRole="button"
                    >
                      <Text style={styles.resolverTexto}>Marcar encontrada</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16, gap: 10 },
  titulo: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  buscador: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.text,
  },
  chip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.card,
  },
  chipActivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTexto: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  chipTextoActivo: { color: "#fff" },
  error: { color: COLORS.flagRedSoft, fontSize: 13 },
  loader: { marginTop: 24 },
  vacio: { color: COLORS.textMuted, marginTop: 16, fontSize: 14 },
  lista: { gap: 10, paddingBottom: 16 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  foto: { width: 64, height: 64, borderRadius: 10, backgroundColor: COLORS.background },
  fotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  fotoInicial: { fontSize: 24, fontWeight: "800", color: COLORS.primary },
  cardBody: { flex: 1, gap: 2 },
  nombre: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  meta: { fontSize: 13, color: COLORS.textMuted },
  acciones: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  compartir: {
    backgroundColor: COLORS.whatsappGreen,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  compartirTexto: { color: "#fff", fontWeight: "700", fontSize: 13 },
  avistar: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  avistarTexto: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  resolver: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resolverTexto: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
