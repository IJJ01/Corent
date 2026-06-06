// src/styles/getDesignTokens.js
import { brand, neutral, radius, shadows, typography } from "./theme/tokens";

export const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: brand.primary,
    },
    background: {
      default: mode === "light" ? neutral[50] : neutral[900],
      paper: mode === "light" ? neutral[0] : neutral[800],
    },
    text: {
      primary: mode === "light" ? neutral[900] : neutral[0],
      secondary: mode === "light" ? neutral[600] : neutral[300],
    },
    divider: mode === "light" ? neutral[200] : neutral[700],
  },

  shape: {
    borderRadius: radius.md,
  },

  typography: {
    fontFamily: typography.fontFamily,
    h1: { fontSize: "2.25rem", fontWeight: 700 },
    h2: { fontSize: "1.75rem", fontWeight: 600 },
    h3: { fontSize: "1.5rem", fontWeight: 600 },
    h4: { fontSize: "1.25rem", fontWeight: 600 },
    body1: { fontSize: "0.95rem" },
    body2: { fontSize: "0.85rem" },
  },

  shadows: [
    "none",
    shadows.sm,
    shadows.md,
    shadows.lg,
  ],
});
