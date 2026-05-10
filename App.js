import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const RootApp = () => {
  const { isDarkMode, theme } = React.useContext(ThemeContext);
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NavigationContainer>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent />
        <AppNavigator />
      </NavigationContainer>
    </View>
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
