import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { Necesidad, CategoriaNecesidad } from "../types/need";
import { CATEGORY_CONFIGS } from "../constants/theme";
import { DEFAULT_COLOMBIA_REGION } from "../services/locationService";

interface NeedMapProps {
  needs: Necesidad[];
  onSelectNeed?: (needId: string) => void;
}

const CITY_COORDS_LOOKUP: Record<string, { lat: number; lng: number }> = {
  pereira: { lat: 4.8133, lng: -75.6961 },
  manizales: { lat: 5.0689, lng: -75.5174 },
  "quibdó": { lat: 5.6947, lng: -76.6611 },
  quibdo: { lat: 5.6947, lng: -76.6611 },
  cali: { lat: 3.4516, lng: -76.532 },
  "bogotá": { lat: 4.6097, lng: -74.0817 },
  bogota: { lat: 4.6097, lng: -74.0817 },
  "medellín": { lat: 6.2442, lng: -75.5812 },
  medellin: { lat: 6.2442, lng: -75.5812 },
  mocoa: { lat: 1.1478, lng: -76.6491 },
  armenia: { lat: 4.5339, lng: -75.6811 },
};

export const getMarkerColor = (categoria: CategoriaNecesidad, completado: boolean): string => {
  if (completado) return "#16A34A";
  switch (categoria) {
    case "SALUD":
    case "BEBES_LACTANCIA":
      return "#DC2626";
    case "MANO_DE_OBRA":
      return "#D97706";
    case "ALIMENTOS":
    case "ROPA_COBIJAS":
    case "OTRO":
    default:
      return "#1E40AF";
  }
};

export const getResolvedCoordinates = (need: Necesidad) => {
  if (need.latitud && need.longitud) {
    return { latitude: need.latitud, longitude: need.longitud };
  }

  const locLower = need.ubicacion.toLowerCase();
  for (const [cityKey, coords] of Object.entries(CITY_COORDS_LOOKUP)) {
    if (locLower.includes(cityKey)) {
      const offsetLat = (Math.random() - 0.5) * 0.04;
      const offsetLng = (Math.random() - 0.5) * 0.04;
      return { latitude: coords.lat + offsetLat, longitude: coords.lng + offsetLng };
    }
  }

  return {
    latitude: DEFAULT_COLOMBIA_REGION.latitude + (Math.random() - 0.5) * 0.2,
    longitude: DEFAULT_COLOMBIA_REGION.longitude + (Math.random() - 0.5) * 0.2,
  };
};

const generateLeafletHTML = (markers: Array<{
  id: string;
  lat: number;
  lng: number;
  color: string;
  emoji: string;
  titulo: string;
  ubicacion: string;
  progreso: string;
}>) => {
  const defaultLat = DEFAULT_COLOMBIA_REGION.latitude;
  const defaultLng = DEFAULT_COLOMBIA_REGION.longitude;

  const markersJS = markers
    .map(
      (m) => `
    (function() {
      var icon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background:${m.color};width:28px;height:28px;border-radius:50%;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${m.emoji}</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16]
      });
      var marker = L.marker([${m.lat}, ${m.lng}], { icon: icon }).addTo(map);
      marker.bindPopup(
        '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-width:180px;">' +
          '<div style="font-weight:800;font-size:13px;color:#0F172A;margin-bottom:4px;">${m.emoji} ${m.titulo.replace(/'/g, "\\'").replace(/"/g, "&quot;")}</div>' +
          '<div style="font-size:11px;color:#1E40AF;font-weight:700;margin-bottom:4px;">📍 ${m.ubicacion.replace(/'/g, "\\'").replace(/"/g, "&quot;")}</div>' +
          '<div style="font-size:11px;color:#64748B;margin-bottom:8px;">${m.progreso.replace(/'/g, "\\'").replace(/"/g, "&quot;")}</div>' +
          '<div onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'openDetail\\',id:\\'${m.id}\\'}))" ' +
            'style="background:#1E40AF;color:#FFF;text-align:center;padding:6px 0;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">' +
            'Ver detalle del evento ➔</div>' +
        '</div>'
      );
    })();`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-marker { background: transparent !important; border: none !important; }
    .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .leaflet-popup-content { margin: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([${defaultLat}, ${defaultLng}], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    ${markersJS}

    ${markers.length > 0 ? `
    var bounds = L.latLngBounds([${markers.map((m) => `[${m.lat}, ${m.lng}]`).join(",")}]);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }` : ""}
  </script>
</body>
</html>`;
};

export const NeedMap: React.FC<NeedMapProps> = ({ needs, onSelectNeed }) => {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);

  const handleOpenDetail = (needId: string) => {
    if (onSelectNeed) {
      onSelectNeed(needId);
    } else {
      router.push(`/detail/${needId}`);
    }
  };

  const markers = needs
    .filter((need) => need && need.id)
    .map((need) => {
      const isOferta = need.modo === "OFERTA";
      const coords = getResolvedCoordinates(need);
      const color = isOferta ? "#059669" : getMarkerColor(need.categoria, need.completado);
      const catConfig = CATEGORY_CONFIGS[need.categoria];

      return {
        id: need.id,
        lat: coords.latitude,
        lng: coords.longitude,
        color,
        emoji: isOferta ? "🤝" : catConfig?.emoji || "📌",
        titulo: need.titulo || (isOferta ? "Oferta de ayuda" : "Solicitud de ayuda"),
        ubicacion: need.ubicacion || "Colombia",
        progreso: `${isOferta ? "Disponibles" : "Progreso"}: ${need.progreso_actual || 0} / ${need.meta_cantidad || 1} ${need.unidad_medida || "ayudas"}`,
      };
    });

  const htmlContent = generateLeafletHTML(markers);

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "openDetail" && data.id) {
        handleOpenDetail(data.id);
      }
    } catch (e) {
      console.log("NeedMap WebView message parse error:", e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.map}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleWebViewMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  map: {
    flex: 1,
  },
});
