/**
 * Design tokens — the single source of truth for the visual system.
 *
 * The system is neutral-first: surfaces, text, and borders are drawn from a
 * tuned grey ramp, and chroma is spent only where it carries meaning (the
 * primary action, a focus ring, a status). Everything below is a token; screens
 * should never hardcode a hex value, a font size, or a raw pixel gap.
 */

/* ------------------------------------------------------------------ *
 * Ramps
 *
 * A single slate ramp with a trace of blue so large neutral fields read as
 * intentional rather than muddy. `accent` is the one chromatic family in the
 * product — swapping these nine values re-themes the entire app.
 * ------------------------------------------------------------------ */

const slate = {
  25: "#FCFCFD",
  50: "#F8F9FB",
  100: "#F1F3F6",
  150: "#E8EBF0",
  200: "#DFE3EA",
  300: "#C6CCD7",
  400: "#98A1B0",
  500: "#6B7382",
  600: "#4E5563",
  700: "#3A404B",
  800: "#272B33",
  850: "#1D2027",
  900: "#15171C",
  950: "#0E1014",
} as const;

const accent = {
  50: "#EEF2FF",
  100: "#E0E7FF",
  200: "#C7D2FE",
  300: "#A5B4FC",
  400: "#818CF8",
  500: "#5B6AD0",
  600: "#4A57B8",
  700: "#3E499B",
  800: "#353E80",
  900: "#2E3568",
} as const;

/**
 * Status hues, tuned per theme. Light mode uses saturated mid-tones for
 * contrast against white; dark mode lifts lightness and drops saturation so
 * status colors don't glow against near-black surfaces.
 */
const statusLight = {
  success: "#15803D",
  successSurface: "#E9F6EE",
  warning: "#B45309",
  warningSurface: "#FDF3E4",
  error: "#B42318",
  errorSurface: "#FDECEA",
  info: "#175CD3",
  infoSurface: "#E8F0FD",
} as const;

const statusDark = {
  success: "#4ADE80",
  successSurface: "#12241A",
  warning: "#FBBF24",
  warningSurface: "#241D10",
  error: "#F87171",
  errorSurface: "#2A1614",
  info: "#7EA6F8",
  infoSurface: "#141C2E",
} as const;

/* ------------------------------------------------------------------ *
 * Semantic color
 *
 * Screens consume these names, never the ramps above. Three surface levels
 * express elevation without relying on shadow alone — which matters in dark
 * mode, where shadows are nearly invisible and separation has to come from
 * lightness.
 * ------------------------------------------------------------------ */

export const lightColors = {
  /** App background — the lowest plane. */
  background: slate[50],
  /** Default raised surface (cards, sheets, fields). */
  card: "#FFFFFF",
  /** Recessed fill: input wells, skeletons, inactive segments. */
  cardAlt: slate[100],
  /** Surface above a raised surface (nested rows, hovered items). */
  surfaceHigh: "#FFFFFF",
  /** Sunken plane used behind grouped content. */
  surfaceSunken: slate[100],

  /** Primary text. */
  ink: slate[900],
  /** Secondary text — labels, metadata, supporting copy. */
  muted: slate[500],
  /** Tertiary text — timestamps, placeholder, disabled. */
  subtle: slate[400],

  /** Hairline dividers and field borders. */
  border: slate[200],
  /** Stronger border for pressed/active outlines. */
  borderStrong: slate[300],

  primary: accent[600],
  primaryHover: accent[700],
  /** Tinted wash for selected rows and accent chips. */
  primarySurface: accent[50],
  /** Text/icon color placed on top of `primary`. */
  onPrimary: "#FFFFFF",

  /** Neutral scrim behind modals and sheets. */
  scrim: "rgba(16, 18, 23, 0.45)",

  /**
   * Compatibility aliases. The previous system exposed a burgundy `primaryLight`
   * and a `gold` highlight; both are used across screens as semantic roles
   * ("gradient partner" and "reward/highlight"). They now resolve into the
   * neutral system so those roles survive without reintroducing chroma.
   */
  primaryLight: accent[500],
  gold: accent[600],

  ...statusLight,
} as const;

export const darkColors = {
  background: slate[950],
  card: slate[900],
  cardAlt: slate[850],
  surfaceHigh: slate[850],
  surfaceSunken: "#0A0C0F",

  ink: "#F5F6F8",
  muted: slate[400],
  subtle: slate[500],

  border: "#262A32",
  borderStrong: "#333842",

  primary: accent[400],
  primaryHover: accent[300],
  primarySurface: "#1A1D2E",
  onPrimary: slate[950],

  scrim: "rgba(0, 0, 0, 0.62)",

  /** See `lightColors` — same compatibility roles, dark-tuned. */
  primaryLight: accent[300],
  gold: accent[400],

  ...statusDark,
} as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string };

/* ------------------------------------------------------------------ *
 * Spacing — 4pt base, 8pt rhythm
 *
 * Named by role rather than t-shirt size so call sites read as intent.
 * ------------------------------------------------------------------ */

export const spacing = {
  /** 2 — hairline nudges only. */
  none: 0,
  xxs: 2,
  /** 4 — icon-to-label. */
  xs: 4,
  /** 8 — within a component. */
  sm: 8,
  /** 12 — between related rows. */
  md: 12,
  /** 16 — component padding, screen gutters. */
  lg: 16,
  /** 20 — generous card padding. */
  xl: 20,
  /** 24 — between content groups. */
  xxl: 24,
  /** 32 — between major sections. */
  xxxl: 32,
  /** 48 — hero breathing room. */
  huge: 48,
} as const;

/** Horizontal screen gutter. One value, used everywhere. */
export const screenGutter = spacing.lg;

/* ------------------------------------------------------------------ *
 * Radius
 * ------------------------------------------------------------------ */

export const radius = {
  xs: 6,
  /** Fields, chips, small controls. */
  sm: 10,
  /** Cards, list rows. */
  md: 14,
  /** Sheets, hero surfaces. */
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/* ------------------------------------------------------------------ *
 * Typography
 *
 * Every step carries its own line height and letter spacing. Large text gets
 * negative tracking (optical tightening); small uppercase text gets positive
 * tracking so it stays legible. Line heights are generous enough for Arabic,
 * whose glyphs sit taller than Latin at the same point size.
 * ------------------------------------------------------------------ */

export type TypeStep = {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: "400" | "500" | "600" | "700";
};

export const typography = {
  /** Screen hero — one per screen at most. */
  display: { fontSize: 32, lineHeight: 40, letterSpacing: -0.6, fontWeight: "700" },
  /** Screen title. */
  title: { fontSize: 24, lineHeight: 32, letterSpacing: -0.4, fontWeight: "700" },
  /** Section and card headings. */
  heading: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2, fontWeight: "600" },
  /** Emphasised body — list row primary line. */
  subheading: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: "600" },
  /** Default reading size. */
  body: { fontSize: 16, lineHeight: 24, letterSpacing: 0, fontWeight: "400" },
  /** Secondary copy, list row secondary line. */
  caption: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: "400" },
  /** Metadata, timestamps, field hints. */
  small: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1, fontWeight: "400" },
  /** Uppercase eyebrow above sections. */
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 0.8, fontWeight: "600" },
  /** Tabular figures for stat values. */
  metric: { fontSize: 28, lineHeight: 34, letterSpacing: -0.8, fontWeight: "700" },
} as const satisfies Record<string, TypeStep>;

export type TypeVariant = keyof typeof typography;

/** Back-compat alias: `fontSize.body` still resolves for any call site not yet migrated. */
export const fontSize = Object.fromEntries(
  Object.entries(typography).map(([k, v]) => [k, v.fontSize]),
) as { [K in TypeVariant]: number };

/* ------------------------------------------------------------------ *
 * Elevation
 *
 * Shadows are soft and low-opacity — separation comes primarily from surface
 * lightness and hairline borders. In dark mode a shadow reads as nothing, so
 * components pair elevation with a `surfaceHigh`/`border` change.
 * ------------------------------------------------------------------ */

export const shadow = {
  none: {},
  /** Resting card. Barely there by design. */
  soft: {
    shadowColor: "#0B0D12",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  /** Lifted: popovers, active FAB. */
  medium: {
    shadowColor: "#0B0D12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  /** Floating above content: tab bar, sheets. */
  large: {
    shadowColor: "#0B0D12",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
} as const;

/* ------------------------------------------------------------------ *
 * Motion
 *
 * Short, decelerating, and consistent. `press` is the tactile 60ms scale on
 * touch; `enter` governs content arriving; `exit` is faster than enter because
 * leaving should never feel like waiting.
 * ------------------------------------------------------------------ */

export const duration = {
  press: 90,
  fast: 140,
  base: 220,
  slow: 320,
} as const;

/** Reanimated `withTiming` easing partners. Standard decelerate. */
export const easing = {
  /** Elements entering the screen. */
  decelerate: [0.16, 1, 0.3, 1] as const,
  /** Elements leaving. */
  accelerate: [0.4, 0, 1, 1] as const,
  /** Both ends — position/size changes. */
  standard: [0.4, 0, 0.2, 1] as const,
} as const;

/** Spring preset for press feedback and tab selection. */
export const spring = { damping: 18, stiffness: 220, mass: 0.6 } as const;

/** Stagger between successive list items animating in. Keep small — long lists must not crawl. */
export const stagger = 40;
/** Cap stagger so item 20 doesn't wait 800ms. */
export const maxStaggerSteps = 6;

/** Compute a capped entrance delay for the nth item in a list. */
export function staggerDelay(index: number, base = 0): number {
  return base + Math.min(index, maxStaggerSteps) * stagger;
}

/* ------------------------------------------------------------------ *
 * Sizing
 *
 * `touchTarget` is the accessibility floor: no interactive element may be
 * smaller than 44pt in its smallest dimension.
 * ------------------------------------------------------------------ */

export const touchTarget = 44;

export const controlHeight = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

export const iconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const avatarSize = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
} as const;

/** Hairline that stays crisp across densities. */
export const hairline = 1;

/* ------------------------------------------------------------------ *
 * Opacity
 * ------------------------------------------------------------------ */

export const opacity = {
  disabled: 0.4,
  pressed: 0.7,
  /** Tint strength for accent-on-surface washes drawn with alpha. */
  wash: 0.1,
} as const;

/**
 * Compose an 8-digit hex from a 6-digit hex + 0..1 alpha.
 * Used for accent washes so tints derive from the theme instead of magic
 * strings like `colors.primary + "22"` scattered through screens.
 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
