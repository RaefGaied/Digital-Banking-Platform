import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { useMemo } from 'react';
import { useTheme } from './ThemeContext';
import { createAppTheme } from './muiTheme';

export default function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const muiTheme = useMemo(() => createAppTheme(theme), [theme]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
