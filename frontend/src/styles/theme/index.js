// src/styles/theme/index.js
import { createTheme } from "@mui/material/styles";
import { brand, neutral, semantic, shape, softShadows, typography } from "./tokens";
import { getComponentOverrides } from "./component";

export function buildTheme(mode = "light") {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,

      primary: {
        main: brand.primary[600],
        dark: brand.primary[800],
        light: brand.primary[400],
        contrastText: "#FFFFFF",
      },

      background: {
        default: isDark ? neutral[900] : neutral[50],
        paper: isDark ? neutral[800] : neutral[0],
      },

      text: {
        primary: isDark ? neutral[0] : neutral[900],
        secondary: isDark ? neutral[300] : neutral[500],
      },

      divider: isDark ? "rgba(255,255,255,0.10)" : "rgba(14,17,22,0.10)",

      grey: neutral,

      success: { main: semantic.success.main },
      warning: { main: semantic.warning.main },
      error: { main: semantic.error.main },
      info: { main: semantic.info.main },
    },

    shape,

    typography: {
      fontFamily: typography.fontFamily,
      h1: { fontWeight: 800, letterSpacing: -0.6 },
      h2: { fontWeight: 800, letterSpacing: -0.4 },
      h3: { fontWeight: 800, letterSpacing: -0.2 },
      h4: { fontWeight: 800 },
      h5: { fontWeight: 750 },
      h6: { fontWeight: 750 },
      subtitle1: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 750 },
    },

    shadows: softShadows,

    components: getComponentOverrides(mode),
  });
}
