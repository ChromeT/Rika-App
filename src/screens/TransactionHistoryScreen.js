import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, Animated, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatMoney } from '../utils/formatUtils';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { exportToPDF, exportToXLS } from '../utils/exportUtils';
import { useNavigation } from '@react-navigation/native';
import Text from '../components/ThemeText';

// --- [SUB-KOMPONEN: History Header] ---
const HistoryHeader = ({ theme, avatar, navigation, fadeAnim, slideAnim }) => (
  <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <View style={styles.headerLeft}>
      <Text style={[styles.headerTitle, { color: theme.onSurface }]}>Riwayat Keuangan</Text>
    </View>
    <TouchableOpacity onPress={() => navigation.navigate('Couple')} style={styles.avatarWrapper}>
      {avatar?.startsWith('file://') || avatar?.startsWith('data:image') ? (
        <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <MaterialIcons name={avatar || 'person'} size={20} color={theme.primary} />
      )}
    </TouchableOpacity>
  </Animated.View>
);

// --- [SUB-KOMPONEN: Summary Cards] ---
const SummaryCards = ({ theme, totalIncome, totalExpense, formatMoney, fadeAnim, slideAnim }) => (
  <Animated.View style={[styles.summaryGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
     <LinearGradient colors={[theme.primary, theme.primary + 'AA']} style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Masuk</Text>
        <Text style={styles.summaryValue}>Rp {formatMoney(totalIncome)}</Text>
     </LinearGradient>
     <LinearGradient colors={[theme.error, theme.error + 'AA']} style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Keluar</Text>
        <Text style={styles.summaryValue}>Rp {formatMoney(totalExpense)}</Text>
     </LinearGradient>
  </Animated.View>
);

// --- [SUB-KOMPONEN: Filter Section] ---
const FilterSection = ({ 
  theme, search, setSearch, setDateModalVisible, filterMonth, filterYear, 
  filterOwner, setFilterOwner, filterType, setFilterType, 
  myName, partnerName, fadeAnim, slideAnim 
}) => (
  <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
      <View style={[styles.searchBox, { flex: 1, backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant + '22', marginBottom: 0 }]}>
        <MaterialIcons name="search" size={20} color={theme.onSurfaceVariant} />
        <TextInput 
          nativeID="search-transactions"
          name="search-transactions"
          style={[styles.searchInput, { color: theme.onSurface }]} 
          placeholder="Cari transaksi..." 
          placeholderTextColor={theme.onSurfaceVariant}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <TouchableOpacity 
        onPress={() => setDateModalVisible(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.primary + '15', paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.primary + '33' }}
      >
        <MaterialIcons name="calendar-today" size={18} color={theme.primary} />
        <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 13 }}>
          {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][filterMonth]} {filterYear}
        </Text>
      </TouchableOpacity>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginHorizontal: -20, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['Semua', 'Saya', 'Pasangan'].map(o => (
          <TouchableOpacity key={o} onPress={() => setFilterOwner(o)} style={[styles.pill, { backgroundColor: filterOwner === o ? theme.primary : theme.surfaceContainerLow, borderColor: filterOwner === o ? theme.primary : theme.outlineVariant + '22' }]}>
            <Text style={[styles.pillText, { color: filterOwner === o ? theme.onPrimary : theme.onSurfaceVariant }]}>{o === 'Pasangan' ? partnerName : o}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ width: 1, height: 20, backgroundColor: theme.outlineVariant + '33', alignSelf: 'center', marginHorizontal: 4 }} />
        {['Semua', 'income', 'expense'].map(t => (
          <TouchableOpacity key={t} onPress={() => setFilterType(t)} style={[styles.pill, { backgroundColor: filterType === t ? (t === 'income' ? theme.primary : (t === 'expense' ? theme.error : theme.primary)) : theme.surfaceContainerLow, borderColor: filterType === t ? (t === 'income' ? theme.primary : (t === 'expense' ? theme.error : theme.primary)) : theme.outlineVariant + '22' }]}>
            <Text style={[styles.pillText, { color: filterType === t ? theme.onPrimary : theme.onSurfaceVariant }]}>{t === 'Semua' ? 'Semua Tipe' : (t === 'income' ? 'Masuk' : 'Keluar')}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </Animated.View>
);

const ExportTools = ({ theme, handleExportPDF, handleExportExcel, loading }) => (
  <View style={{ flexDirection: 'row', marginBottom: 24 }}>
    <TouchableOpacity onPress={handleExportPDF} disabled={loading} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceContainerLow, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.outlineVariant + '22', marginRight: 12 }}>
      <MaterialIcons name="picture-as-pdf" size={20} color={theme.error} />
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurface, marginLeft: 8 }}>Laporan PDF</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={handleExportExcel} disabled={loading} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceContainerLow, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.outlineVariant + '22' }}>
      <MaterialIcons name="description" size={20} color="#10B981" />
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurface, marginLeft: 8 }}>Data Excel</Text>
    </TouchableOpacity>
  </View>
);

const LoadingOverlay = ({ theme }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }]}>
    <View style={{ backgroundColor: theme.surface, padding: 30, borderRadius: 24, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={{ marginTop: 16, color: theme.onSurface, fontWeight: 'bold' }}>Menyiapkan Laporan...</Text>
    </View>
  </View>
);

// --- [KOMPONEN UTAMA: TransactionHistoryScreen] ---
const TransactionHistoryScreen = ({ route }) => {
  const { highlightId, highlightName } = route.params || {};
  const { theme } = useContext(ThemeContext);
  const { user, householdUsers, avatar } = useContext(AuthContext);
  const { transactions, accounts, deleteTransaction } = useContext(DataContext);
  const navigation = useNavigation();

  // Highlighting & Scrolling logic
  const [highlightedId, setHighlightedId] = useState(null);
  const scrollRef = useRef(null);
  const itemLayouts = useRef({});
  const dateLayouts = useRef({});

  useEffect(() => {
    if (highlightId || highlightName) {
      setFilterOwner('Semua');
      setFilterType('Semua');
      setSearch('');
      setHighlightedId(highlightId || null);
      
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

  const handleBack = () => navigation.goBack();

  const filtered = useMemo(() => {
    return (transactions || []).filter(tx => {
      const txDate = new Date(tx.date);
      const monthMatch = txDate.getMonth() === filterMonth;
      const yearMatch = txDate.getFullYear() === filterYear;
      const ownerMatch = filterOwner === 'Semua' || (filterOwner === 'Saya' && tx.owner === myName) || (filterOwner === 'Pasangan' && tx.owner !== myName);
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
      await exportToPDF(filtered, period, myName, { user: filterOwner, type: filterType === 'income' ? 'Pemasukan' : filterType === 'expense' ? 'Pengeluaran' : 'Semua' }, accounts);
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
      <HistoryHeader theme={theme} avatar={avatar} navigation={navigation} fadeAnim={fadeAnims[0]} slideAnim={slideAnims[0]} /><ScrollView ref={scrollRef} contentContainerStyle={[styles.main, { paddingBottom: 150 }]} showsVerticalScrollIndicator={false}>
        <SummaryCards theme={theme} totalIncome={totalIncome} totalExpense={totalExpense} formatMoney={formatMoney} fadeAnim={fadeAnims[1]} slideAnim={slideAnims[1]} /><FilterSection 
          theme={theme} search={search} setSearch={setSearch} setDateModalVisible={setDateModalVisible} 
          filterMonth={filterMonth} filterYear={filterYear} filterOwner={filterOwner} setFilterOwner={setFilterOwner} 
          filterType={filterType} setFilterType={setFilterType} myName={myName} partnerName={partnerName} 
          fadeAnim={fadeAnims[2]} slideAnim={slideAnims[2]} 
        /><ExportTools theme={theme} handleExportPDF={handleExportPDF} handleExportExcel={handleExportExcel} loading={loading} />{grouped.map(([date, txs]) => (
          <View key={date} onLayout={(e) => { dateLayouts.current[date] = e.nativeEvent.layout.y; }}>
            <View style={styles.dateHeader}>
               <Text style={[styles.dateText, { color: theme.onSurfaceVariant }]}>{date}</Text>
               <View style={[styles.dateLine, { backgroundColor: theme.outlineVariant + '33' }]} />
            </View>
            {txs.map((item, index) => (
              <TransactionCard 
                key={item.id} tx={item} index={index} theme={theme} myName={myName} accounts={accounts} formatMoney={formatMoney}
                onEdit={() => { setSelectedTx(item); setActionModalVisible(true); }}
                isHighlighted={highlightedId === item.id}
                onLayout={(e) => { itemLayouts.current[String(item.id)] = { localY: e.nativeEvent.layout.y, date }; }}
              />
            ))}
          </View>
        ))}{filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={80} color={theme.outlineVariant + '44'} />
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>Belum ada riwayat.</Text>
            <Text style={[styles.emptySubText, { color: theme.onSurfaceVariant + '88' }]}>Transaksi yang kamu catat akan muncul di sini.</Text>
          </View>
        )}
      </ScrollView>
      {loading && <LoadingOverlay theme={theme} />}

      {/* Action Modal */}
      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
        <View style={styles.modalOverlay}>
           <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setActionModalVisible(false)} />
           <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHandle} />
              <View style={{ padding: 24 }}>
                 <Text style={[styles.modalTitle, { color: theme.onSurface, marginBottom: 24 }]}>Opsi Transaksi</Text>
                 <TouchableOpacity 
                   style={styles.modalAction} 
                   onPress={() => {
                     setActionModalVisible(false);
                     navigation.navigate('Transaction', { editingTransaction: selectedTx });
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
                   {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
                     <TouchableOpacity key={m} onPress={() => setFilterMonth(i)} style={[styles.pill, { width: '31%', backgroundColor: filterMonth === i ? theme.primary : theme.surfaceContainerLow, borderColor: filterMonth === i ? theme.primary : theme.outlineVariant + '22' }]}>
                        <Text style={[styles.pillText, { color: filterMonth === i ? theme.onPrimary : theme.onSurfaceVariant }]}>{m}</Text>
                     </TouchableOpacity>
                   ))}
                </View>
                <TouchableOpacity onPress={() => setDateModalVisible(false)} style={{ backgroundColor: theme.primary, padding: 16, borderRadius: 20, alignItems: 'center', marginTop: 32 }}>
                   <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Terapkan</Text>
                </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// --- [SUB-KOMPONEN: Transaction Card] ---
const TransactionCard = ({ tx, index, theme, myName, accounts, formatMoney, onEdit, isHighlighted, onLayout }) => {
  const typeColor = tx.type === 'income' ? theme.primary : tx.type === 'transfer' ? theme.onSurfaceVariant : theme.error;
  const totalAmt = (tx.myContrib || 0) + (tx.partnerContrib || 0);
  const isOwner = tx.owner === myName;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, delay: index * 50, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View onLayout={onLayout} style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Animated.View style={[isHighlighted && { backgroundColor: theme.primary + '15', borderRadius: 24, transform: [{ scale: 1.02 }] }]}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => isOwner && onEdit()}
          style={styles.txCard}
        >
          <View style={[styles.txIconBg, { backgroundColor: typeColor + '15' }]}>
            <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'payments' : tx.type === 'transfer' ? 'swap-horiz' : 'shopping-bag')} size={24} color={typeColor} />
          </View>
          <View style={styles.txInfo}>
            <Text style={[styles.txName, { color: theme.onSurface }]} numberOfLines={1}>{tx.name}</Text>
            <View style={styles.txMeta}>
              <View style={{ backgroundColor: theme.primary + '15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ color: theme.primary, fontSize: 10, fontWeight: 'bold' }}>{tx.category?.toUpperCase() || 'UMUM'}</Text>
              </View>
              <Text style={[styles.txWalletName, { color: theme.onSurfaceVariant, marginLeft: 8 }]}>
                {(() => {
                  const accId = tx.type === 'transfer' ? tx.fromAccountId : tx.accountId;
                  const acc = (accounts || []).find(a => a.id === accId);
                  return acc ? acc.name : 'Tunai';
                })()}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
             <Text style={[styles.txAmount, { color: typeColor }]}>
               {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}Rp {formatMoney(totalAmt)}
             </Text>
             <Text style={{ fontSize: 9, fontWeight: 'bold', color: theme.onSurfaceVariant, marginTop: 4 }}>{tx.owner === myName ? 'OLEH SAYA' : `OLEH ${tx.owner?.toUpperCase()}`}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

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
  summaryValue: { color: '#fff', fontSize: 17, fontWeight: '900' },
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
