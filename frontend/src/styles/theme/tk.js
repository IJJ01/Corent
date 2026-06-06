// src/styles/theme/tokens.js
export const brand = {
  purple: {
    50: "#F5F1FF",
    100: "#EDE4FF",
    200: "#DCCBFF",
    300: "#C7A8FF",
    400: "#B183FF",
    500: "#8B5CF6", // primary
    600: "#7C3AED",
    700: "#6D28D9",
    800: "#5B21B6",
    900: "#4C1D95",
  },
};

export const shape = {
  borderRadius: 10, // medium
};

// “Soft shadow” feel
export const softShadows = [
  "none",
  "0px 1px 2px rgba(16, 24, 40, 0.06), 0px 1px 3px rgba(16, 24, 40, 0.10)",
  "0px 2px 4px rgba(16, 24, 40, 0.06), 0px 4px 8px rgba(16, 24, 40, 0.10)",
  "0px 6px 12px rgba(16, 24, 40, 0.10)",
  "0px 10px 18px rgba(16, 24, 40, 0.12)",
  "0px 14px 26px rgba(16, 24, 40, 0.14)",
  ...Array.from({ length: 19 }, () => "0px 14px 26px rgba(16, 24, 40, 0.14)"),
];
