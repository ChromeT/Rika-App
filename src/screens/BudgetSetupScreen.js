import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, FlatList, Modal,
  Alert, ActivityIndicator, Animated, Platform,
  TouchableOpacity as NativeTouchableOpacity,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { formatMoney } from '../utils/formatUtils';
import Text from '../components/ThemeText';

const TYPE_LABEL = { daily: 'Harian', monthly: 'Bulanan', once: 'Sekali' };

export default function BudgetSetupScreen({ navigation, route }) {
  const { theme } = useContext(ThemeContext);
  const { budgets, deleteBudget, calculateMonthlyBudget } = useContext(DataContext);
  const partnerName = route?.params?.partnerName || 'Pasangan';
  const [deletingId, setDeletingId] = useState(null);

  // Custom Modal Deletion State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnim, { toValue: 20, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => navigation.goBack());
  };

  const totalMonthly = calculateMonthlyBudget();

  const confirmDelete = (budget) => {
    setBudgetToDelete(budget);
    setDeleteModalVisible(true);
  };

  const handleActualDelete = async () => {
    if (!budgetToDelete) return;
    setDeletingId(budgetToDelete.id);
    try {
      await deleteBudget(budgetToDelete.id);
      setDeleteModalVisible(false);
      setBudgetToDelete(null);
    } catch (e) {
      console.error('Delete budget error:', e);
      Alert.alert('Gagal', `Gagal menghapus: ${e?.message || 'coba lagi'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const currentMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  const getBudgetMonthly = (b) => {
    if (b.type === 'daily') return Number(b.estimatedAmount) * Number(b.daysPerMonth || currentMonthDays);
    return Number(b.estimatedAmount);
  };

  const handleDelete = (budget) => {
    // setTimeout: agar gesture handler selesai dulu sebelum Alert muncul (fix Android)
    setTimeout(() => {
      Alert.alert(
        'Hapus Budget?',
        `Budget "${budget.category || 'ini'}" akan dihapus permanen.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: async () => {
              setDeletingId(budget.id);
              try {
                await deleteBudget(budget.id);
              } catch (e) {
                console.error('Delete budget error:', e);
                Alert.alert('Gagal', `Gagal menghapus: ${e?.message || 'coba lagi'}`);
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
        { cancelable: true }
      );
    }, 0);
  };

  const s = makeStyles(theme);

  const renderItem = ({ item }) => {
    const monthly = getBudgetMonthly(item);
    const isDeleting = deletingId === item.id;
    return (
      <View style={s.card}>
        <View style={s.cardLeft}>
          <View style={s.iconWrap}>
            <MaterialIcons name={item.icon || 'label'} size={22} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.category}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <View style={s.typeBadge}>
                <Text style={s.typeBadgeText}>{TYPE_LABEL[item.type] || item.type}</Text>
              </View>
              <Text style={s.ownerText}>• {item.owner}</Text>
            </View>
            {item.type === 'daily' && (
              <Text style={s.subText}>Rp {formatMoney(item.estimatedAmount)}/hari × {item.daysPerMonth || currentMonthDays} hr</Text>
            )}
          </View>
        </View>
        <View style={s.cardRight}>
          <Text style={s.monthlyAmt}>Rp {formatMoney(monthly)}</Text>
          <Text style={s.monthlyLabel}>/bulan</Text>
          <View style={s.actionRow}>
            <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('AddEditBudget', { budgetId: item.id, partnerName })}>
              <MaterialIcons name="edit" size={16} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => confirmDelete(item)}
              disabled={isDeleting}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {isDeleting
                ? <ActivityIndicator size="small" color={theme.error || '#EF4444'} />
                : <MaterialIcons name="delete-outline" size={18} color={theme.error || '#EF4444'} />
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={[s.headerBtn, { backgroundColor: theme.surfaceContainerLow || theme.surface }]}>
          <MaterialIcons name="arrow-back-ios-new" size={20} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Atur Budget</Text>
        <TouchableOpacity style={[s.headerBtn, { backgroundColor: theme.primary + '20' }]} onPress={() => navigation.navigate('AddEditBudget', { partnerName })}>
          <MaterialIcons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Total summary */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <LinearGradient colors={[theme.primary, (theme.primaryContainer || theme.primary) + 'CC']} style={s.totalCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View>
            <Text style={s.totalLabel}>Total Estimasi Bulanan</Text>
            <Text style={s.totalAmount}>Rp {formatMoney(totalMonthly)}</Text>
          </View>
          <View style={s.totalBadge}>
            <MaterialIcons name="account-balance-wallet" size={20} color={theme.primary} />
            <Text style={[s.totalBadgeText, { color: theme.primary }]}>{budgets.filter(b => b.isActive).length} aktif</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {budgets.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <MaterialIcons name="playlist-add" size={56} color={theme.primary + '33'} />
          </View>
          <Text style={s.emptyTitle}>Belum ada budget</Text>
          <Text style={s.emptySub}>Yuk tambah budget pertama kalian!</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('AddEditBudget', { partnerName })}>
            <MaterialIcons name="add" size={18} color={theme.onPrimary || '#fff'} />
            <Text style={s.emptyBtnText}>Tambah Budget</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Premium Custom Deletion Modal */}
      {/* Premium Custom Deletion Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <NativeTouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <NativeTouchableOpacity activeOpacity={1} style={{ width: '100%', alignItems: 'center' }}>
            <View style={[s.modalContent, { backgroundColor: theme.surface }]}>
              <View style={s.modalHeader}>
                <View style={[s.modalIcon, { backgroundColor: theme.error + '1A' }]}>
                  <MaterialIcons name="delete-sweep" size={26} color={theme.error || '#EF4444'} />
                </View>
                <Text style={[s.modalTitle, { color: theme.onSurface }]}>Hapus Budget?</Text>
                <Text style={[s.modalSub, { color: theme.onSurfaceVariant }]}>
                  Budget "{budgetToDelete?.category}" akan dihapus secara permanen.
                </Text>
              </View>

              <View style={s.buttonRow}>
                <NativeTouchableOpacity
                  style={[s.cancelBtn, { backgroundColor: theme.surfaceContainerHighest || 'rgba(255,255,255,0.1)' }]}
                  onPress={() => setDeleteModalVisible(false)}
                  disabled={deletingId !== null}
                >
                  <Text style={[s.cancelBtnText, { color: theme.onSurface }]}>Batal</Text>
                </NativeTouchableOpacity>

                <NativeTouchableOpacity
                  style={[s.submitBtn, { backgroundColor: theme.error || '#EF4444' }]}
                  onPress={handleActualDelete}
                  disabled={deletingId !== null}
                >
                  {deletingId !== null ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.submitBtnText}>Hapus</Text>
                  )}
                </NativeTouchableOpacity>
              </View>
            </View>
          </NativeTouchableOpacity>
        </NativeTouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: t.surface, zIndex: 50 },
  headerBtn: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, color: t.onSurface },
  totalCard: { marginHorizontal: 20, marginVertical: 16, borderRadius: 28, padding: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: t.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  totalAmount: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  totalBadge: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalBadgeText: { fontSize: 13, fontWeight: '800' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surfaceContainerLow || t.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: (t.outlineVariant || '#888') + '15', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: t.primary + '15', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: t.onSurface, letterSpacing: -0.3 },
  typeBadge: { backgroundColor: t.primary + '1A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 10, color: t.primary, fontWeight: '700', letterSpacing: 0.5 },
  ownerText: { fontSize: 11, color: t.onSurfaceVariant, fontWeight: '500' },
  subText: { fontSize: 11, color: t.onSurfaceVariant, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  monthlyAmt: { fontSize: 15, fontWeight: '900', color: t.primary, letterSpacing: -0.5 },
  monthlyLabel: { fontSize: 10, color: t.onSurfaceVariant, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  editBtn: { padding: 7, borderRadius: 10, backgroundColor: t.primary + '15' },
  deleteBtn: { padding: 7, borderRadius: 10, backgroundColor: (t.error || '#EF4444') + '15' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: t.primary + '10', borderWidth: 1, borderColor: t.primary + '22', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: t.onSurface, textAlign: 'center', letterSpacing: -0.5 },
  emptySub: { fontSize: 14, color: t.onSurfaceVariant, textAlign: 'center', fontWeight: '500' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8, shadowColor: t.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  emptyBtnText: { fontSize: 15, fontWeight: '800', color: t.onPrimary || '#fff' },

  // Custom Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 340, borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 20 },
  modalHeader: { alignItems: 'center', marginBottom: 16 },
  modalIcon: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  modalSub: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16, paddingHorizontal: 4 },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontWeight: 'bold', fontSize: 15 },
});
