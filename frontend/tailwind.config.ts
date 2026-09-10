import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          50: "var(--surface-50)",
          100: "var(--surface-100)",
          200: "var(--surface-200)",
          300: "var(--surface-300)",
        },
        border: "var(--border-color)",
        accent: {
          blue: "#2563EB",
          cyan: "#0EA5E9",
          emerald: "#10B981",
          rose: "#F43F5E",
          amber: "#F59E0B",
          violet: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "'Outfit'", "'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        "glass": "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glass-hover": "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 30px rgba(14,165,233,0.06)",
        "glow-sm": "0 0 10px rgba(14,165,233,0.12)",
        "glow-md": "0 0 20px rgba(14,165,233,0.15), 0 0 60px rgba(14,165,233,0.05)",
        "glow-lg": "0 0 40px rgba(14,165,233,0.2), 0 0 80px rgba(14,165,233,0.08)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-gradient": "linear-gradient(135deg, rgba(14,165,233,0.05), rgba(139,92,246,0.03))",
        "accent-gradient": "linear-gradient(135deg, #0EA5E9, #8B5CF6)",
        "card-gradient": "linear-gradient(180deg, rgba(14,165,233,0.04) 0%, transparent 100%)",
      },
      animation: {
        "float-up": "float-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
      },
    },
  },
  plugins: [],
};
export default config;
