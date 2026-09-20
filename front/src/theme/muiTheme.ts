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
        default: isDark ? '#09090b' : '#f8fafc',
        paper: isDark ? '#121215' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      divider: isDark ? '#27272a' : '#e2e8f0',
      success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
      },
      info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
      },
      action: {
        hover: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        selected: isDark ? 'rgba(232, 97, 26, 0.16)' : 'rgba(232, 97, 26, 0.1)',
      },
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'].join(','),
      h1: {
        fontWeight: 800,
        letterSpacing: '-0.025em',
      },
      h2: {
        fontWeight: 800,
        letterSpacing: '-0.025em',
      },
      h3: {
        fontWeight: 800,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.015em',
      },
      h5: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontWeight: 700,
      },
      subtitle1: {
        fontWeight: 600,
      },
      subtitle2: {
        fontWeight: 600,
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
            transition: 'background-color 200ms ease, color 200ms ease',
          },
          '*::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '*::-webkit-scrollbar-track': {
            background: isDark ? '#09090b' : '#f1f5f9',
          },
          '*::-webkit-scrollbar-thumb': {
            background: isDark ? '#3f3f46' : '#cbd5e1',
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
            borderColor: isDark ? '#27272a' : '#e2e8f0',
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
            borderRadius: 12,
            paddingInline: 18,
            paddingBlock: 8,
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 14px 0 rgba(232, 97, 26, 0.25)',
            },
          },
          contained: {
            '&.MuiButton-containedPrimary': {
              background: 'linear-gradient(135deg, #e8611a 0%, #ff843c 100%)',
              color: '#ffffff',
              '&:hover': {
                background: 'linear-gradient(135deg, #d4500f 0%, #e8611a 100%)',
              },
            },
          },
          outlined: {
            borderColor: isDark ? '#3f3f46' : '#e2e8f0',
            '&:hover': {
              borderColor: '#e8611a',
              backgroundColor: alpha('#e8611a', 0.08),
            },
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
            backgroundColor: isDark ? '#18181b' : '#ffffff',
            '& fieldset': {
              borderColor: isDark ? '#27272a' : '#e2e8f0',
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
            padding: '13px 16px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${isDark ? '#27272a' : '#e2e8f0'}`,
            boxShadow: isDark
              ? '0 10px 30px -5px rgba(0,0,0,0.4), 0 2px 8px -2px rgba(0,0,0,0.3)'
              : '0 4px 20px -2px rgba(0,0,0,0.04), 0 2px 6px -1px rgba(0,0,0,0.02)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
          },
        },
      },
    },
  });
}
