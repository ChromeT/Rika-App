import React, { useContext, useEffect, useState, useMemo, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { formatMoney } from '../utils/formatUtils';
import Text from '../components/ThemeText';

dayjs.locale('id');

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function PlanningScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const {
    budgets, installments, allInstallments,
    calculateMonthlyBudget, getTotalInstallmentsThisMonth,
    getRealizationByCategory, getUpcomingInstallments,
    scheduleInstallmentNotifications,
  } = useContext(DataContext);

  const [selectedMonth] = useState(dayjs().month());
  const [selectedYear] = useState(dayjs().year());

  const currentMonthDays = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }, []);

  const normalizeCategory = (str) => str?.toLowerCase().trim() ?? '';

  const monthlyBudget = calculateMonthlyBudget();
  const totalInstallments = getTotalInstallmentsThisMonth();
  const grandTotal = monthlyBudget + totalInstallments;
  const realization = getRealizationByCategory(selectedMonth, selectedYear);
  const totalRealization = Object.values(realization).reduce((a, b) => a + b, 0);
  const surplus = grandTotal - totalRealization;
  const isSurplus = surplus >= 0;
  const upcomingInstallments = getUpcomingInstallments(7);

  const overBudgetCount = useMemo(() => {
    return budgets.filter(b => {
      if (!b.isActive) return false;
      const monthly = b.type === 'daily'
        ? Number(b.estimatedAmount) * Number(b.daysPerMonth || currentMonthDays)
        : Number(b.estimatedAmount);
      const real = realization[normalizeCategory(b.category)] || 0;
      return real > monthly;
    }).length;
  }, [budgets, realization, currentMonthDays]);

  const partnerName = user?.partnerName || 'Pasangan';

  // Stagger animations
  const fadeAnims = useRef([0,0,0,0,0].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([0,0,0,0,0].map(() => new Animated.Value(20))).current;

  const handleTransition = (screenName, params = {}) => {
    Animated.parallel(
      fadeAnims.map((f, i) =>
        Animated.parallel([
          Animated.timing(f, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(slideAnims[i], { toValue: -20, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        ])
      )
    ).start(() => {
      navigation.navigate(screenName, params);
    });
  };

  useEffect(() => {
    scheduleInstallmentNotifications();
    const unsubscribe = navigation.addListener('focus', () => {
      fadeAnims.forEach(f => f.setValue(0));
      slideAnims.forEach(s => s.setValue(20));
      Animated.stagger(100, fadeAnims.map((f, i) =>
        Animated.parallel([
          Animated.timing(f, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
          Animated.spring(slideAnims[i], { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' }),
        ])
      )).start();
    });
    return unsubscribe;
  }, [navigation]);

  const s = makeStyles(theme);

  const renderBudgetRow = (budget) => {
    const monthly = budget.type === 'daily'
      ? Number(budget.estimatedAmount) * Number(budget.daysPerMonth || currentMonthDays)
      : Number(budget.estimatedAmount);
    const real = realization[normalizeCategory(budget.category)] || 0;
    const pct = monthly > 0 ? Math.min(real / monthly, 1) : 0;
    const isOver = real > monthly;

    return (
      <View key={budget.id} style={s.budgetRow}>
        <View style={s.budgetLeft}>
          <View style={[s.budgetIconWrap, { backgroundColor: isOver ? '#EF444415' : theme.primary + '15' }]}>
            <MaterialIcons name={budget.icon || 'label'} size={18} color={isOver ? '#EF4444' : theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.budgetCat}>{budget.category}</Text>
            <Text style={s.budgetOwner}>{budget.owner}</Text>
          </View>
        </View>
        <View style={s.budgetRight}>
          <Text style={[s.budgetReal, isOver && { color: '#EF4444' }]}>Rp {formatMoney(real)}</Text>
          <Text style={s.budgetEst}>/ Rp {formatMoney(monthly)}</Text>
          <View style={s.miniProgress}>
            <View style={[s.miniProgressFill, { width: `${pct * 100}%`, backgroundColor: isOver ? '#EF4444' : theme.primary }]} />
          </View>
          {isOver && <Text style={s.overText}>Over budget</Text>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={[s.pageHeader, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
          <View>
            <Text style={s.pageTitle}>Rencana Keuangan</Text>
            <Text style={s.pageSubtitle}>{MONTH_NAMES[selectedMonth]} {selectedYear}</Text>
          </View>
          {overBudgetCount > 0 && (
            <View style={s.alertBadge}>
              <MaterialIcons name="warning" size={14} color="#fff" />
              <Text style={s.alertBadgeText}>{overBudgetCount} over</Text>
            </View>
          )}
        </Animated.View>

        {/* Summary Gradient Card */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <LinearGradient
            colors={isSurplus ? [theme.primary, (theme.primaryContainer || theme.primary) + 'CC'] : ['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.summaryCard}
          >
            <View style={s.summaryTop}>
              <View>
                <Text style={s.summaryLabel}>TOTAL ESTIMASI</Text>
                <Text style={s.summaryAmount}>Rp {formatMoney(grandTotal)}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View>
                <Text style={s.summaryLabel}>REALISASI</Text>
                <Text style={s.summaryAmount}>Rp {formatMoney(totalRealization)}</Text>
              </View>
            </View>
            <View style={s.summaryDividerH} />
            <View style={s.surplusRow}>
              <MaterialIcons name={isSurplus ? 'trending-down' : 'trending-up'} size={18} color="rgba(255,255,255,0.9)" />
              <Text style={s.surplusLabel}>{isSurplus ? 'Surplus' : 'Defisit'}</Text>
              <Text style={s.surplusAmount}>Rp {formatMoney(Math.abs(surplus))}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Cicilan Section */}
        <Animated.View style={[s.section, { opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }]}>
          <View style={s.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={s.sectionTitle}>Cicilan</Text>
              {upcomingInstallments.length > 0 && (
                <View style={[s.alertBadge, { backgroundColor: '#EF4444' }]}>
                  <Text style={s.alertBadgeText}>{upcomingInstallments.length} jatuh tempo!</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={s.seeAllBtn} onPress={() => handleTransition('InstallmentsList', { partnerName })}>
              <Text style={s.seeAllText}>Lihat Semua</Text>
              <MaterialIcons name="chevron-right" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <View style={s.installSummaryRow}>
              <View>
                <Text style={s.cardSubLabel}>TOTAL BULAN INI</Text>
                <Text style={s.cardBigNumber}>Rp {formatMoney(totalInstallments)}</Text>
              </View>
              <View style={[s.countBadge, { backgroundColor: theme.primary + '1A' }]}>
                <MaterialIcons name="credit-card" size={14} color={theme.primary} />
                <Text style={[s.countText, { color: theme.primary }]}>
                  {allInstallments.filter(i => i.isActive && i.remainingMonths > 0).length} cicilan
                </Text>
              </View>
            </View>

            {upcomingInstallments.length > 0 && (
              <>
                <View style={s.cardDivider} />
                <Text style={[s.cardSubLabel, { color: '#EF4444', marginBottom: 8 }]}>JATUH TEMPO MINGGU INI</Text>
                {upcomingInstallments.map(inst => {
                  const daysLeft = inst.dueDate >= dayjs().date()
                    ? inst.dueDate - dayjs().date()
                    : (dayjs().daysInMonth() - dayjs().date()) + inst.dueDate;
                  return (
                    <View key={inst.id} style={s.upcomingRow}>
                      <View style={[s.upcomingIcon, { backgroundColor: '#EF444415' }]}>
                        <MaterialIcons name={inst.icon || 'credit-card'} size={18} color="#EF4444" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.upcomingName}>{inst.name}</Text>
                        <Text style={s.upcomingDue}>
                          {daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi • tgl ${inst.dueDate}`}
                        </Text>
                      </View>
                      <Text style={s.upcomingAmt}>Rp {formatMoney(inst.monthlyAmount)}</Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </Animated.View>

        {/* Budget Section */}
        <Animated.View style={[s.section, { opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }]}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Budget per Kategori</Text>
            <TouchableOpacity style={s.seeAllBtn} onPress={() => handleTransition('BudgetSetup', { partnerName })}>
              <Text style={s.seeAllText}>Atur</Text>
              <MaterialIcons name="chevron-right" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {budgets.filter(b => b.isActive).length === 0 ? (
            <TouchableOpacity style={[s.card, s.emptyCard]} onPress={() => handleTransition('BudgetSetup', { partnerName })}>
              <View style={s.emptyIconWrap}>
                <MaterialIcons name="playlist-add-check" size={36} color={theme.primary + '55'} />
              </View>
              <Text style={s.emptyCardTitle}>Belum ada budget</Text>
              <Text style={s.emptyCardSub}>Tap untuk atur budget bulan ini</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.card}>
              {budgets.filter(b => b.isActive).map(renderBudgetRow)}
            </View>
          )}
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB — Floating Action Button, selalu kelihatan */}
      <Animated.View style={[s.fab, { opacity: fadeAnims[4] }]}>
        <TouchableOpacity
          style={s.fabBtn}
          onPress={() => handleTransition('BudgetSetup', { partnerName })}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[theme.primary, (theme.primaryContainer || theme.primary) + 'CC']}
            style={s.fabGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="playlist-add" size={24} color={theme.onPrimary || '#fff'} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 4 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: t.onSurface, letterSpacing: -1 },
  pageSubtitle: { fontSize: 14, color: t.onSurfaceVariant, fontWeight: '600', marginTop: 2 },
  alertBadge: { backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertBadgeText: { fontSize: 11, color: '#fff', fontWeight: '800' },

  summaryCard: { borderRadius: 32, padding: 24, marginVertical: 16, shadowColor: t.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  summaryLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  summaryAmount: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  summaryDividerH: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 16 },
  surplusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  surplusLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '700', flex: 1 },
  surplusAmount: { fontSize: 18, fontWeight: '900', color: '#fff' },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: t.onSurface, letterSpacing: -0.5 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: t.primary, fontWeight: '700' },

  card: { backgroundColor: t.surfaceContainerLow || t.surface, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: (t.outlineVariant || '#888') + '1A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  cardDivider: { height: 1, backgroundColor: (t.outlineVariant || '#888') + '22', marginVertical: 14 },
  cardSubLabel: { fontSize: 9, fontWeight: '800', color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  cardBigNumber: { fontSize: 24, fontWeight: '900', color: t.onSurface, letterSpacing: -0.5 },
  installSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countBadge: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  countText: { fontSize: 13, fontWeight: '800' },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  upcomingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upcomingName: { fontSize: 14, fontWeight: '700', color: t.onSurface },
  upcomingDue: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: 1 },
  upcomingAmt: { fontSize: 13, fontWeight: '800', color: t.onSurface },

  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: (t.outlineVariant || '#888') + '15' },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  budgetIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  budgetCat: { fontSize: 14, fontWeight: '700', color: t.onSurface, letterSpacing: -0.2 },
  budgetOwner: { fontSize: 11, color: t.onSurfaceVariant, marginTop: 1, fontWeight: '500' },
  budgetRight: { alignItems: 'flex-end', gap: 2 },
  budgetReal: { fontSize: 13, fontWeight: '800', color: t.onSurface },
  budgetEst: { fontSize: 11, color: t.onSurfaceVariant },
  miniProgress: { width: 80, height: 4, borderRadius: 2, backgroundColor: (t.outlineVariant || '#888') + '33', overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  overText: { fontSize: 10, color: '#EF4444', fontWeight: '800', letterSpacing: 0.5 },

  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: t.primary + '10', borderWidth: 1, borderColor: t.primary + '22', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyCardTitle: { fontSize: 16, fontWeight: '800', color: t.onSurface, letterSpacing: -0.3 },
  emptyCardSub: { fontSize: 13, color: t.onSurfaceVariant, fontWeight: '500' },

  fabArea: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { flex: 1, borderRadius: 24, overflow: 'hidden', shadowColor: t.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  actionBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  actionBtnText: { fontSize: 14, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 28, right: 24, zIndex: 100 },
  fabBtn: { borderRadius: 28, overflow: 'hidden', shadowColor: t.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  fabGradient: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
});
