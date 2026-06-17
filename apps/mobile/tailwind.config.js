/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: { DEFAULT: "#6B0F1A", light: "#8B1E2D" },
        gold: "#D4AF37",
        // Light surfaces
        background: "#FAF8F5",
        card: "#FFFFFF",
        // Text
        ink: "#1F2937",
        muted: "#6B7280",
        border: "#E5E7EB",
        // Status
        success: "#16A34A",
        error: "#DC2626",
        warning: "#F59E0B",
        info: "#2563EB",
        // Dark surfaces
        "dark-bg": "#15110F",
        "dark-card": "#211A18",
        "dark-border": "#352B28",
        "dark-ink": "#F5F1EC",
        "dark-muted": "#A89E97",
      },
      borderRadius: {
        sm: "12px",
        md: "18px",
        lg: "24px",
        pill: "999px",
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", fontWeight: "700" }],
        title: ["24px", { lineHeight: "32px", fontWeight: "700" }],
        heading: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        body: ["16px", { lineHeight: "24px" }],
        caption: ["14px", { lineHeight: "20px" }],
        small: ["12px", { lineHeight: "16px" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
    },
  },
  plugins: [],
};
