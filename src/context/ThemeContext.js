import React, { createContext, useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const themes = {
  dark: {
    background: '#0b0f10',
    surface: '#111618',
    surfaceContainerLowest: '#070a0b',
    surfaceContainerLow: '#141b1d',
    surfaceContainer: '#1a2225',
    surfaceContainerHigh: '#212a2e',
    surfaceContainerHighest: '#2a353a',
    onSurface: '#f1f5f9',
    onSurfaceVariant: '#94a3b8',
    outline: '#334155',
    outlineVariant: '#1e293b',
    primary: '#7dd3fc',
    onPrimary: '#082f49',
    primaryContainer: '#0c4a6e',
    onPrimaryContainer: '#e0f2fe',
    secondary: '#94a3b8',
    onSecondary: '#0f172a',
    secondaryContainer: '#1e293b',
    onSecondaryContainer: '#f1f5f9',
    tertiary: '#c4b5fd',
    onTertiary: '#2e1065',
    tertiaryContainer: '#4c1d95',
    onTertiaryContainer: '#ede9fe',
    error: '#fb7185',
    onError: '#4c0519',
    errorContainer: '#881337',
    onErrorContainer: '#ffe4e6',
    fontFamily: 'System',
  },
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f1f5f9',
    surfaceContainer: '#f1f5f9',
    surfaceContainerHigh: '#e2e8f0',
    surfaceContainerHighest: '#cbd5e1',
    onSurface: '#0f172a',
    onSurfaceVariant: '#475569',
    outline: '#cbd5e1',
    outlineVariant: '#e2e8f0',
    primary: '#0284c7',
    onPrimary: '#ffffff',
    primaryContainer: '#e0f2fe',
    onPrimaryContainer: '#0369a1',
    secondary: '#64748b',
    onSecondary: '#ffffff',
    secondaryContainer: '#f1f5f9',
    onSecondaryContainer: '#1e293b',
    tertiary: '#7c3aed',
    onTertiary: '#ffffff',
    tertiaryContainer: '#f5f3ff',
    onTertiaryContainer: '#7c3aed',
    error: '#e11d48',
    onError: '#ffffff',
    errorContainer: '#fff1f2',
    onErrorContainer: '#e11d48',
    fontFamily: 'System',
  }
};

export const ThemeContext = createContext();

// Available fonts for selection
export const availableFonts = [
  { name: 'System', displayName: 'System Default' },
  { name: 'serif', displayName: 'Elegant Serif' },
  { name: 'monospace', displayName: 'Modern Mono' },
  { name: 'sans-serif', displayName: 'Clean Sans' },
  { name: 'sans-serif-light', displayName: 'Minimalist Light' },
  { name: 'sans-serif-medium', displayName: 'Bold Sans' },
  { name: 'Roboto', displayName: 'Roboto' },
];

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState(null);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [fontFamily, setFontFamily] = useState('System');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@rika_theme');
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === 'dark');
        }
        const storedAccent = await AsyncStorage.getItem('@rika_accent');
        if (storedAccent) setAccentColor(storedAccent);

        const storedFont = await AsyncStorage.getItem('@rika_font');
        if (storedFont) setFontFamily(storedFont);
      } catch (e) {
        console.error('Failed to load theme settings', e);
      } finally {
        setThemeLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const changeAccent = async (colorHex) => {
    setAccentColor(colorHex);
    await AsyncStorage.setItem('@rika_accent', colorHex);
  };

  const changeFont = async (fontName) => {
    setFontFamily(fontName);
    await AsyncStorage.setItem('@rika_font', fontName);
  };

  const toggleTheme = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem('@rika_theme', newValue ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  // Apply base theme
  const baseTheme = isDarkMode ? themes.dark : themes.light;
  const theme = { ...baseTheme, fontFamily };

  // Helper to validate hex color
  const isValidHex = (color) => {
    if (!color) return false;
    return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(color);
  };
  if (accentColor && isValidHex(accentColor)) {
    theme.primary = accentColor;
    if (isDarkMode) {
      theme.primaryContainer = accentColor + '33'; // ~20% opacity
      theme.onPrimaryContainer = accentColor;
    } else {
      theme.primaryContainer = accentColor + '1A'; // ~10% opacity
      theme.onPrimaryContainer = accentColor;
    }
  }

  if (!themeLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themes.dark.background }}>
        <ActivityIndicator size="large" color={themes.dark.primary} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, changeAccent, accentColor, fontFamily, changeFont }}>
      {children}
    </ThemeContext.Provider>
  );
};
