/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
    gold: {
        DEFAULT: "#AC8E66",
        light: "#C9AF88",
      },
     paper: "#FAF9F6",
      blacksoft: "#1A1A1A",
      colors: {
        zen: {
          bg: "#121212",
          panel: "#1b1b1b",
          accent: "#b59a68",
          text: "#e5e5e5",
          muted: "#888888",
          border: "#2a2a2a",

        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', '"Courier Prime"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0, 0, 0, 0.4)",
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};
