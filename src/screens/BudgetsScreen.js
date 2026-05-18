import React, { useContext, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import Text from '../components/ThemeText';
import { formatMoney } from '../utils/formatUtils';
import { useNavigation } from '@react-navigation/native';

const BudgetsScreen = () => {
  const { theme } = useContext(ThemeContext);
  const { budgets, deleteBudget } = useContext(DataContext);
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  const safeTheme = theme || {
    background: '#0b0f10',
    surface: '#0b0f10',
    surfaceContainerLow: '#141b1d',
    onSurface: '#dde7eb',
    onSurfaceVariant: '#a3adb1',
    primary: '#b2cad3',
    onPrimary: '#1a1a1a',
    outlineVariant: '#40494d'
  };

  // Kalkulasi Total Bulanan
  const totalMonthlyEstimate = budgets.reduce((total, budget) => {
    return total + (budget.monthlyTotal || 0);
  }, 0);

  const dailyBudgets = budgets.filter(b => b.type === 'daily');
  const monthlyBudgets = budgets.filter(b => b.type === 'monthly' || b.type === 'fixed');

  const renderBudgetItem = (item, index) => (
    <Animated.View 
      key={item.id} 
      style={{
        backgroundColor: safeTheme.surfaceContainerLow,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: safeTheme.outlineVariant + '22',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: (item.color || safeTheme.primary) + '22',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
      }}>
        <MaterialIcons name={item.icon || 'attach-money'} size={24} color={item.color || safeTheme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: safeTheme.onSurface, marginBottom: 4 }}>{item.name}</Text>
        <Text style={{ fontSize: 12, color: safeTheme.onSurfaceVariant }}>
          Rp {formatMoney(item.amount)} {item.type === 'daily' ? '/ hari' : '/ bulan'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 10, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 4 }}>EST. BULANAN</Text>
        <Text style={{ fontSize: 14, fontWeight: '900', color: safeTheme.primary }}>Rp {formatMoney(item.monthlyTotal)}</Text>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: safeTheme.background }} edges={['top']}>
      {/* HEADER */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
          <MaterialIcons name="arrow-back-ios" size={20} color={safeTheme.onSurface} />
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: '900', color: safeTheme.onSurface, letterSpacing: -0.5 }}>Rencana Kita</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* TOTAL ESTIMATE CARD */}
          <LinearGradient
            colors={[safeTheme.primary + '22', safeTheme.primary + '05']}
            style={{ borderRadius: 28, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: safeTheme.primary + '33' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MaterialIcons name="account-balance-wallet" size={24} color={safeTheme.primary} />
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: safeTheme.primary }}>TOTAL ESTIMASI BULANAN</Text>
            </View>
            <Text style={{ fontSize: 36, fontWeight: '900', color: safeTheme.onSurface, letterSpacing: -1 }}>
              Rp {formatMoney(totalMonthlyEstimate)}
            </Text>
            <Text style={{ fontSize: 12, color: safeTheme.onSurfaceVariant, marginTop: 8 }}>
              Kalkulasi kebutuhan rutin kita tiap bulan. Yuk diatur dengan baik!
            </Text>
          </LinearGradient>

          {/* ADD BUTTON */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('AddBudget')}
            activeOpacity={0.8}
            style={{ 
              backgroundColor: safeTheme.primary, 
              paddingVertical: 16, 
              borderRadius: 20,
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 8,
              marginBottom: 32,
              shadowColor: safeTheme.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, 
              shadowRadius: 8, 
              elevation: 4
            }}
          >
            <MaterialIcons name="add" size={24} color={safeTheme.onPrimary} />
            <Text style={{ color: safeTheme.onPrimary, fontWeight: '900', fontSize: 16 }}>Tambah Rencana Keuangan</Text>
          </TouchableOpacity>

          {budgets.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <MaterialIcons name="auto-awesome" size={64} color={safeTheme.primary + '33'} />
              <Text style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold', color: safeTheme.onSurface }}>Belum Ada Rencana</Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: safeTheme.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 20 }}>
                Ayo mulai atur keuangan kita! Catat perkiraan harian atau bulanan biar lebih terencana.
              </Text>
            </View>
          ) : (
            <>
              {dailyBudgets.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 12, marginLeft: 8 }}>KEBUTUHAN HARIAN</Text>
                  {dailyBudgets.map(renderBudgetItem)}
                </View>
              )}

              {monthlyBudgets.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 12, marginLeft: 8 }}>KEBUTUHAN BULANAN / TETAP</Text>
                  {monthlyBudgets.map(renderBudgetItem)}
                </View>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BudgetsScreen;
