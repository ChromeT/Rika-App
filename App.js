import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import { AuthProvider } from './src/context/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

const RootApp = () => {
  const themeContext = React.useContext(ThemeContext);
  
  if (!themeContext) return null;

  const { isDarkMode, theme } = themeContext;
  
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.background,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <NavigationContainer theme={navTheme}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent />
            <AppNavigator />
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0f10' }}>
        <ActivityIndicator size="large" color="#b2cad3" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <RootApp />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
