import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import { COLORS } from "../../../constants/theme";
import {
  Coincidencia,
  MatchBoardService,
  SolicitudCoordinador,
  SolicitudesQueryPort,
  CoordinadorAprobacionPort,
  NotificacionPendiente,
  NotificacionesBoardPort,
  mensajeNotificacionFamilia,
  GrupoDuplicados,
  agruparDuplicados,
  ReportsQueryPort,
  ReportMutationPort,
} from "../domain";
import { urlWhatsAppContacto } from "../services/compartir";
import { TableroCoordinador } from "./TableroCoordinador";
import { PanelSolicitudes } from "./PanelSolicitudes";
import { PanelNotificaciones } from "./PanelNotificaciones";
import { PanelDuplicados } from "./PanelDuplicados";

interface Props {
  /** Servicio del tablero (inyectado para testeo; en la ruta real es Supabase). */
  service: MatchBoardService;
  /** Consulta de solicitudes de coordinador; si falta, no se muestra el panel. */
  solicitudesQuery?: SolicitudesQueryPort;
  /** Aprobación/rechazo de solicitudes; requerido para operar el panel. */
  aprobacion?: CoordinadorAprobacionPort;
  /** Canal A (avisos a familias); si falta, no se muestra el panel de avisos. */
  notificaciones?: NotificacionesBoardPort;
  /** Abre una URL (WhatsApp). Inyectable para testeo; por defecto Linking. */
  abrirUrl?: (url: string) => void;
  /** Canal B2: se llama tras confirmar (push a coordinadores). Best-effort. */
  onCoincidenciaConfirmada?: (coincidenciaId: string) => void;
  /** Pool de reportes para detectar duplicados; si falta, no se muestra el panel. */
  dedupQuery?: ReportsQueryPort;
  /** Mutación de reportes (marcarDuplicado); requerido para operar el panel. */
  mutation?: ReportMutationPort;
}

/**
 * Contenedor del tablero del coordinador: carga coincidencias, dispara la
 * búsqueda (RPC) y aplica confirmar/rechazar contra el servicio.
 */
export function PantallaCoordinacion({
  service,
  solicitudesQuery,
  aprobacion,
  notificaciones,
  abrirUrl = (u) => {
    void Linking.openURL(u);
  },
  onCoincidenciaConfirmada,
  dedupQuery,
  mutation,
}: Props) {
  const [coincidencias, setCoincidencias] = useState<Coincidencia[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudCoordinador[]>([]);
  const [pendientes, setPendientes] = useState<NotificacionPendiente[]>([]);
  const [grupos, setGrupos] = useState<GrupoDuplicados[]>([]);
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

  const cargarPendientes = useCallback(async () => {
    if (!notificaciones) return;
    try {
      setPendientes(await notificaciones.listarPendientes());
    } catch {
      // Panel secundario; no bloquea el tablero.
    }
  }, [notificaciones]);

  const cargarDuplicados = useCallback(async () => {
    if (!dedupQuery) return;
    try {
      const reportes = await dedupQuery.listarBuscadasPublicas();
      setGrupos(agruparDuplicados(reportes));
    } catch {
      // Panel secundario; no bloquea el tablero.
    }
  }, [dedupQuery]);

  useEffect(() => {
    void cargar();
    void cargarSolicitudes();
    void cargarPendientes();
    void cargarDuplicados();
  }, [cargar, cargarSolicitudes, cargarPendientes, cargarDuplicados]);

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
    await cargarPendientes();
    onCoincidenciaConfirmada?.(id);
  };

  const notificar = (item: NotificacionPendiente) => {
    if (!notificaciones || !item.contacto) return;
    Alert.alert(
      "Avisar a la familia",
      `Se abrirá WhatsApp para escribir a ${item.nombre ?? "la familia"}. El mensaje es prudente (posible coincidencia, a verificar). ¿Continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abrir WhatsApp",
          onPress: async () => {
            abrirUrl(urlWhatsAppContacto(item.contacto!, mensajeNotificacionFamilia(item.nombre)));
            try {
              await notificaciones.marcarNotificada(item.coincidenciaId);
              await cargarPendientes();
            } catch {
              Alert.alert("Aviso abierto", "No se pudo marcar como notificada; inténtalo de nuevo.");
            }
          },
        },
      ]
    );
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

  const marcarDuplicado = (duplicadoId: string, maestroId: string) => {
    if (!mutation) return;
    Alert.alert(
      "Marcar duplicado",
      "Este reporte se marcará como DUPLICADO y se fusionará con el que se conserva. ¿Confirmas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, marcar",
          onPress: async () => {
            try {
              await mutation.marcarDuplicado(duplicadoId, maestroId);
              await cargarDuplicados();
            } catch {
              Alert.alert("No se pudo", "Intenta de nuevo.");
            }
          },
        },
      ]
    );
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

      {notificaciones ? (
        <PanelNotificaciones pendientes={pendientes} onNotificar={notificar} />
      ) : null}

      {dedupQuery && mutation ? (
        <PanelDuplicados grupos={grupos} onMarcarDuplicado={marcarDuplicado} />
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
