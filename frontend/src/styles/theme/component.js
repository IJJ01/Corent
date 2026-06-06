// src/styles/theme/component.js
import { alpha } from "@mui/material/styles";

export function getComponentOverrides(mode) {
  return {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        html: {
          height: "100%",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        body: {
          height: "100%",
          margin: 0,
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          transition: "background-color 200ms ease, color 200ms ease",
        },
        "#root": {
          minHeight: "100%",
        },
        ":root": {
          colorScheme: theme.palette.mode,
        },
        "::selection": {
          background: alpha(theme.palette.primary.main, 0.25),
        },
      }),
    },

    // ✅ PERMANENT: containers always full width
    MuiContainer: {
      defaultProps: {
        maxWidth: false,
        disableGutters: false,
      },
      styleOverrides: {
        root: {
          maxWidth: "100% !important", // ✅ kills the max-width cap forever
          width: "100%",
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 600,
          padding: "8px 16px",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          boxShadow: theme.shadows[2],
        }),
      },
    },

    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          boxShadow: "none",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor:
            theme.palette.mode === "light"
              ? alpha(theme.palette.common.black, 0.03)
              : alpha(theme.palette.common.white, 0.04),
        }),
      },
    },
  };
}
