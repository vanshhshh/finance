import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07141F",
        mist: "#EEF4F7",
        tide: "#0E3B43",
        mint: "#33C7A5",
        ember: "#FF8A4C",
        danger: "#D64545",
        dusk: "#4F5D75",
      },
      boxShadow: {
        panel: "0 20px 40px rgba(7, 20, 31, 0.08)",
      },
      backgroundImage: {
        "dashboard-grid":
          "radial-gradient(circle at 20% 20%, rgba(51, 199, 165, 0.18), transparent 24%), radial-gradient(circle at 80% 0%, rgba(14, 59, 67, 0.18), transparent 18%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(238,244,247,0.98))",
      },
    },
  },
  plugins: [],
};

export default config;

