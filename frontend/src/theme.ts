// src/theme.ts
import { createTheme } from "@mui/material/styles";

// Midnight + mint + periwinkle palette
const JAC_BG = "#0B1024";
const JAC_SIDEBAR = "#0F1831";
const JAC_MINT = "#5BE0B3";
const JAC_PERIWINKLE = "#7A8BFF";

export const jacTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: JAC_MINT,
    },
    secondary: {
      main: JAC_PERIWINKLE,
    },
    background: {
      default: JAC_BG,
      paper: JAC_SIDEBAR,
    },
    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255,255,255,0.7)",
    },
  },
  shape: {
    borderRadius: 18,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(24px)",
          backgroundImage:
            "linear-gradient(135deg, rgba(91,224,179,0.08), rgba(122,139,255,0.12))",
          border: "1px solid rgba(255,255,255,0.06)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: JAC_BG,
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        },
      },
    },
  },
});

// backwards-compat if something imports { theme }
export const theme = jacTheme;

// DEFAULT EXPORT – this is what your main.tsx is importing
export default jacTheme;
