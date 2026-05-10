import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Modal, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';

const TransactionHistoryScreen = () => {
  const { theme } = useContext(ThemeContext);
  const { user, householdUsers, avatar } = useContext(AuthContext);
  const { transactions, accounts, deleteTransaction } = useContext(DataContext);
  const navigation = useNavigation();

  const myName = user?.name || 'Saya';
  const partnerName = householdUsers.find(u => u !== myName) || 'Pasangan';

  const [filterOwner, setFilterOwner] = useState('Semua'); // Semua, Saya, Pasangan
  const [filterType, setFilterType] = useState('Semua');   // Semua, income, expense
  const [search, setSearch] = useState('');

  // UI States
  const [selectedTx, setSelectedTx] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatMoney = (amount) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const ownerMatch =
        filterOwner === 'Semua' ||
        (filterOwner === 'Saya' && tx.owner === myName) ||
        (filterOwner === 'Pasangan' && tx.owner !== myName);
      const typeMatch = filterType === 'Semua' || tx.type === filterType;
      const searchMatch =
        !search ||
        tx.name?.toLowerCase().includes(search.toLowerCase()) ||
        tx.category?.toLowerCase().includes(search.toLowerCase());
      return ownerMatch && typeMatch && searchMatch;
    });
  }, [transactions, filterOwner, filterType, search, myName]);

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(tx => {
      const d = new Date(tx.date);
      const dateKey = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }) : 'Tanggal Tidak Valid';
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(tx);
    });
    return Object.entries(map);
  }, [filtered]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.myContrib || 0) + (t.partnerContrib || 0), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.myContrib || 0) + (t.partnerContrib || 0), 0);

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrapper}>
            {avatar?.startsWith('file://') || avatar?.startsWith('data:image') ? (
              <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <MaterialIcons name={avatar || 'person'} size={22} color={theme.primary} />
            )}
          </View>
          <Text style={styles.headerTitle}>Riwayat</Text>
        </View>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <MaterialIcons name="arrow-downward" size={14} color={theme.primary} />
          <Text style={styles.summaryLabel}>Pemasukan</Text>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>Rp {formatMoney(totalIncome)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <MaterialIcons name="arrow-upward" size={14} color={theme.error} />
          <Text style={styles.summaryLabel}>Pengeluaran</Text>
          <Text style={[styles.summaryValue, { color: theme.error }]}>Rp {formatMoney(totalExpense)}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <MaterialIcons name="search" size={18} color={theme.onSurfaceVariant} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari transaksi..."
          placeholderTextColor={theme.onSurfaceVariant + '99'}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {['Semua', 'Saya', 'Pasangan'].map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, filterOwner === opt && styles.chipActive]}
            onPress={() => setFilterOwner(opt)}
          >
            <Text style={[styles.chipText, filterOwner === opt && styles.chipTextActive]}>
              {opt === 'Saya' ? myName : opt === 'Pasangan' ? partnerName : opt}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.chipDivider} />
        {[{ key: 'Semua', icon: 'swap-vert', label: 'Semua' }, { key: 'income', icon: 'arrow-downward', label: 'Masuk' }, { key: 'expense', icon: 'arrow-upward', label: 'Keluar' }].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, filterType === opt.key && styles.chipActive]}
            onPress={() => setFilterType(opt.key)}
          >
            <MaterialIcons name={opt.icon} size={12} color={filterType === opt.key ? theme.onPrimary : theme.onSurfaceVariant} style={{ marginRight: 3 }} />
            <Text style={[styles.chipText, filterType === opt.key && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={48} color={theme.onSurfaceVariant + '55'} />
            <Text style={styles.emptyText}>Belum ada transaksi</Text>
            <Text style={styles.emptySubText}>Gunakan tombol + untuk mulai mencatat</Text>
          </View>
        ) : grouped.map(([date, txs]) => (
          <View key={date}>
            {/* Date header */}
            <View style={styles.dateHeader}>
              <Text style={styles.dateText}>{date}</Text>
              <View style={styles.dateLine} />
            </View>

            {txs.map(tx => {
              const totalAmt = (tx.myContrib || 0) + (tx.partnerContrib || 0);
              const isOwner = tx.owner === myName;
              return (
                <TouchableOpacity 
                  key={tx.id} 
                  activeOpacity={0.7}
                  onPress={() => {
                    if (isOwner && !loading) {
                      setSelectedTx(tx);
                      setActionModalVisible(true);
                    }
                  }}
                  disabled={loading}
                  style={[styles.txCard, { opacity: loading ? 0.6 : 1 }]}
                >
                  <View style={[styles.txIconBg, { backgroundColor: tx.type === 'income' ? theme.primary + '1A' : tx.type === 'transfer' ? '#6366F1' + '1A' : theme.error + '1A' }]}>
                    <MaterialIcons
                      name={tx.icon || (tx.type === 'income' ? 'payments' : tx.type === 'transfer' ? 'swap-horiz' : 'shopping-bag')}
                      size={22}
                      color={tx.type === 'income' ? theme.primary : tx.type === 'transfer' ? '#6366F1' : theme.error}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName} numberOfLines={1}>{tx.name}</Text>
                    <View style={styles.txMeta}>
                      <View style={styles.txCatBadge}>
                        <Text style={styles.txCatText}>{tx.category}</Text>
                      </View>
                      <View style={styles.txWallet}>
                        <MaterialIcons name="account-balance-wallet" size={10} color={theme.onSurfaceVariant} />
                        <Text style={styles.txWalletName}>
                          {(() => {
                            const accId = tx.type === 'transfer' ? tx.fromAccountId : tx.accountId;
                            const acc = (accounts || []).find(a => a.id === accId);
                            return acc ? acc.name : 'Tunai';
                          })()}
                        </Text>
                      </View>
                      <Text style={styles.txOwner}>{tx.owner}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.type === 'income' ? theme.primary : tx.type === 'transfer' ? '#6366F1' : theme.error }]}>
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '⇅' : '-'}Rp {formatMoney(totalAmt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Modal */}
      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionModalVisible(false)}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '33' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 4 }}>Kelola Transaksi</Text>
              <Text style={{ fontSize: 13, color: theme.onSurfaceVariant }}>{selectedTx?.name} - Rp {formatMoney((selectedTx?.myContrib || 0) + (selectedTx?.partnerContrib || 0))}</Text>
            </View>
            <View style={{ padding: 8 }}>
              <TouchableOpacity 
                onPress={() => {
                  setActionModalVisible(false);
                  if (selectedTx.type === 'transfer') {
                    navigation.navigate('Transfer', { editingTransaction: selectedTx });
                  } else {
                    navigation.navigate('Transaksi', { editingTransaction: selectedTx });
                  }
                }} 
                style={styles.modalActionItem}
              >
                <View style={[styles.modalActionIcon, { backgroundColor: theme.primary + '1A' }]}>
                  <MaterialIcons name="edit" size={20} color={theme.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface }}>Edit Transaksi</Text>
                  <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Ubah nominal, kategori, atau dompet</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => {
                  setActionModalVisible(false);
                  setTimeout(() => setConfirmVisible(true), 300);
                }} 
                style={styles.modalActionItem}
              >
                <View style={[styles.modalActionIcon, { backgroundColor: theme.error + '1A' }]}>
                  <MaterialIcons name="delete" size={20} color={theme.error} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.error }}>Hapus Transaksi</Text>
                  <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Saldo dompet akan dikembalikan</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 24 }]}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 12, textAlign: 'center' }}>Hapus Transaksi?</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>
              Yakin ingin menghapus transaksi ini? Saldo dompet Anda akan disesuaikan secara otomatis.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: theme.surfaceContainerHighest, padding: 16, borderRadius: 16, alignItems: 'center' }} 
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: theme.error, padding: 16, borderRadius: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }} 
                onPress={async () => {
                  setLoading(true);
                  try {
                    await deleteTransaction(selectedTx.id);
                    setConfirmVisible(false);
                  } catch (e) {
                    // Alert.alert('Error', 'Gagal menghapus');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Hapus</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16, backgroundColor: t.surface,
    borderBottomWidth: 0, elevation: 0, shadowOpacity: 0,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoText: { fontSize: 22, fontWeight: '900', color: t.primary, letterSpacing: -1, marginRight: 4 },
  avatarWrapper: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
    backgroundColor: t.surfaceContainer, borderWidth: 1, borderColor: t.outlineVariant + '33',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: t.primary, letterSpacing: -0.5 },

  summaryRow: {
    flexDirection: 'row', backgroundColor: t.surfaceContainerLow,
    marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: t.outlineVariant + '1A',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: 11, color: t.onSurfaceVariant, fontWeight: '600' },
  summaryValue: { fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  summaryDivider: { width: 1, backgroundColor: t.outlineVariant + '33' },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.surfaceContainerLow, borderRadius: 16,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: t.outlineVariant + '1A',
  },
  searchInput: { flex: 1, fontSize: 14, color: t.onSurface },

  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: t.surfaceContainerLow, borderWidth: 1, borderColor: t.outlineVariant + '1A',
  },
  chipActive: { backgroundColor: t.primary, borderColor: t.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: t.onSurfaceVariant },
  chipTextActive: { color: t.onPrimary },
  chipDivider: { width: 1, height: 24, backgroundColor: t.outlineVariant + '55' },

  list: { paddingHorizontal: 16 },

  dateHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 10 },
  dateText: { fontSize: 11, fontWeight: '800', color: t.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 },
  dateLine: { flex: 1, height: 1, backgroundColor: t.outlineVariant + '33' },

  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.surfaceContainerLow, borderRadius: 20,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: t.outlineVariant + '0D',
  },
  txIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: 'bold', color: t.onSurface, marginBottom: 4 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txCatBadge: { backgroundColor: t.secondaryContainer, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  txCatText: { fontSize: 10, color: t.onSecondaryContainer, fontWeight: '700' },
  txOwner: { fontSize: 10, color: t.onSurfaceVariant },
  txWallet: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.surfaceContainerHigh, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  txWalletName: { fontSize: 10, color: t.onSurfaceVariant, fontWeight: 'bold' },
  jointBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: t.primary + '1A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  jointText: { fontSize: 9, color: t.primary, fontWeight: '700' },
  txAmount: { fontSize: 13, fontWeight: '900', letterSpacing: -0.3, flexShrink: 0 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: t.onSurfaceVariant },
  emptySubText: { fontSize: 12, color: t.onSurfaceVariant + '99' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: t.surface, borderRadius: 32, padding: 24, width: '100%' },
  modalActionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  modalActionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});

export default TransactionHistoryScreen;
