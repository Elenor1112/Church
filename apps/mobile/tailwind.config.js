/**
 * Mirrors src/theme/tokens.ts. tokens.ts is the source of truth — when a value
 * changes there, change it here too. Neutral-first slate ramp with a single
 * accent family; chroma is reserved for actions and status.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Accent — the one chromatic family
        primary: { DEFAULT: "#4A57B8", hover: "#3E499B", surface: "#EEF2FF" },
        "on-primary": "#FFFFFF",

        // Light surfaces
        background: "#F8F9FB",
        card: "#FFFFFF",
        "card-alt": "#F1F3F6",
        "surface-sunken": "#F1F3F6",

        // Text
        ink: "#15171C",
        muted: "#6B7382",
        subtle: "#98A1B0",

        // Lines
        border: "#DFE3EA",
        "border-strong": "#C6CCD7",

        // Status
        success: { DEFAULT: "#15803D", surface: "#E9F6EE" },
        warning: { DEFAULT: "#B45309", surface: "#FDF3E4" },
        error: { DEFAULT: "#B42318", surface: "#FDECEA" },
        info: { DEFAULT: "#175CD3", surface: "#E8F0FD" },

        // Dark surfaces
        "dark-bg": "#0E1014",
        "dark-card": "#15171C",
        "dark-card-alt": "#1D2027",
        "dark-border": "#262A32",
        "dark-ink": "#F5F6F8",
        "dark-muted": "#98A1B0",
        "dark-primary": "#818CF8",
      },
      borderRadius: {
        xs: "6px",
        sm: "10px",
        md: "14px",
        lg: "20px",
        xl: "28px",
        pill: "999px",
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", letterSpacing: "-0.6px", fontWeight: "700" }],
        title: ["24px", { lineHeight: "32px", letterSpacing: "-0.4px", fontWeight: "700" }],
        heading: ["18px", { lineHeight: "26px", letterSpacing: "-0.2px", fontWeight: "600" }],
        subheading: ["16px", { lineHeight: "24px", letterSpacing: "-0.1px", fontWeight: "600" }],
        body: ["16px", { lineHeight: "24px" }],
        caption: ["14px", { lineHeight: "20px" }],
        small: ["12px", { lineHeight: "16px", letterSpacing: "0.1px" }],
        overline: ["11px", { lineHeight: "14px", letterSpacing: "0.8px", fontWeight: "600" }],
        metric: ["28px", { lineHeight: "34px", letterSpacing: "-0.8px", fontWeight: "700" }],
      },
      spacing: {
        xxs: "2px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        xxl: "24px",
        xxxl: "32px",
        huge: "48px",
      },
    },
  },
  plugins: [],
};
