import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import {
  DEFAULT_COLOMBIA_REGION,
  reverseGeocodeCoordinates,
  getCurrentGPSCoordinates,
} from "../services/locationService";

interface LocationPickerModalProps {
  visible: boolean;
  initialCoords?: { latitude: number; longitude: number };
  onConfirmLocation: (result: { latitud: number; longitud: number; direccion: string }) => void;
  onClose: () => void;
}

export const DEFAULT_REGION = {
  latitude: 4.8133,
  longitude: -75.6961,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

/**
 * Genera el HTML de Leaflet.js para el picker de ubicación con pin central fijo (estilo Uber).
 */
const generatePickerHTML = (lat: number, lng: number) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    /* Pin central fijo estilo Uber */
    .center-pin {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      z-index: 1000;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .pin-icon {
      font-size: 42px;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
    .pin-shadow {
      width: 12px;
      height: 5px;
      background: rgba(0,0,0,0.25);
      border-radius: 50%;
      margin-top: -4px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin">
    <div class="pin-icon">📍</div>
    <div class="pin-shadow"></div>
  </div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([${lat}, ${lng}], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    // Notificar a React Native cuando el mapa se mueve
    map.on('moveend', function() {
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'regionChange',
        latitude: center.lat,
        longitude: center.lng
      }));
    });

    // Permitir centrar el mapa desde React Native
    window.centerMap = function(lat, lng) {
      map.setView([lat, lng], 15, { animate: true });
    };
  </script>
</body>
</html>`;
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialCoords,
  onConfirmLocation,
  onClose,
}) => {
  const [centerLat, setCenterLat] = useState(
    initialCoords?.latitude || DEFAULT_REGION.latitude
  );
  const [centerLng, setCenterLng] = useState(
    initialCoords?.longitude || DEFAULT_REGION.longitude
  );

  const [addressText, setAddressText] = useState<string>("Buscando dirección...");
  const [loadingAddress, setLoadingAddress] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const addressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inicializar con GPS o coordenadas iniciales
  useEffect(() => {
    if (visible) {
      let isMounted = true;

      async function initRegion() {
        if (isMounted) setLoadingAddress(true);

        try {
          if (initialCoords?.latitude && initialCoords?.longitude) {
            if (isMounted) {
              setCenterLat(initialCoords.latitude);
              setCenterLng(initialCoords.longitude);
            }
            await updateAddress(initialCoords.latitude, initialCoords.longitude);
          } else {
            const gps = await getCurrentGPSCoordinates();
            if (gps && isMounted) {
              setCenterLat(gps.latitud);
              setCenterLng(gps.longitud);
              // Centrar el mapa si ya está listo
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(
                  `window.centerMap(${gps.latitud}, ${gps.longitud}); true;`
                );
              }
              await updateAddress(gps.latitud, gps.longitud);
            } else if (isMounted) {
              setCenterLat(DEFAULT_REGION.latitude);
              setCenterLng(DEFAULT_REGION.longitude);
              await updateAddress(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
            }
          }
        } catch (err) {
          if (isMounted) {
            setCenterLat(DEFAULT_REGION.latitude);
            setCenterLng(DEFAULT_REGION.longitude);
          }
        } finally {
          if (isMounted) {
            setLoadingAddress(false);
          }
        }
      }

      initRegion();

      return () => {
        isMounted = false;
        if (addressTimeoutRef.current) {
          clearTimeout(addressTimeoutRef.current);
        }
      };
    } else {
      setMapReady(false);
    }
  }, [visible, initialCoords]);

  const updateAddress = async (lat: number, lng: number) => {
    try {
      const addr = await reverseGeocodeCoordinates(lat, lng);
      setAddressText(addr);
    } catch (err) {
      setAddressText(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
    }
  };

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "regionChange") {
        const lat = data.latitude;
        const lng = data.longitude;
        setCenterLat(lat);
        setCenterLng(lng);

        // Debounce la geocodificación inversa
        if (addressTimeoutRef.current) {
          clearTimeout(addressTimeoutRef.current);
        }
        addressTimeoutRef.current = setTimeout(() => {
          updateAddress(lat, lng);
        }, 600);
      }
    } catch (e) {
      console.log("LocationPicker WebView message parse error:", e);
    }
  }, []);

  const handleConfirm = () => {
    onConfirmLocation({
      latitud: centerLat || DEFAULT_REGION.latitude,
      longitud: centerLng || DEFAULT_REGION.longitude,
      direccion: addressText || "Ubicación en Colombia",
    });
    onClose();
  };

  const htmlContent = generatePickerHTML(centerLat, centerLng);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Header Row */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back-sharp" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>Seleccionar Ubicación con Pin</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Full-Screen Map (WebView + Leaflet) */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.map}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
            onLoad={() => setMapReady(true)}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Bottom Floating Panel */}
        <View style={styles.bottomCard}>
          <View style={styles.addressHeaderRow}>
            <Ionicons name="navigate-sharp" size={20} color={COLORS.primary} />
            <Text style={styles.addressHeaderTitle}>Punto seleccionado en el mapa</Text>
          </View>

          {loadingAddress ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Obteniendo dirección por GPS...</Text>
            </View>
          ) : (
            <View style={styles.addressBox}>
              <Text style={styles.addressText} numberOfLines={2}>
                {addressText}
              </Text>
              <Text style={styles.coordsText}>
                Coordenadas: {centerLat.toFixed(5)}, {centerLng.toFixed(5)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.confirmBtn}
            onPress={handleConfirm}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>Confirmar Ubicación Exacta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    zIndex: 20,
  },
  closeBtn: {
    padding: 6,
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
    gap: 12,
  },
  addressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  addressBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 18,
  },
  coordsText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
