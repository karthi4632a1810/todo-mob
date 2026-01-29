import React, { createContext, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const theme = {
  colors: {
    primary: '#2563eb', // Professional blue
    primaryDark: '#1e40af',
    primaryLight: '#3b82f6',
    secondary: '#64748b', // Professional slate gray
    background: '#f8fafc', // Clean neutral background
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    error: '#dc2626', // Professional red
    text: '#0f172a', // Deep slate for excellent readability
    textSecondary: '#475569', // Medium slate gray
    textTertiary: '#94a3b8', // Light slate gray
    border: '#e2e8f0', // Subtle border
    success: '#059669', // Professional green
    warning: '#d97706', // Professional amber
    info: '#0284c7', // Professional cyan
    divider: '#f1f5f9',
    overlay: 'rgba(15, 23, 42, 0.6)', // Professional dark overlay
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: -0.5,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.3,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: -0.2,
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: -0.1,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    bodyMedium: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    captionMedium: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
    },
  },
};

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

