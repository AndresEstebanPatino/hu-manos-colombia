import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../src/constants/theme";

export interface EmergencyLine {
  id: string;
  nombre: string;
  numero: string;
  descripcion: string;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const OFFICIAL_EMERGENCY_LINES: EmergencyLine[] = [
  {
    id: "1",
    nombre: "Línea Única de Emergencias Nacional",
    numero: "123",
    descripcion: "Atención inmediata para Policía, Bomberos y Ambulancias en todo Colombia.",
    color: "#E53E3E",
    icon: "warning",
  },
  {
    id: "2",
    nombre: "Cruz Roja Colombiana",
    numero: "132",
    descripcion: "Búsqueda y rescate, atención prehospitalaria y auxilio humanitario.",
    color: "#E53E3E",
    icon: "medical",
  },
  {
    id: "3",
    nombre: "Defensa Civil Colombiana",
    numero: "144",
    descripcion: "Gestión del riesgo de desastres, evacuación y rescate en zonas afectadas.",
    color: "#D69E2E",
    icon: "shield-checkmark",
  },
  {
    id: "4",
    nombre: "Cuerpo Oficial de Bomberos",
    numero: "119",
    descripcion: "Control de incendios, fugas de gas, rescates y colapsos estructurales.",
    color: "#DD6B20",
    icon: "flame",
  },
  {
    id: "5",
    nombre: "Policía Nacional",
    numero: "112",
    descripcion: "Atención de seguridad ciudadana, orden público y emergencias.",
    color: "#3182CE",
    icon: "shield-sharp",
  },
  {
    id: "6",
    nombre: "Urgencias Médicas y Ambulancias (CRUE)",
    numero: "125",
    descripcion: "Regulación de ambulancias y traslados de urgencia en salud.",
    color: "#319795",
    icon: "heart-circle",
  },
];

export default function EmergencyScreen() {
  const hacerLlamada = (numero: string) => {
    Linking.openURL(`tel:${numero}`).catch((err) =>
      console.error("No se pudo iniciar la llamada:", err)
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Ionicons name="call" size={22} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Líneas de Atención Inmediata</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Directorio oficial de respuesta rápida en Colombia. Toca para llamar directo.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {OFFICIAL_EMERGENCY_LINES.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            style={styles.card}
            onPress={() => hacerLlamada(item.numero)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon || "call"} size={26} color={item.color} />
            </View>

            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.cardName}>{item.nombre}</Text>
                <View style={[styles.numberBadge, { backgroundColor: item.color }]}>
                  <Text style={styles.numberText}>{item.numero}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{item.descripcion}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.callIconBadge, { backgroundColor: item.color }]}
              onPress={() => hacerLlamada(item.numero)}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Banner Informativo */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={COLORS.accentBlue} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Guía de solidaridad comunitaria</Text>
            <Text style={styles.infoDesc}>
              Si vas a movilizarte como voluntario o donante, coordina siempre con la junta de acción comunal o el puesto de mando unificado (PMU).
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  numberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  numberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  callIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: COLORS.accentBlueLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    gap: 12,
    alignItems: "flex-start",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.accentBlue,
  },
  infoDesc: {
    fontSize: 12,
    color: "#1E3A8A",
    marginTop: 2,
    lineHeight: 16,
  },
});
