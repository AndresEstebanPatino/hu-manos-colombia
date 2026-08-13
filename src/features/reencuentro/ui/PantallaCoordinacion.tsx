import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../../../constants/theme";
import { Coincidencia, MatchBoardService } from "../domain";
import { TableroCoordinador } from "./TableroCoordinador";

interface Props {
  /** Servicio del tablero (inyectado para testeo; en la ruta real es Supabase). */
  service: MatchBoardService;
}

/**
 * Contenedor del tablero del coordinador: carga coincidencias, dispara la
 * búsqueda (RPC) y aplica confirmar/rechazar contra el servicio.
 */
export function PantallaCoordinacion({ service }: Props) {
  const [coincidencias, setCoincidencias] = useState<Coincidencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCoincidencias(await service.listar());
    } catch {
      setError("No se pudieron cargar las coincidencias.");
    } finally {
      setCargando(false);
    }
  }, [service]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const buscar = async () => {
    setBuscando(true);
    setError(null);
    try {
      await service.generar();
      await cargar();
    } catch {
      setError("No se pudo ejecutar la búsqueda de coincidencias.");
    } finally {
      setBuscando(false);
    }
  };

  const confirmar = async (id: string) => {
    await service.confirmar(id);
    await cargar();
  };

  const rechazar = async (id: string) => {
    await service.rechazar(id, "Rechazada por el coordinador");
    await cargar();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Coordinación</Text>
        <Pressable
          style={[styles.buscar, buscando && styles.disabled]}
          onPress={buscar}
          disabled={buscando}
          accessibilityRole="button"
        >
          {buscando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buscarTexto}>Buscar coincidencias</Text>
          )}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {cargando ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : (
        <TableroCoordinador
          coincidencias={coincidencias}
          onConfirmar={confirmar}
          onRechazar={rechazar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  titulo: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  buscar: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  buscarTexto: { color: "#fff", fontWeight: "700" },
  error: { color: COLORS.flagRedSoft, fontSize: 13, paddingHorizontal: 16, paddingVertical: 6 },
  loader: { marginTop: 24 },
});
