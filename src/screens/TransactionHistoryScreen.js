import React, { useState, useMemo, useContext, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform, Modal, TextInput, Alert, ActivityIndicator, Dimensions } from 'react-native';
import Text from '../components/ThemeText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { formatMoney } from '../utils/formatUtils';
import { exportToPDF, exportToXLS } from '../utils/exportUtils';

// --- [SUB-KOMPONEN: Header] ---
const HistoryHeader = ({ theme, avatar, navigation, fadeAnim, slideAnim }) => (
  <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <View style={styles.headerLeft}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back-ios-new" size={24} color={theme.onSurface} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.onSurface }]}>Riwayat</Text>
    </View>
    <TouchableOpacity onPress={() => navigation.navigate('Couple')} style={styles.avatarWrapper}>
       <MaterialIcons name="account-circle" size={32} color={theme.onSurfaceVariant} />
    </TouchableOpacity>
  </Animated.View>
);

// --- [SUB-KOMPONEN: Summary Cards] ---
const SummaryCards = ({ theme, totalIncome, totalExpense, formatMoney, fadeAnim, slideAnim }) => (
  <Animated.View style={[styles.summaryGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
       <Text style={styles.summaryLabel}>Pemasukan</Text>
       <Text style={styles.summaryValue}>+Rp {formatMoney(totalIncome)}</Text>
    </View>
    <View style={[styles.summaryCard, { backgroundColor: theme.error }]}>
       <Text style={styles.summaryLabel}>Pengeluaran</Text>
       <Text style={styles.summaryValue}>-Rp {formatMoney(totalExpense)}</Text>
    </View>
  </Animated.View>
);

// --- [SUB-KOMPONEN: Filters] ---
const FilterSection = ({ theme, search, setSearch, setDateModalVisible, filterMonth, filterYear, filterOwner, setFilterOwner, filterType, setFilterType, myName, partnerName, fadeAnim, slideAnim }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.searchBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant + '15' }]}>
        <MaterialIcons name="search" size={20} color={theme.onSurfaceVariant} />
        <TextInput 
          placeholder="Cari transaksi..." 
          style={[styles.searchInput, { color: theme.onSurface }]} 
          placeholderTextColor={theme.onSurfaceVariant + '88'}
          value={search}
          onChangeText={setSearch}
        />
        {search !== '' && <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={20} color={theme.onSurfaceVariant} /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => setDateModalVisible(true)} style={[styles.pill, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.primary, marginRight: 10, flexDirection: 'row', gap: 6 }]}>
           <MaterialIcons name="calendar-today" size={16} color={theme.primary} />
           <Text style={[styles.pillText, { color: theme.onSurface }]}>{months[filterMonth]} {filterYear}</Text>
        </TouchableOpacity>
        
        {['Semua', 'Saya', 'Pasangan'].map(opt => (
          <TouchableOpacity key={opt} onPress={() => setFilterOwner(opt)} style={[styles.pill, { marginRight: 10, backgroundColor: filterOwner === opt ? theme.primary : theme.surfaceContainerLow, borderColor: filterOwner === opt ? theme.primary : theme.outlineVariant + '22' }]}>
            <Text style={[styles.pillText, { color: filterOwner === opt ? theme.onPrimary : theme.onSurfaceVariant }]}>{opt}</Text>
          </TouchableOpacity>
        ))}

        {['Semua', 'income', 'expense', 'transfer'].map(opt => (
          <TouchableOpacity key={opt} onPress={() => setFilterType(opt)} style={[styles.pill, { marginRight: 10, backgroundColor: filterType === opt ? theme.primary : theme.surfaceContainerLow, borderColor: filterType === opt ? theme.primary : theme.outlineVariant + '22' }]}>
            <Text style={[styles.pillText, { color: filterType === opt ? theme.onPrimary : theme.onSurfaceVariant }]}>
              {opt === 'income' ? 'Pemasukan' : opt === 'expense' ? 'Pengeluaran' : opt === 'transfer' ? 'Transfer' : 'Semua Tipe'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

// --- [SUB-KOMPONEN: Export] ---
const ExportTools = ({ theme, handleExportPDF, handleExportExcel, loading }) => (
  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 20 }}>
    <TouchableOpacity onPress={handleExportPDF} disabled={loading} style={{ flex: 1, height: 48, borderRadius: 16, backgroundColor: theme.surfaceContainerLow, borderDash: [2, 2], borderWidth: 1, borderColor: theme.outlineVariant + '33', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <MaterialIcons name="picture-as-pdf" size={18} color={theme.onSurfaceVariant} />
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurfaceVariant }}>Export PDF</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={handleExportExcel} disabled={loading} style={{ flex: 1, height: 48, borderRadius: 16, backgroundColor: theme.surfaceContainerLow, borderDash: [2, 2], borderWidth: 1, borderColor: theme.outlineVariant + '33', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <MaterialIcons name="table-view" size={18} color={theme.onSurfaceVariant} />
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurfaceVariant }}>Export Excel</Text>
    </TouchableOpacity>
  </View>
);

const TransactionHistoryScreen = ({ navigation, route }) => {
  const { highlightId, highlightName } = route.params || {};
  const { theme } = useContext(ThemeContext);
  const { transactions, accounts, deleteTransaction, updateTransaction } = useContext(DataContext);
  const { user, householdUsers, avatar } = useContext(AuthContext);

  const scrollRef = useRef(null);
  const itemLayouts = useRef({});
  const dateLayouts = useRef({});
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    if (highlightId || highlightName) {
      let attempts = 0;
      const findAndScroll = setInterval(() => {
        let targetLayout = itemLayouts.current[String(highlightId)];
        if (!targetLayout) {
          const matchingTx = transactions.find(t => 
            (highlightId && (String(t.id) === String(highlightId) || String(t.billId) === String(highlightId) || String(t.goalId) === String(highlightId))) ||
            (highlightName && t.name && (String(t.name).toLowerCase() === String(highlightName).toLowerCase() || String(t.name).toLowerCase() === `bayar tagihan: ${highlightName}`.toLowerCase()))
          );
          if (matchingTx) {
            targetLayout = itemLayouts.current[String(matchingTx.id)];
            if (targetLayout) setHighlightedId(matchingTx.id);
          }
        }
        if (targetLayout && scrollRef.current) {
          const sectionY = dateLayouts.current[targetLayout.date] || 0;
          const absoluteY = targetLayout.localY + sectionY;
          // Offset set to -100 to place the item at the top for maximum readability.
          // Large paddingBottom ensures items at the end can reach this position.
          scrollRef.current.scrollTo({ y: Math.max(0, absoluteY - 100), animated: true });
          clearInterval(findAndScroll);
          setTimeout(() => { setHighlightedId(null); }, 5000);
        }
        attempts++;
        if (attempts > 30) clearInterval(findAndScroll); 
      }, 150);
      return () => clearInterval(findAndScroll);
    }
  }, [highlightId, highlightName, transactions]);

  const myName = user?.name || 'Saya';
  const partnerName = householdUsers?.find(u => u !== myName) || 'Pasangan';

  const [filterOwner, setFilterOwner] = useState('Semua'); 
  const [filterType, setFilterType] = useState('Semua');   
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [dateModalVisible, setDateModalVisible] = useState(false);

  const [selectedTx, setSelectedTx] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [aestheticAlertVisible, setAestheticAlertVisible] = useState(false);
  const [aestheticAlertConfig, setAestheticAlertConfig] = useState({ title: '', message: '', icon: 'info', color: '#6366F1' });

  const showAestheticAlert = (title, message, icon = 'info', color = '#6366F1') => {
    setAestheticAlertConfig({ title, message, icon, color });
    setAestheticAlertVisible(true);
  };

  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnims[0], { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(slideAnims[0], { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[1], { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(slideAnims[1], { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[2], { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(slideAnims[2], { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[3], { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(slideAnims[3], { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' })
      ])
    ]).start();
  }, []);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Beranda');
    }
  };

  const filtered = useMemo(() => {
    return (transactions || []).filter(tx => {
      const txDate = new Date(tx.date);
      const monthMatch = txDate.getMonth() === filterMonth;
      const yearMatch = txDate.getFullYear() === filterYear;
      const isShared = tx.isPatungan || tx.isJoint;
      const ownerMatch = filterOwner === 'Semua' || 
                         (filterOwner === 'Saya' && (tx.owner === myName || (isShared && (tx.myContrib || 0) > 0))) || 
                         (filterOwner === 'Pasangan' && (tx.owner === partnerName || (isShared && (tx.partnerContrib || 0) > 0)));
      const typeMatch = filterType === 'Semua' || tx.type === filterType;
      const searchMatch = !search || tx.name?.toLowerCase().includes(search.toLowerCase()) || tx.category?.toLowerCase().includes(search.toLowerCase());
      return monthMatch && yearMatch && ownerMatch && typeMatch && searchMatch;
    });
  }, [transactions, filterOwner, filterType, search, myName, filterMonth, filterYear]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(tx => {
      const d = new Date(tx.date);
      const dateKey = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Tanggal Tidak Valid';
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(tx);
    });
    return Object.entries(map).sort((a, b) => new Date(b[1][0].date) - new Date(a[1][0].date));
  }, [filtered]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.myContrib || 0) + (t.partnerContrib || 0), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.myContrib || 0) + (t.partnerContrib || 0), 0);

  const handleExportPDF = async () => {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const period = `${monthNames[filterMonth]} ${filterYear}`;
    setLoading(true);
    try {
      await exportToPDF(filtered, period, myName, { user: filterOwner, type: filterType === 'income' ? 'Pemasukan' : filterType === 'expense' ? 'Pengeluaran' : 'Semua' }, accounts, householdUsers);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleExportExcel = async () => {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const period = `${monthNames[filterMonth]} ${filterYear}`;
    setLoading(true);
    try {
      await exportToXLS(filtered, period, myName, { user: filterOwner, type: filterType === 'income' ? 'Pemasukan' : filterType === 'expense' ? 'Pengeluaran' : 'Semua' }, accounts);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <HistoryHeader theme={theme} avatar={avatar} navigation={navigation} fadeAnim={fadeAnims[0]} slideAnim={slideAnims[0]} />
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.main, { paddingBottom: Dimensions.get('window').height }]} showsVerticalScrollIndicator={false}>
        <SummaryCards theme={theme} totalIncome={totalIncome} totalExpense={totalExpense} formatMoney={formatMoney} fadeAnim={fadeAnims[1]} slideAnim={slideAnims[1]} />
        <FilterSection 
          theme={theme} search={search} setSearch={setSearch} setDateModalVisible={setDateModalVisible} 
          filterMonth={filterMonth} filterYear={filterYear} filterOwner={filterOwner} setFilterOwner={setFilterOwner} 
          filterType={filterType} setFilterType={setFilterType} myName={myName} partnerName={partnerName} 
          fadeAnim={fadeAnims[2]} slideAnim={slideAnims[2]} 
        />
        <ExportTools theme={theme} handleExportPDF={handleExportPDF} handleExportExcel={handleExportExcel} loading={loading} />
        {grouped.map(([date, txs]) => (
          <View key={date} onLayout={(e) => { dateLayouts.current[date] = e.nativeEvent.layout.y; }}>
            <View style={styles.dateHeader}>
               <Text style={[styles.dateText, { color: theme.onSurfaceVariant }]}>{date}</Text>
               <View style={[styles.dateLine, { backgroundColor: theme.outlineVariant + '33' }]} />
            </View>
            {txs.map((item, index) => (
              <TransactionCard 
                key={item.id} tx={item} index={index} theme={theme} myName={myName} partnerName={partnerName} accounts={accounts} formatMoney={formatMoney} filterOwner={filterOwner}
                onEdit={() => { 
                  if (item.owner !== myName && item.owner !== 'Bersama') {
                    showAestheticAlert('Akses Terbatas', `Transaksi ini dicatat oleh ${item.owner}. Kamu hanya bisa mengedit transaksi milikmu sendiri untuk menjaga integritas data pribadi pasangan.`, 'lock', theme.primary);
                    return;
                  }
                  setSelectedTx(item); 
                  setActionModalVisible(true); 
                }}
                isHighlighted={highlightedId === item.id}
                onLayout={(e) => { itemLayouts.current[String(item.id)] = { localY: e.nativeEvent.layout.y, date }; }}
              />
            ))}
          </View>
        ))}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={80} color={theme.outlineVariant + '44'} />
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>Belum ada riwayat.</Text>
            <Text style={[styles.emptySubText, { color: theme.onSurfaceVariant + '88' }]}>Transaksi yang kamu catat akan muncul di sini.</Text>
          </View>
        )}
      </ScrollView>

      {loading && <LoadingOverlay theme={theme} />}

      {/* Aesthetic Alert Modal */}
      <Modal visible={aestheticAlertVisible} transparent animationType="fade" onRequestClose={() => setAestheticAlertVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAestheticAlertVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, padding: 32, alignItems: 'center', borderRadius: 32 }]}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: aestheticAlertConfig.color + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
               <MaterialIcons name={aestheticAlertConfig.icon} size={40} color={aestheticAlertConfig.color} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.onSurface, marginBottom: 12, textAlign: 'center' }}>{aestheticAlertConfig.title}</Text>
            <Text style={{ fontSize: 15, color: theme.onSurfaceVariant, marginBottom: 32, textAlign: 'center', lineHeight: 22 }}>{aestheticAlertConfig.message}</Text>
            <TouchableOpacity 
              style={{ backgroundColor: aestheticAlertConfig.color, paddingVertical: 18, paddingHorizontal: 48, borderRadius: 20, width: '100%', alignItems: 'center', elevation: 4, shadowColor: aestheticAlertConfig.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }} 
              onPress={() => setAestheticAlertVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Action Modal */}
      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
        <View style={styles.modalOverlay}>
           <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setActionModalVisible(false)} />
           <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHandle} />
              <View style={{ padding: 24 }}>
                 <Text style={[styles.modalTitle, { color: theme.onSurface, marginBottom: 8 }]}>Opsi Transaksi</Text>
                 <Text style={{ fontSize: 13, color: theme.onSurfaceVariant, marginBottom: 24 }}>{selectedTx?.name} - Rp {formatMoney((selectedTx?.myContrib || 0) + (selectedTx?.partnerContrib || 0))}</Text>
                 
                 <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, marginBottom: 12 }}>UBAH SUMBER DANA</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                    {accounts.filter(acc => acc.owner === myName || acc.owner === 'Bersama').map(acc => {
                      const isActive = selectedTx?.accountId === acc.id || selectedTx?.fromAccountId === acc.id;
                      return (
                        <TouchableOpacity 
                          key={acc.id} 
                          onPress={async () => {
                            try {
                              setLoading(true);
                              await updateTransaction(selectedTx.id, { accountId: acc.id });
                              setSelectedTx({ ...selectedTx, accountId: acc.id });
                              setLoading(false);
                            } catch (e) {
                              setLoading(false);
                              Alert.alert('Gagal', 'Gagal mengubah sumber dana.');
                            }
                          }}
                          style={{ 
                            padding: 12, borderRadius: 16, backgroundColor: isActive ? theme.primary + '15' : theme.surfaceContainerLow, 
                            borderWidth: 1.5, borderColor: isActive ? theme.primary : 'transparent', marginRight: 10,
                            flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 120
                          }}
                        >
                          <MaterialIcons name={acc.icon || 'payments'} size={18} color={isActive ? theme.primary : theme.onSurfaceVariant} />
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurface }}>{acc.name}</Text>
                            <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>Rp {formatMoney(acc.balance)}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                 </ScrollView>

                 <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, marginBottom: 8 }}>TINDAKAN</Text>
                 <TouchableOpacity 
                   style={styles.modalAction} 
                   onPress={() => {
                     setActionModalVisible(false);
                     navigation.navigate('Transaksi', { editingTransaction: selectedTx });
                   }}
                 >
                    <View style={[styles.modalActionIcon, { backgroundColor: theme.primary + '15' }]}>
                       <MaterialIcons name="edit" size={24} color={theme.primary} />
                    </View>
                    <Text style={[styles.modalActionText, { color: theme.onSurface }]}>Edit Transaksi</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={styles.modalAction} 
                   onPress={() => {
                     setActionModalVisible(false);
                     Alert.alert('Hapus Transaksi', 'Yakin ingin menghapus transaksi ini?', [
                       { text: 'Batal', style: 'cancel' },
                       { text: 'Hapus', style: 'destructive', onPress: () => deleteTransaction(selectedTx.id) }
                     ]);
                   }}
                 >
                    <View style={[styles.modalActionIcon, { backgroundColor: theme.error + '15' }]}>
                       <MaterialIcons name="delete-outline" size={24} color={theme.error} />
                    </View>
                    <Text style={[styles.modalActionText, { color: theme.error }]}>Hapus Transaksi</Text>
                 </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setActionModalVisible(false)} style={styles.modalClose}>
                 <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Tutup</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

      {/* Month Year Picker Modal */}
      <Modal visible={dateModalVisible} transparent animationType="fade" onRequestClose={() => setDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
           <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDateModalVisible(false)} />
           <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
              <View style={{ padding: 24 }}>
                <Text style={[styles.modalTitle, { color: theme.onSurface, marginBottom: 20 }]}>Pilih Periode</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12 }}>TAHUN</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                   {[2024, 2025, 2026].map(y => (
                     <TouchableOpacity key={y} onPress={() => setFilterYear(y)} style={[styles.pill, { marginRight: 8, backgroundColor: filterYear === y ? theme.primary : theme.surfaceContainerLow, borderColor: filterYear === y ? theme.primary : theme.outlineVariant + '22' }]}>
                       <Text style={[styles.pillText, { color: filterYear === y ? theme.onPrimary : theme.onSurfaceVariant }]}>{y}</Text>
                     </TouchableOpacity>
                   ))}
                </ScrollView>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12 }}>BULAN</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                   {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => (
                     <TouchableOpacity key={m} onPress={() => { setFilterMonth(i); setDateModalVisible(false); }} style={[styles.pill, { width: '23%', backgroundColor: filterMonth === i ? theme.primary : theme.surfaceContainerLow, borderColor: filterMonth === i ? theme.primary : theme.outlineVariant + '22' }]}>
                        <Text style={[styles.pillText, { color: filterMonth === i ? theme.onPrimary : theme.onSurfaceVariant }]}>{m}</Text>
                     </TouchableOpacity>
                   ))}
                </View>
              </View>
              <TouchableOpacity onPress={() => setDateModalVisible(false)} style={styles.modalClose}>
                 <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// --- [SUB-KOMPONEN: Transaction Card] ---
const TransactionCard = ({ tx, index, theme, myName, partnerName, accounts, formatMoney, filterOwner, onEdit, isHighlighted, onLayout }) => {
  const typeColor = tx.type === 'income' ? theme.primary : tx.type === 'transfer' ? theme.onSurface : theme.error;
  const totalAmt = (tx.myContrib || 0) + (tx.partnerContrib || 0);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: Platform.OS !== 'web' }).start();
  }, []);

  return (
    <Animated.View 
      onLayout={onLayout}
      style={{ opacity }}
    >
      <Animated.View style={[
        styles.txCard, 
        { 
          backgroundColor: isHighlighted ? theme.primary + '22' : theme.surfaceContainerLow,
          borderWidth: 1,
          borderColor: isHighlighted ? theme.primary : theme.outlineVariant + '15'
        }
      ]}>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={onEdit}>
          <View style={[styles.txIconBg, { backgroundColor: typeColor + '15' }]}>
            <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'add' : tx.type === 'transfer' ? 'swap-horiz' : 'remove')} size={24} color={typeColor} />
          </View>
          <View style={styles.txInfo}>
            <Text style={[styles.txName, { color: theme.onSurface }]} numberOfLines={1}>{tx.name}</Text>
            <View style={styles.txMeta}>
              <Text style={[styles.txWalletName, { color: theme.onSurfaceVariant }]}>
                {(() => {
                  const accId = tx.accountId || tx.fromAccountId;
                  const acc = (accounts || []).find(a => a.id === accId);
                  return acc ? acc.name : 'Tunai';
                })()}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
             <Text style={[styles.txAmount, { color: typeColor }]}>
               {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}Rp {formatMoney(
                 filterOwner === 'Semua' 
                 ? totalAmt 
                 : (filterOwner === 'Saya' ? (tx.myContrib || 0) : (tx.partnerContrib || 0))
               )}
             </Text>
             <Text style={{ fontSize: 9, fontWeight: 'bold', color: theme.onSurfaceVariant, marginTop: 4 }}>
                {tx.isJoint ? 'UANG BERSAMA' : (tx.isPatungan ? 'PATUNGAN' : (tx.owner === myName ? 'PRIBADI SAYA' : `PRIBADI ${tx.owner?.toUpperCase()}`))}
             </Text>
             {(tx.isJoint || tx.isPatungan) && (
               <Text style={{ fontSize: 8, color: theme.onSurfaceVariant, marginTop: 2, textAlign: 'right' }}>
                 {myName}: {formatMoney(tx.myContrib || 0)} • {partnerName}: {formatMoney(tx.partnerContrib || 0)}
               </Text>
             )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const LoadingOverlay = ({ theme }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }]}>
    <ActivityIndicator size="large" color={theme.primary} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  avatarWrapper: { width: 36, height: 36, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  main: { paddingHorizontal: 20 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  summaryCard: { flex: 1, padding: 20, borderRadius: 24, elevation: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderRadius: 20, borderWidth: 1 },
  searchInput: { flex: 1, marginHorizontal: 12, fontSize: 15 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  pillText: { fontSize: 12, fontWeight: 'bold' },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 },
  dateText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateLine: { flex: 1, height: 1 },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 10 },
  txIconBg: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, marginLeft: 16 },
  txName: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  txMeta: { flexDirection: 'row', alignItems: 'center' },
  txWalletName: { fontSize: 10, fontWeight: 'bold' },
  txAmount: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', padding: 20 },
  modalContent: { borderRadius: 40, width: '100%', overflow: 'hidden' },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalAction: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  modalActionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalActionText: { fontSize: 16, fontWeight: 'bold' },
  modalClose: { padding: 20, alignItems: 'center', marginTop: 8 }
});

export default TransactionHistoryScreen;
