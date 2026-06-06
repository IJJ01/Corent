// src/styles/theme/components.js
export function getComponentOverrides(mode) {
  const isDark = mode === "dark";

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: "background-color 180ms ease, color 180ms ease",
        },
      },
    },

    MuiButton: {
      defaultProps: {
        variant: "contained",
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10,
          paddingInline: 14,
          paddingBlock: 10,
          fontWeight: 700,
          transition: "transform 120ms ease, filter 120ms ease, background-color 180ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
            filter: "brightness(1.02)",
          },
          "&:active": {
            transform: "translateY(0px)",
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: "none",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          overflow: "hidden",
          transition: "transform 160ms ease, box-shadow 160ms ease",
          "&:hover": {
            transform: "translateY(-2px)",
          },
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        size: "medium",
        variant: "outlined",
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: "box-shadow 160ms ease, border-color 160ms ease",
          "&.Mui-focused": {
            boxShadow: isDark
              ? "0 0 0 4px rgba(139, 92, 246, 0.22)"
              : "0 0 0 4px rgba(124, 58, 237, 0.16)",
          },
        },
        input: {
          paddingBlock: 12,
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: { borderRadius: 14 },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 800 },
        root: { paddingTop: 12, paddingBottom: 12 },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 10,
          fontSize: 12,
        },
      },
    },
  };
}
