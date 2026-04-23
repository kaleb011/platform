import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f4f7f5",
        foreground: "#111827",
        card: "#ffffff",
        muted: "#f1f5f2",
        border: "#dfe8e3",
        primary: {
          DEFAULT: "#03c75a",
          foreground: "#ffffff",
          soft: "#e8f9ef"
        },
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#ef4444",
        slate: "#667085"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)"
      },
      backgroundImage: {
        "mobile-surface":
          "radial-gradient(circle at top, rgba(3, 199, 90, 0.16), transparent 30%), linear-gradient(180deg, #f7faf8 0%, #f2f5f3 100%)"
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "\"Noto Sans KR\"",
          "\"Apple SD Gothic Neo\"",
          "system-ui",
          "sans-serif"
        ]
      },
      keyframes: {
        enter: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        enter: "enter 0.45s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
