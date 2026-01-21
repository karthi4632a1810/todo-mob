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
    primary: '#6366f1', // Modern indigo
    primaryDark: '#4f46e5',
    primaryLight: '#818cf8',
    secondary: '#06b6d4', // Modern cyan
    background: '#f8fafc', // Soft gray background
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    error: '#ef4444', // Modern red
    text: '#1e293b', // Dark slate
    textSecondary: '#64748b', // Slate gray
    textTertiary: '#94a3b8',
    border: '#e2e8f0', // Light slate border
    success: '#10b981', // Modern green
    warning: '#f59e0b', // Modern amber
    info: '#3b82f6', // Modern blue
    divider: '#f1f5f9',
    overlay: 'rgba(0, 0, 0, 0.5)',
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
    },
    bodyMedium: {
      fontSize: 16,
      fontWeight: '500',
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600',
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
    },
    captionMedium: {
      fontSize: 12,
      fontWeight: '500',
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

