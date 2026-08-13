import { CategoriaNecesidad, CategoriaConfig } from "../types/need";

export const COLORS = {
  // Sistema de 3 Colores Funcionales + Neutros Grises
  primary: "#1E40AF", // AZUL: Acciones primarias, botones, links, tabs activas
  primaryDark: "#1E3A8A",
  primaryLight: "#EFF6FF",

  secondary: "#10B981", // VERDE: Estados positivos, necesidades cubiertas, confirmaciones
  secondaryLight: "#D1FAE5",

  danger: "#EF4444", // ROJO: Emergencias, alertas anti-estafas, reportes
  dangerLight: "#FEF2F2",

  // Neutros Grises (Fondos, tarjetas, bordes, texto y tags)
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  neutralLight: "#F1F5F9",
  neutralDark: "#334155",

  whatsappGreen: "#25D366",

  // Alias de retrocompatibilidad mapeados a los 3 colores funcionales
  accentBlue: "#1E40AF",
  accentBlueLight: "#EFF6FF",
  accentAmber: "#D97706",
  accentAmberLight: "#FEF3C7",
  flagYellow: "#D97706",
  flagYellowLight: "#FEF3C7",
  flagRedSoft: "#EF4444",
  flagRedSoftLight: "#FEF2F2",
};

export const CATEGORY_CONFIGS: Record<CategoriaNecesidad, CategoriaConfig> = {
  BEBES_LACTANCIA: {
    key: "BEBES_LACTANCIA",
    label: "Bebés / Lactancia",
    emoji: "👶",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    color: "#1E40AF",
  },
  ALIMENTOS: {
    key: "ALIMENTOS",
    label: "Alimentos",
    emoji: "🍲",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    color: "#1E40AF",
  },
  ROPA_COBIJAS: {
    key: "ROPA_COBIJAS",
    label: "Ropa / Cobijas",
    emoji: "🧥",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    color: "#1E40AF",
  },
  MANO_DE_OBRA: {
    key: "MANO_DE_OBRA",
    label: "Voluntarios",
    emoji: "🔨",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    color: "#1E40AF",
  },
  SALUD: {
    key: "SALUD",
    label: "Salud / Médicos",
    emoji: "💊",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    color: "#1E40AF",
  },
  OTRO: {
    key: "OTRO",
    label: "Otros Recursos",
    emoji: "📦",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    color: "#1E40AF",
  },
};

export const ALL_CATEGORIES_FILTER: (CategoriaConfig | { key: "TODAS"; label: string; emoji: string; badgeBg: string; badgeText: string; color: string })[] = [
  {
    key: "TODAS",
    label: "Todas",
    emoji: "🚨",
    badgeBg: "#F1F5F9",
    badgeText: "#334155",
    color: "#1E40AF",
  },
  ...Object.values(CATEGORY_CONFIGS),
];

