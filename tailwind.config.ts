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
        background: "#edf2ee",
        foreground: "#1c2420",
        card: "#ffffff",
        muted: "#f4f7f5",
        border: "#dfe7e2",
        primary: {
          DEFAULT: "#03c75a",
          foreground: "#ffffff",
          soft: "#e8f8ef"
        },
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#ef4444",
        slate: "#667085"
      },
      boxShadow: {
        soft: "0 20px 40px rgba(15, 23, 42, 0.08)"
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
      }
    }
  },
  plugins: []
};

export default config;
