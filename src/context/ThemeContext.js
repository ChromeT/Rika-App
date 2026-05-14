import React, { createContext, useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

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
    background: '#f0f4f8',
    surface: '#ffffff',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#e8eff5',
    surfaceContainer: '#e1e9f1',
    surfaceContainerHigh: '#d9e3ed',
    surfaceContainerHighest: '#ccd9e6',
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
  { name: 'PlusJakartaSans-Regular', displayName: 'Modern Jakarta' },
  { name: 'BeVietnamPro-Light', displayName: 'Minimalist Light' },
  { name: 'PlusJakartaSans-ExtraBold', displayName: 'Bold Sans' },
  { name: 'monospace', displayName: 'Modern Mono' },
  { name: 'serif', displayName: 'Elegant Serif' },
];

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState(null);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [fontFamily, setFontFamily] = useState('System');
  const [customFonts, setCustomFonts] = useState([]); // List of {name, displayName, uri}

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@rika_theme');
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === 'dark');
        }
        const storedAccent = await AsyncStorage.getItem('@rika_accent');
        if (storedAccent) setAccentColor(storedAccent);

        // Load custom fonts list
        const storedCustomFonts = await AsyncStorage.getItem('@rika_custom_fonts');
        if (storedCustomFonts) {
          const parsed = JSON.parse(storedCustomFonts);
          setCustomFonts(parsed);
          
          // Register all custom fonts individually to prevent one fail from blocking all
          for (const f of parsed) {
            try {
              await Font.loadAsync({ [f.name]: { uri: f.uri } });
            } catch (fe) {
              console.warn(`Failed to load custom font: ${f.name}`, fe);
            }
          }
        }

        const storedFont = await AsyncStorage.getItem('@rika_font');
        if (storedFont) setFontFamily(storedFont);
      } catch (e) {
        console.error('Failed to load theme settings', e);
      } finally {
        // Ensure we always unlock the UI
        setThemeLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const uploadFont = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const ext = asset.name.split('.').pop().toLowerCase();
        if (ext !== 'ttf' && ext !== 'otf') {
          Alert.alert('Format Salah', 'Harap pilih file dengan ekstensi .ttf atau .otf');
          return false;
        }

        const fontName = asset.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now();
        let finalUri = asset.uri;

        if (Platform.OS === 'web') {
          // --- WEB LOGIC ---
          try {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            
            finalUri = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (webErr) {
            console.error('Web font processing error:', webErr);
            Alert.alert('Error', 'Gagal memproses file di browser: ' + webErr.message);
            return false;
          }
        } else {
          // --- NATIVE LOGIC (iOS & Android) ---
          try {
            const fontsDir = `${FileSystem.documentDirectory}fonts/`;
            // Check if makeDirectoryAsync exists (legacy vs new API)
            if (FileSystem.makeDirectoryAsync) {
              await FileSystem.makeDirectoryAsync(fontsDir, { intermediates: true });
            }
            const destPath = `${fontsDir}${asset.name}`;
            await FileSystem.copyAsync({ from: asset.uri, to: destPath });
            finalUri = destPath;
          } catch (nativeErr) {
            console.error('Native font storage error:', nativeErr);
            // Fallback to original URI if copy fails
          }
        }

        // Load it immediately
        try {
          await new Promise(r => setTimeout(r, 100));
          // Using { uri } object is the most consistent across all 3 platforms
          await Font.loadAsync({ [fontName]: { uri: finalUri } });
        } catch (loadErr) {
          console.error('Initial font load error:', loadErr);
          Alert.alert('Gagal Load', 'Sistem tidak dapat memproses file font ini. ' + loadErr.message);
          return false;
        }

        // Save to list
        const newCustomFonts = [...customFonts, { name: fontName, displayName: asset.name, uri: finalUri }];
        setCustomFonts(newCustomFonts);
        await AsyncStorage.setItem('@rika_custom_fonts', JSON.stringify(newCustomFonts));
        
        // Auto select it
        await changeFont(fontName);
        
        return true;
      }
    } catch (e) {
      console.error('Error uploading font:', e);
      Alert.alert('Error', 'Gagal mengunggah font: ' + e.message);
      return false;
    }
    return false;
  };

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

  const deleteFont = async (fontName) => {
    try {
      const newCustomFonts = customFonts.filter(f => f.name !== fontName);
      setCustomFonts(newCustomFonts);
      await AsyncStorage.setItem('@rika_custom_fonts', JSON.stringify(newCustomFonts));
      
      // If the deleted font was the current one, fallback to System
      if (fontFamily === fontName) {
        await changeFont('System');
      }
      return true;
    } catch (e) {
      console.error('Error deleting font:', e);
      return false;
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      isDarkMode, 
      toggleTheme, 
      changeAccent, 
      accentColor, 
      fontFamily, 
      changeFont, 
      customFonts, 
      uploadFont,
      deleteFont
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
