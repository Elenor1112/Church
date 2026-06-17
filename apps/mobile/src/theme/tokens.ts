/** Design tokens — single source of truth, mirrored in tailwind.config.js. */

export const palette = {
  primary: "#6B0F1A",
  primaryLight: "#8B1E2D",
  gold: "#D4AF37",
  success: "#16A34A",
  error: "#DC2626",
  warning: "#F59E0B",
  info: "#2563EB",
} as const;

export const lightColors = {
  background: "#FAF8F5",
  card: "#FFFFFF",
  cardAlt: "#F3EFEA",
  ink: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  ...palette,
} as const;

export const darkColors = {
  background: "#15110F",
  card: "#211A18",
  cardAlt: "#2A2220",
  ink: "#F5F1EC",
  muted: "#A89E97",
  border: "#352B28",
  primary: "#9B2233",
  primaryLight: "#B83549",
  gold: "#E5C04D",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#FBBF24",
  info: "#3B82F6",
} as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

export const fontSize = {
  display: 32,
  title: 24,
  heading: 20,
  body: 16,
  caption: 14,
  small: 12,
} as const;

export const shadow = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

export const duration = { fast: 150, base: 220, slow: 300 } as const;
