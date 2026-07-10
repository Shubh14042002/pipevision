// src/theme.js
import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#e10000',    // Primary Red
      dark: '#b2151b',    // Darker variant for hover states
    },
    secondary: {
      main: '#292a2e',    // Dark text color; adjust if needed based on guidelines
    },
    background: {
      default: '#F9F9F9', // Light neutral background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#292a2e',
      secondary: '#808080',
    },
  },
  typography: {
    fontFamily: '"Montserrat", sans-serif', // Body copy
    h1: {
      fontFamily: '"DIN Condensed", sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"DIN Condensed", sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"DIN Condensed", sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"DIN Condensed", sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontWeight: 700,
    },
    // Customize body1, body2 if needed.
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8, // Defines 8px as the base spacing unit
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9999,           // Pill-shaped buttons
          textTransform: 'uppercase',
          fontWeight: 700,
          fontSize: '1.125rem',
          padding: 'calc(0.667em + 2px) calc(1.333em + 2px)',
          transition: 'background-color 0.3s ease, color 0.3s ease',
          backgroundColor: '#e10000',    // Primary red
          color: '#fff',
          '&:hover': {
            backgroundColor: '#b2151b',  // Darker red on hover
            color: '#fff',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          backgroundColor: alpha('#e10000', 0.8), // Primary red with 80% opacity
        },
      },
    },
    // Additional component overrides can be added here as needed.
  },
});

export default theme;
