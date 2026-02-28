import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#0f1115",
        panelMuted: "#12151a",
        borderSubtle: "#232833",
      },
      boxShadow: {
        soft: "0 10px 30px -18px rgba(0, 0, 0, 0.75)",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
