import { createTheme } from '@mui/material/styles'

// Align Material UI tokens with Plax marketing site styling
export const theme = createTheme({
  palette: {
    primary: {
      main: '#175ee2',
      dark: '#0f3f9b',
      light: '#4b85ff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1f1f1f',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f6f8ff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f1f1f',
      secondary: '#4f5670',
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Switzer, Questrial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    button: { fontWeight: 600, letterSpacing: '0.02em' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(23, 94, 226, 0.08)',
          border: '1px solid rgba(23, 94, 226, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 999,
          padding: '0.75rem 1.75rem',
        },
        containedPrimary: {
          boxShadow: '0 18px 35px rgba(23, 94, 226, 0.25)',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontWeight: 600,
          color: '#1f1f1f',
        },
      },
    },
  },
})
