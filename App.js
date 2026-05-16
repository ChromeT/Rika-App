import React from 'react';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { 
  PlusJakartaSans_400Regular, 
  PlusJakartaSans_700Bold, 
  PlusJakartaSans_800ExtraBold 
} from '@expo-google-fonts/plus-jakarta-sans';
import { 
  BeVietnamPro_300Light, 
  BeVietnamPro_400Regular, 
  BeVietnamPro_600SemiBold 
} from '@expo-google-fonts/be-vietnam-pro';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import { AuthProvider } from './src/context/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { Text } from 'react-native';

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
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
    'BeVietnamPro-Light': BeVietnamPro_300Light,
    'BeVietnamPro-Regular': BeVietnamPro_400Regular,
    'BeVietnamPro-SemiBold': BeVietnamPro_600SemiBold,
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
