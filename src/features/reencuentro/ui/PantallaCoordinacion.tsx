import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { COLORS } from "../../../constants/theme";
import {
  Coincidencia,
  MatchBoardService,
  SolicitudCoordinador,
  SolicitudesQueryPort,
  CoordinadorAprobacionPort,
} from "../domain";
import { TableroCoordinador } from "./TableroCoordinador";
import { PanelSolicitudes } from "./PanelSolicitudes";

interface Props {
  /** Servicio del tablero (inyectado para testeo; en la ruta real es Supabase). */
  service: MatchBoardService;
  /** Consulta de solicitudes de coordinador; si falta, no se muestra el panel. */
  solicitudesQuery?: SolicitudesQueryPort;
  /** Aprobación/rechazo de solicitudes; requerido para operar el panel. */
  aprobacion?: CoordinadorAprobacionPort;
}

/**
 * Contenedor del tablero del coordinador: carga coincidencias, dispara la
 * búsqueda (RPC) y aplica confirmar/rechazar contra el servicio.
 */
export function PantallaCoordinacion({ service, solicitudesQuery, aprobacion }: Props) {
  const [coincidencias, setCoincidencias] = useState<Coincidencia[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudCoordinador[]>([]);
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

  const cargarSolicitudes = useCallback(async () => {
    if (!solicitudesQuery) return;
    try {
      setSolicitudes(await solicitudesQuery.listarPendientes());
    } catch {
      // El panel es secundario: si falla, no bloquea el tablero de coincidencias.
    }
  }, [solicitudesQuery]);

  useEffect(() => {
    void cargar();
    void cargarSolicitudes();
  }, [cargar, cargarSolicitudes]);

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

  const aprobarSolicitud = (id: string) => {
    if (!aprobacion) return;
    Alert.alert(
      "Aprobar coordinador",
      "Se le otorgará el rol COORDINADOR (acceso a datos sensibles). ¿Confirmas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, aprobar",
          onPress: async () => {
            try {
              await aprobacion.aprobar(id);
              await cargarSolicitudes();
            } catch {
              Alert.alert("No se pudo aprobar", "Intenta de nuevo.");
            }
          },
        },
      ]
    );
  };

  const rechazarSolicitud = (id: string) => {
    if (!aprobacion) return;
    Alert.alert("Rechazar solicitud", "¿Rechazar esta solicitud de coordinador?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Rechazar",
        style: "destructive",
        onPress: async () => {
          try {
            await aprobacion.rechazar(id, "Rechazada por el coordinador");
            await cargarSolicitudes();
          } catch {
            Alert.alert("No se pudo rechazar", "Intenta de nuevo.");
          }
        },
      },
    ]);
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

      {solicitudesQuery && aprobacion ? (
        <PanelSolicitudes
          solicitudes={solicitudes}
          onAprobar={aprobarSolicitud}
          onRechazar={rechazarSolicitud}
        />
      ) : null}

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
