// src/styles/theme/index.js
import { createTheme } from "@mui/material/styles";
import { brand, shape, softShadows } from "./tokens";
import { getComponentOverrides } from "./component";

export function buildTheme(mode = "light") {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: brand.purple[500],
        dark: brand.purple[700],
        light: brand.purple[300],
        contrastText: "#fff",
      },
      background: {
        default: isDark ? "#0B0B10" : "#F6F7FB",
        paper: isDark ? "#12121A" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "#F3F4F6" : "#111827",
        secondary: isDark ? "#C7CAD1" : "#4B5563",
      },
      divider: isDark ? "rgba(255,255,255,0.08)" : "rgba(17,24,39,0.10)",
    },

    typography: {
      fontFamily: [
        "Inter",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "Arial",
        "sans-serif",
      ].join(","),
      h1: { fontWeight: 900 },
      h2: { fontWeight: 900 },
      h3: { fontWeight: 800 },
      h4: { fontWeight: 800 },
      button: { fontWeight: 800 },
    },

    shape,

    shadows: softShadows,

    components: getComponentOverrides(mode),
  });
}
