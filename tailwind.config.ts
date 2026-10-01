import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1600px",
      },
    },
    extend: {
      colors: {
        base: "#050505",
        surface: "#0A0A0A",
        elevated: "#121212",
        glass: "rgba(255, 255, 255, 0.035)",
        "glass-elevated": "rgba(255, 255, 255, 0.055)",
        "glass-border": "rgba(255, 255, 255, 0.07)",
        "glass-border-strong": "rgba(255, 255, 255, 0.14)",
        "text-primary": "#FFFFFF",
        "text-secondary": "rgba(255, 255, 255, 0.68)",
        "text-muted": "rgba(255, 255, 255, 0.42)",
        "text-disabled": "rgba(255, 255, 255, 0.25)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
