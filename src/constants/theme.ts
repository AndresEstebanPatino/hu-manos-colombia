import { CategoriaNecesidad, CategoriaConfig } from "../types/need";

export const COLORS = {
  // Paleta Armónica Colombia (Azul Azulado Real, Amarillo Cálido, Rojo Suave)
  primary: "#1E40AF", // Azul Real Elegante (Principal)
  primaryDark: "#1E3A8A",
  primaryLight: "#EFF6FF",
  secondary: "#10B981", // Verde Esperanza / Cubierto
  secondaryLight: "#D1FAE5",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",

  // Tonos de la Bandera de Colombia y Alertas Suaves
  flagYellow: "#D97706", // Amarillo / Dorado Cálido
  flagYellowLight: "#FEF3C7",
  flagBlue: "#2563EB", // Azul
  flagBlueLight: "#DBEAFE",
  flagRedSoft: "#E11D48", // Rojo Suave / Rosa Coral (No agresivo)
  flagRedSoftLight: "#FFE4E6",

  accentAmber: "#F59E0B",
  accentAmberLight: "#FEF3C7",
  accentBlue: "#2563EB",
  accentBlueLight: "#DBEAFE",
  accentPink: "#E11D48",
  accentPinkLight: "#FFE4E6",
  accentPurple: "#8B5CF6",
  accentPurpleLight: "#F3E8FF",
  whatsappGreen: "#25D366",
  whatsappDark: "#128C7E",
};

export const CATEGORY_CONFIGS: Record<CategoriaNecesidad, CategoriaConfig> = {
  BEBES_LACTANCIA: {
    key: "BEBES_LACTANCIA",
    label: "Bebés / Lactancia",
    emoji: "👶",
    badgeBg: "#FFE4E6",
    badgeText: "#9F1239",
    color: "#E11D48",
  },
  ALIMENTOS: {
    key: "ALIMENTOS",
    label: "Alimentos",
    emoji: "🍲",
    badgeBg: "#D1FAE5",
    badgeText: "#065F46",
    color: "#10B981",
  },
  ROPA_COBIJAS: {
    key: "ROPA_COBIJAS",
    label: "Ropa / Cobijas",
    emoji: "🛌",
    badgeBg: "#DBEAFE",
    badgeText: "#1E40AF",
    color: "#2563EB",
  },
  MANO_DE_OBRA: {
    key: "MANO_DE_OBRA",
    label: "Voluntarios",
    emoji: "🔨",
    badgeBg: "#FEF3C7",
    badgeText: "#92400E",
    color: "#D97706",
  },
  SALUD: {
    key: "SALUD",
    label: "Salud / Médicos",
    emoji: "🏥",
    badgeBg: "#FEE2E2",
    badgeText: "#991B1B",
    color: "#DC2626",
  },
  OTRO: {
    key: "OTRO",
    label: "Otros Recursos",
    emoji: "📦",
    badgeBg: "#F3E8FF",
    badgeText: "#6B21A8",
    color: "#8B5CF6",
  },
};

export const ALL_CATEGORIES_FILTER: (CategoriaConfig | { key: "TODAS"; label: string; emoji: string; badgeBg: string; badgeText: string; color: string })[] = [
  {
    key: "TODAS",
    label: "Todas",
    emoji: "🚨",
    badgeBg: "#E2E8F0",
    badgeText: "#334155",
    color: "#475569",
  },
  ...Object.values(CATEGORY_CONFIGS),
];
