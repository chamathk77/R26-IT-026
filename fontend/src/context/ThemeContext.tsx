import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store'; 
import { ThemeMode, getTheme } from '../utils/theme'; 
import { MD3Theme } from 'react-native-paper';

interface ThemeContextType {
  currentThemeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  paperTheme: MD3Theme;
  systemColorScheme: 'light' | 'dark' | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const currentThemeMode = useSelector((state: RootState) => state.SystemInitializationReducer.theme);
  const systemColorScheme = useColorScheme();
  const resolvedTheme = useMemo<'light' | 'dark'>(() => {
    switch (currentThemeMode) {
      case 'light':
        return 'light';
      case 'dark':
        return 'dark';
      case 'system':
      default:
        return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
  }, [currentThemeMode, systemColorScheme]);

  // Get the paper theme based on resolved theme
  const paperTheme = getTheme(resolvedTheme);

  const value: ThemeContextType = {
    currentThemeMode,
    resolvedTheme,
    paperTheme,
    systemColorScheme: systemColorScheme ?? null,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 