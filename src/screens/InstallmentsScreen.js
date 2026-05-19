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
import dayjs from 'dayjs';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { formatMoney } from '../utils/formatUtils';
import Text from '../components/ThemeText';

export default function InstallmentsScreen({ navigation, route }) {
  const { theme } = useContext(ThemeContext);
  const { allInstallments, deleteInstallment, deleteBill, getTotalInstallmentsThisMonth } = useContext(DataContext);
  const partnerName = route?.params?.partnerName || 'Pasangan';
  const [deletingId, setDeletingId] = useState(null);

  // Custom Modal Deletion State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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

  const today = dayjs().date();
  const totalThisMonth = getTotalInstallmentsThisMonth();

  const getDaysUntilDue = (dueDate) => {
    const due = Number(dueDate);
    return due >= today ? due - today : (dayjs().daysInMonth() - today) + due;
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  const handleActualDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      if (itemToDelete._isBill) {
        await deleteBill(itemToDelete.id);
      } else {
        await deleteInstallment(itemToDelete.id);
      }
      setDeleteModalVisible(false);
      setItemToDelete(null);
    } catch (e) {
      console.error('Delete installment/bill error:', e);
      Alert.alert('Gagal', `Gagal menghapus: ${e?.message || 'coba lagi'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const s = makeStyles(theme);
  const activeInstallments = allInstallments.filter(i => i.isActive && i.remainingMonths > 0);

  const renderItem = ({ item, index }) => {
    const progress = item.totalMonths > 0 ? (item.totalMonths - item.remainingMonths) / item.totalMonths : 0;
    const daysUntil = getDaysUntilDue(item.dueDate);
    const isUrgent = daysUntil <= 7;
    const isDeleting = deletingId === item.id;
    const remainingAmount = item.remainingMonths * item.monthlyAmount;

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={s.card}>
          {/* Top */}
          <View style={s.cardTop}>
            <View style={[s.iconWrap, isUrgent && { backgroundColor: '#FEE2E220' }]}>
              <MaterialIcons name={item.icon || 'credit-card'} size={22} color={isUrgent ? '#EF4444' : theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.cardTitle}>{item.name}</Text>
              <Text style={s.ownerText}>{item.owner}</Text>
            </View>
            <View style={s.cardRight}>
              <Text style={s.monthlyAmt}>Rp {formatMoney(item.monthlyAmount)}</Text>
              <Text style={s.monthlyLabel}>/bulan</Text>
            </View>
          </View>

          {/* Progress */}
          <View style={s.progressContainer}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, {
                width: item._billType === 'recurring' ? '100%' : `${Math.min(progress * 100, 100)}%`,
                backgroundColor: item._billType === 'recurring' ? theme.primary + '66' : theme.primary,
              }]} />
            </View>
            <Text style={s.progressText}>
              {item._billType === 'recurring' ? 'Berulang'
                : item._billType === 'once' ? 'Sekali'
                : `${item.totalMonths - item.remainingMonths}/${item.totalMonths} bln`}
            </Text>
          </View>

          {/* Footer */}
          <View style={s.cardFooter}>
            <View>
              <View style={[s.dueBadge, isUrgent && { backgroundColor: '#FEE2E2' }]}>
                <MaterialIcons name="event" size={12} color={isUrgent ? '#EF4444' : theme.onSurfaceVariant} />
                <Text style={[s.dueText, isUrgent && { color: '#EF4444', fontWeight: '800' }]}>
                  {isUrgent
                    ? daysUntil === 0 ? 'Jatuh tempo HARI INI!' : `${daysUntil} hari lagi!`
                    : `Tgl ${item.dueDate} tiap bulan`}
                </Text>
              </View>
              <Text style={s.remainText}>
                {item._billType === 'recurring' ? 'Tagihan berulang bulanan'
                  : item._billType === 'once' ? 'Bayar sekali'
                  : `Sisa ${item.remainingMonths} bln • Rp ${formatMoney(remainingAmount)}`}
              </Text>
            </View>
            <View style={s.actionRow}>
              <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('AddEditInstallment', { installmentId: item.id, partnerName })}>
                <MaterialIcons name="edit" size={16} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)} disabled={isDeleting}>
                {isDeleting
                  ? <ActivityIndicator size="small" color={theme.error || '#EF4444'} />
                  : <MaterialIcons name="delete-outline" size={16} color={theme.error || '#EF4444'} />
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={[s.headerBtn, { backgroundColor: theme.surfaceContainerLow || theme.surface }]}>
          <MaterialIcons name="arrow-back-ios-new" size={20} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Daftar Cicilan</Text>
        <TouchableOpacity style={[s.headerBtn, { backgroundColor: theme.primary + '20' }]} onPress={() => navigation.navigate('AddEditInstallment', { partnerName })}>
          <MaterialIcons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Total */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <LinearGradient colors={[theme.primary, (theme.primaryContainer || theme.primary) + 'CC']} style={s.totalCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View>
            <Text style={s.totalLabel}>Total Cicilan Bulan Ini</Text>
            <Text style={s.totalAmount}>Rp {formatMoney(totalThisMonth)}</Text>
          </View>
          <View style={s.totalBadge}>
            <MaterialIcons name="credit-card" size={20} color={theme.primary} />
            <Text style={[s.totalBadgeText, { color: theme.primary }]}>{activeInstallments.length} aktif</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {activeInstallments.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <MaterialIcons name="check-circle" size={56} color={theme.primary + '33'} />
          </View>
          <Text style={s.emptyTitle}>Bebas cicilan!</Text>
          <Text style={s.emptySub}>Atau tambah cicilan yang sedang berjalan.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('AddEditInstallment', { partnerName })}>
            <MaterialIcons name="add" size={18} color={theme.onPrimary || '#fff'} />
            <Text style={s.emptyBtnText}>Tambah Cicilan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeInstallments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

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
                <Text style={[s.modalTitle, { color: theme.onSurface }]}>Hapus Cicilan?</Text>
                <Text style={[s.modalSub, { color: theme.onSurfaceVariant }]}>
                  Cicilan "{itemToDelete?.name}" akan dihapus secara permanen.
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
  card: { backgroundColor: t.surfaceContainerLow || t.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: (t.outlineVariant || '#888') + '15', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: t.primary + '15', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: t.onSurface, letterSpacing: -0.3 },
  ownerText: { fontSize: 11, color: t.onSurfaceVariant, marginTop: 2, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end' },
  monthlyAmt: { fontSize: 15, fontWeight: '900', color: t.primary, letterSpacing: -0.5 },
  monthlyLabel: { fontSize: 10, color: t.onSurfaceVariant, fontWeight: '600' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: (t.outlineVariant || '#888') + '33', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 10, color: t.onSurfaceVariant, fontWeight: '700', minWidth: 56, textAlign: 'right' },
  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.surfaceContainerLowest || t.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  dueText: { fontSize: 11, color: t.onSurfaceVariant, fontWeight: '600' },
  remainText: { fontSize: 11, color: t.onSurfaceVariant, marginTop: 4, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 6 },
  editBtn: { padding: 8, borderRadius: 12, backgroundColor: t.primary + '15' },
  deleteBtn: { padding: 8, borderRadius: 12, backgroundColor: (t.error || '#EF4444') + '15' },
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
