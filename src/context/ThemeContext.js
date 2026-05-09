import React, { createContext, useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const themes = {
  dark: {
    background: '#0b0f10',
    surface: '#0b0f10',
    surfaceContainerLowest: '#000000',
    surfaceContainerLow: '#0e1416',
    surfaceContainer: '#141b1d',
    surfaceContainerHigh: '#192123',
    surfaceContainerHighest: '#1e272a',
    onSurface: '#dde7eb',
    onSurfaceVariant: '#a3adb1',
    outline: '#6d777b',
    outlineVariant: '#40494d',
    primary: '#b2cad3',
    onPrimary: '#1a1a1a',
    primaryContainer: '#3f565e',
    onPrimaryContainer: '#cfe7f1',
    secondary: '#b3cad3',
    onSecondary: '#2d434b',
    secondaryContainer: '#283f46',
    onSecondaryContainer: '#abc3cc',
    tertiary: '#d5e3ff',
    onTertiary: '#3c5275',
    tertiaryContainer: '#bed5ff',
    onTertiaryContainer: '#334a6c',
    error: '#fa746f',
    onError: '#490006',
    errorContainer: '#871f21',
    onErrorContainer: '#ff9993',
    fontFamily: 'System',
  },
  light: {
    background: '#f5f5f7',
    surface: '#ffffff',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f0f0f2',
    surfaceContainer: '#e8e8ec',
    surfaceContainerHigh: '#dcdee3',
    surfaceContainerHighest: '#c8ccd1',
    onSurface: '#1a1d21',
    onSurfaceVariant: '#5f6368',
    outline: '#dadce0',
    outlineVariant: '#e8eaed',
    primary: '#5f6368',
    onPrimary: '#ffffff',
    primaryContainer: '#e8eaed',
    onPrimaryContainer: '#5f6368',
    secondary: '#80868b',
    onSecondary: '#ffffff',
    secondaryContainer: '#e8eaed',
    onSecondaryContainer: '#80868b',
    tertiary: '#7c3aed',
    onTertiary: '#ffffff',
    tertiaryContainer: '#ede9fe',
    onTertiaryContainer: '#7c3aed',
    error: '#d93025',
    onError: '#ffffff',
    errorContainer: '#fad2cf',
    onErrorContainer: '#d93025',
    fontFamily: 'System',
  }
};

export const ThemeContext = createContext();

// Available fonts for selection
export const availableFonts = [
  { name: 'System', displayName: 'System Default' },
  { name: 'serif', displayName: 'Serif' },
  { name: 'monospace', displayName: 'Monospace' },
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
  const isValidHex = (color) => /^#[0-9A-F]{6}$/i.test(color);
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
