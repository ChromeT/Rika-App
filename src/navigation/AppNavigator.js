import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Image } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

import DashboardScreen from '../screens/DashboardScreen';
import GoalsScreen from '../screens/GoalsScreen';
import TransactionScreen from '../screens/TransactionScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';
import MemoryDetailScreen from '../screens/MemoryDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import JoinRoomScreen from '../screens/JoinRoomScreen';
import { AddGoalScreen } from '../screens/GoalsScreen';
import AchieveGoalScreen from '../screens/AchieveGoalScreen';
import EditGoalScreen from '../screens/EditGoalScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import WalletsScreen from '../screens/WalletsScreen';
import AddAccountScreen from '../screens/AddAccountScreen';
import TransferScreen from '../screens/TransferScreen';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

// Pre-require tab icons for static analysis
const berandaIcon = require('../../assets/icons/beranda.png');
const riwayatIcon = require('../../assets/icons/riwayat.png');
const goalsIcon = require('../../assets/icons/goals.png');
const settingsIcon = require('../../assets/icons/settings.png');

const TabBarBackground = () => {
  const { isDarkMode } = useContext(ThemeContext);
  return (
    <BlurView
      tint={isDarkMode ? 'dark' : 'light'}
      intensity={80}
      style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: 'hidden' }]}
    />
  );
};

const MainTabs = () => {
  const { theme } = useContext(ThemeContext);
  const [iconError, setIconError] = useState({});

  const renderTabIcon = (routeName, imageSource, materialName, color) => {
    const hasError = iconError[routeName];
    if (hasError) {
      return <MaterialIcons name={materialName} size={24} color={color} />;
    }
    return (
      <Image
        source={imageSource}
        style={{ width: 24, height: 24, tintColor: color }}
        onError={() => setIconError(prev => ({ ...prev, [routeName]: true }))}
      />
    );
  };

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      style={{ backgroundColor: theme.background }}
      sceneContainerStyle={{ backgroundColor: theme.background }}
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        swipeEnabled: true,
        lazy: false,
        tabBarIndicator: () => null,
        tabBarIndicatorStyle: { height: 0, opacity: 0, backgroundColor: 'transparent' },
        tabBarStyle: {
          height: 70,
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          borderRadius: 32,
          backgroundColor: theme.surface,
          borderTopWidth: 0,
          borderBottomWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.3,
          shadowRadius: 24,
          paddingHorizontal: 16,
          elevation: 0,
          overflow: 'hidden',
          borderWidth: 0,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.onSurfaceVariant,
        tabBarShowIcon: true,
        tabBarIconStyle: {
          marginTop: 4,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          textTransform: 'none',
          marginBottom: 4,
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 4,
        },
      })}
    >
       <Tab.Screen
        name="Beranda"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => renderTabIcon('Beranda', berandaIcon, 'home', color),
        }}
      />
      <Tab.Screen
        name="Riwayat"
        component={TransactionHistoryScreen}
        options={{
          tabBarIcon: ({ color }) => renderTabIcon('Riwayat', riwayatIcon, 'list', color),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarIcon: ({ color }) => renderTabIcon('Goals', goalsIcon, 'favorite', color),
        }}
      />
      <Tab.Screen
        name="Pengaturan"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => renderTabIcon('Pengaturan', settingsIcon, 'settings', color),
        }}
      />
    </Tab.Navigator>
  );
};

// Stack wrapping tabs + TransactionScreen as a full-screen modal
const MainStack = () => {
  const { theme } = useContext(ThemeContext);
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 350,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Transaksi"
        component={TransactionScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="AddGoal"
        component={AddGoalScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
      />
      <Stack.Screen
        name="AchieveGoal"
        component={AchieveGoalScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="EditGoal"
        component={EditGoalScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="MemoryDetail"
        component={MemoryDetailScreen}
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
      />
      <Stack.Screen
        name="Wallets"
        component={WalletsScreen}
      />
      <Stack.Screen
        name="AddAccount"
        component={AddAccountScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Transfer"
        component={TransferScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
      <Stack.Screen name="JoinRoom" component={JoinRoomScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return user ? <MainStack /> : <AuthStack />;
};

const styles = StyleSheet.create({
  iconWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 16,
  }
});

export default AppNavigator;
