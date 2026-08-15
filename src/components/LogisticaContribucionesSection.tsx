import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { ModoNecesidad, ContribucionDetalle, TipoEntrega } from "../types/need";
import { obtenerContribucionesConLogistica } from "../services/reliabilityService";

interface LogisticaContribucionesSectionProps {
  necesidadId: string;
  modo?: ModoNecesidad;
}

export const LogisticaContribucionesSection: React.FC<LogisticaContribucionesSectionProps> = ({
  necesidadId,
  modo = "SOLICITUD",
}) => {
  const [contribuciones, setContribuciones] = useState<ContribucionDetalle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const data = await obtenerContribucionesConLogistica(necesidadId);
      if (isMounted) {
        setContribuciones(data);
        setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [necesidadId]);

  const isOferta = modo === "OFERTA";

  const getTipoEntregaBadge = (tipo?: TipoEntrega) => {
    switch (tipo) {
      case "RECOGE":
        return { label: "🚗 Recoge personalmente", color: "#0284C7", bg: "#E0F2FE" };
      case "NECESITA_ENTREGA":
        return { label: "📦 Requiere entrega", color: "#D97706", bg: "#FEF3C7" };
      case "SE_ENCUENTRAN":
        return { label: "🤝 Acuerdan punto medio", color: "#059669", bg: "#ECFDF5" };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Desplegable */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.headerButton}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerTitleGroup}>
          <Ionicons name="people" size={16} color={COLORS.primary} />
          <Text style={styles.headerTitle}>
            {isOferta
              ? `Personas que reservaron (${contribuciones.length})`
              : `Personas que confirmaron ayuda (${contribuciones.length})`}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {/* Aviso Obligatorio de Privacidad */}
      <View style={styles.privacyNoticeRow}>
        <Text style={styles.privacyNoticeText}>
          🔒 Solo tú puedes ver estos datos de contacto.
        </Text>
      </View>

      {/* Lista de Contribuciones (Si está expandida) */}
      {expanded && (
        <View style={styles.listContainer}>
          {contribuciones.length === 0 ? (
            <Text style={styles.emptyText}>
              {isOferta
                ? "Aún nadie ha reservado esta oferta."
                : "Aún nadie ha confirmado ayuda en esta solicitud."}
            </Text>
          ) : (
            contribuciones.map((item, index) => {
              const badge = getTipoEntregaBadge(item.tipo_entrega);
              const formattedDate = item.created_at
                ? new Date(item.created_at).toLocaleDateString([], {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Reciente";

              const rawWhatsapp = item.contacto_whatsapp_colaborador || "";
              const cleanWhatsapp = rawWhatsapp.replace(/\D/g, "");
              const fullName = item.perfil_usuario?.full_name?.trim();

              // Fallback: Nombre real -> Colaborador/Solicitante •••1234 -> Colaborador/Solicitante (uuid...)
              const prefixLabel = isOferta ? "Solicitante" : "Colaborador";
              const displayName =
                fullName ||
                (cleanWhatsapp.length >= 4
                  ? `${prefixLabel} •••${cleanWhatsapp.slice(-4)}`
                  : `${prefixLabel} (${item.usuario_id.substring(0, 8)}...)`);

              return (
                <View key={item.id || index} style={styles.contribCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userGroup}>
                      {item.perfil_usuario?.avatar_url ? (
                        <Image
                          source={{ uri: item.perfil_usuario.avatar_url }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={14} color="#FFFFFF" />
                        </View>
                      )}
                      <Text style={styles.userName}>{displayName}</Text>
                    </View>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                  </View>

                  {/* Badge de preferencia de logística */}
                  {badge ? (
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                  ) : null}

                  {/* Botón / Link Prominente para Abrir WhatsApp Directo */}
                  {cleanWhatsapp.length >= 7 ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.whatsappButton}
                      onPress={() => {
                        const cleanNumber = cleanWhatsapp.startsWith("57")
                          ? cleanWhatsapp
                          : `57${cleanWhatsapp}`;
                        const message = isOferta
                          ? `Hola, vi que reservaste mi oferta. ¿Cómo coordinamos el encuentro?`
                          : `Hola, vi que confirmaste ayuda en mi solicitud. ¿Cómo coordinamos el encuentro?`;
                        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
                          message
                        )}`;
                        Linking.openURL(whatsappUrl).catch(() => {
                          Alert.alert("WhatsApp", `Número de contacto: +${cleanNumber}`);
                        });
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                      <Text style={styles.whatsappButtonText}>
                        WhatsApp: {rawWhatsapp.startsWith("+") ? rawWhatsapp : `+57 ${cleanWhatsapp}`}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Dirección o Punto de Contacto */}
                  {item.ubicacion_contacto ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.infoText}>
                        <Text style={styles.boldText}>Punto/Dirección: </Text>
                        {item.ubicacion_contacto}
                      </Text>
                    </View>
                  ) : null}

                  {/* Notas adicionales */}
                  {item.notas_logistica ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="chatbox-ellipses-outline" size={14} color="#64748B" />
                      <Text style={styles.infoText}>
                        <Text style={styles.boldText}>Notas: </Text>
                        {item.notas_logistica}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  headerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  privacyNoticeRow: {
    marginTop: 6,
  },
  privacyNoticeText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "500",
  },
  listContainer: {
    marginTop: 10,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  contribCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  userGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  userName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.text,
  },
  dateText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.whatsappGreen,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    marginVertical: 4,
  },
  whatsappButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  boldText: {
    fontWeight: "700",
    color: COLORS.text,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
});
