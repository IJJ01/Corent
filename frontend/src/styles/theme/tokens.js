// src/styles/theme/tokens.js
// Premium design tokens derived from primary brand color: #310047

export const brand = {
  primary: {
    50: "#F6F1FA",
    100: "#E9E3F0",
    200: "#CFC1E0",
    300: "#B49CCF",
    400: "#8E6AA3",
    500: "#6A3A82",
    600: "#310047", // MAIN
    700: "#2C003D",
    800: "#240032",
    900: "#1B0027",
  },
};

export const neutral = {
  0: "#FFFFFF",
  50: "#F8FAFC",
  100: "#F1F3F6",
  200: "#D1D5DB",
  300: "#9AA3B2",
  400: "#6B7280",
  500: "#3B475A",
  600: "#2A3342",
  700: "#1E2530",
  800: "#151A21",
  900: "#0E1116",
};

export const semantic = {
  success: { main: "#2E7D6B", soft: "#E6F4F1" },
  warning: { main: "#B87A1E", soft: "#FFF3E0" },
  error: { main: "#A63A3A", soft: "#FCEAEA" },
  info: { main: "#3A66A6", soft: "#EAF1FC" },
};

export const shape = {
  borderRadius: 14,
};

// Soft premium shadows (works on light + dark)
export const softShadows = [
  "none",
  "0px 1px 2px rgba(15, 23, 42, 0.06), 0px 1px 3px rgba(15, 23, 42, 0.10)",
  "0px 2px 6px rgba(15, 23, 42, 0.08), 0px 6px 14px rgba(15, 23, 42, 0.12)",
  "0px 10px 24px rgba(15, 23, 42, 0.14)",
  "0px 14px 36px rgba(15, 23, 42, 0.18)",
  ...Array(20).fill("0px 14px 36px rgba(15, 23, 42, 0.18)"),
];

export const typography = {
  fontFamily: [
    "Inter",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Arial",
    "sans-serif",
  ].join(","),
};
 