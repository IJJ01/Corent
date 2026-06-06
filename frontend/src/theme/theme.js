import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  shape: { borderRadius: 16 },
  palette: {
    mode: "dark",
    background: {
      default: "#0B0A14",
      paper: "#151427",
    },
    primary: { main: "#6D5EF6" },
    success: { main: "#38D27D" },
    warning: { main: "#F5C16C" },
    text: {
      primary: "#EAEAF2",
      secondary: "#A7A8B6",
    },
    divider: "rgba(255,255,255,0.08)",
  },
  typography: {
    fontFamily: `"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
    h4: { fontWeight: 800 },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 14, paddingInline: 16, paddingBlock: 10 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: "rgba(255,255,255,0.03)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
  },
});
