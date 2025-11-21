/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fantasy theme colors
        fantasy: {
          dark: {
            bg: "#0a0a0f",
            surface: "#1a1a2e",
            card: "#16213e",
            border: "#2d3561",
          },
          purple: {
            DEFAULT: "#6b46c1",
            light: "#8b5cf6",
            dark: "#4c1d95",
          },
          gold: {
            DEFAULT: "#d4af37",
            light: "#f4d03f",
            dark: "#b8940f",
          },
          blue: {
            DEFAULT: "#1e3a8a",
            light: "#3b82f6",
            dark: "#1e40af",
          },
          parchment: {
            DEFAULT: "#f4e4bc",
            light: "#faf5e6",
            dark: "#d4c5a0",
          },
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        fantasy: ["Cinzel", "serif"],
        medieval: ["MedievalSharp", "cursive"],
        display: ["Cinzel", "serif"],
        body: ["Crimson Text", "serif"],
      },
      boxShadow: {
        fantasy: "0 4px 14px 0 rgba(107, 70, 193, 0.39)",
        gold: "0 4px 14px 0 rgba(212, 175, 55, 0.39)",
      },
    },
  },
  plugins: [],
}

