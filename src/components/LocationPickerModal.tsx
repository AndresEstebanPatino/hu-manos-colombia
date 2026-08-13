import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { DEFAULT_COLOMBIA_REGION } from "../services/locationService";

interface LocationPickerModalProps {
  visible: boolean;
  initialCoords?: { latitude: number; longitude: number };
  onConfirmLocation: (result: { latitud: number; longitud: number; direccion: string }) => void;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialCoords,
  onConfirmLocation,
  onClose,
}) => {
  const [addressInput, setAddressInput] = useState<string>("");
  const [latitude, setLatitude] = useState<string>(
    (initialCoords?.latitude || DEFAULT_COLOMBIA_REGION.latitude).toString()
  );
  const [longitude, setLongitude] = useState<string>(
    (initialCoords?.longitude || DEFAULT_COLOMBIA_REGION.longitude).toString()
  );

  const handleConfirm = () => {
    const latNum = parseFloat(latitude) || DEFAULT_COLOMBIA_REGION.latitude;
    const lngNum = parseFloat(longitude) || DEFAULT_COLOMBIA_REGION.longitude;
    onConfirmLocation({
      latitud: latNum,
      longitud: lngNum,
      direccion: addressInput.trim() || `Lat: ${latNum.toFixed(4)}, Lng: ${lngNum.toFixed(4)}`,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>📍 Selector de Ubicación (Web)</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            La vista de mapa con Pin interactivo (tipo Uber) está optimizada para la app móvil en celulares Android y iOS.
          </Text>

          <Text style={styles.label}>Dirección o punto de encuentro *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Cancha Barrio Boston, Pereira (Risaralda)"
            placeholderTextColor="#94A3B8"
            value={addressInput}
            onChangeText={setAddressInput}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Latitud GPS</Text>
              <TextInput
                style={styles.input}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Longitud GPS</Text>
              <TextInput
                style={styles.input}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>Confirmar Ubicación</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 450,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
