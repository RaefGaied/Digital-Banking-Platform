import { alpha, createTheme } from '@mui/material/styles';

export function createAppTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#e8611a',
        light: '#ff843c',
        dark: '#b03d0b',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#09090b' : '#faf0e6',
        paper: isDark ? '#18181b' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f3f4f6' : '#2d2d2d',
        secondary: isDark ? '#9ca3af' : '#6b7280',
      },
      divider: isDark ? '#3f3f46' : '#f5e0cc',
      success: {
        main: '#22c55e',
      },
      warning: {
        main: '#f59e0b',
      },
      error: {
        main: '#ef4444',
      },
      info: {
        main: '#3b82f6',
      },
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
      h1: {
        fontWeight: 800,
      },
      h2: {
        fontWeight: 800,
      },
      h3: {
        fontWeight: 700,
      },
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 700,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 180ms ease, color 180ms ease',
          },
          '*::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '*::-webkit-scrollbar-track': {
            background: isDark ? '#09090b' : '#faf0e6',
          },
          '*::-webkit-scrollbar-thumb': {
            background: isDark ? '#52525b' : '#ffd0aa',
            borderRadius: '999px',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            background: '#e8611a',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${isDark ? '#3f3f46' : '#f5e0cc'}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            paddingInline: 20,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: isDark ? '#111827' : '#ffffff',
            '& fieldset': {
              borderColor: isDark ? '#3f3f46' : '#e1d0be',
            },
            '&:hover fieldset': {
              borderColor: '#e8611a',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#e8611a',
              borderWidth: 1.5,
            },
          },
          input: {
            padding: '15px 16px',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${alpha('#e8611a', isDark ? 0.2 : 0.12)}`,
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.32)' : '0 10px 30px rgba(17,24,39,0.08)',
          },
        },
      },
    },
  });
}
