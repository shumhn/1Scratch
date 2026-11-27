import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        card: "hsl(var(--card))",
        popover: "hsl(var(--popover))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        ring: "hsl(var(--ring))",
        "prize-blank": "hsl(var(--prize-blank))",
        "prize-back": "hsl(var(--prize-back))",
        "prize-nice": "hsl(var(--prize-nice))",
        "prize-big": "hsl(var(--prize-big))",
        "prize-jackpot": "hsl(var(--prize-jackpot))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: { lg: "var(--radius)", xl: "calc(var(--radius) + 4px)" },
    },
  },
  plugins: [],
};
export default config;
