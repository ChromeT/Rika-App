// Force re-bundle: 2026-05-12 23:56:00
import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Image, Modal, ActivityIndicator, Alert, Animated, Platform } from 'react-native';
import Text from '../components/ThemeText';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { exportToXLS, exportToPDF } from '../utils/exportUtils';

const TransactionHistoryScreen = ({ route }) => {
  const { highlightId, highlightName } = route.params || {};
  const { theme } = useContext(ThemeContext);
  const { user, householdUsers, avatar } = useContext(AuthContext);
  const { transactions, accounts, deleteTransaction } = useContext(DataContext);
  const navigation = useNavigation();

  // Highlighting & Scrolling
  const [highlightedId, setHighlightedId] = useState(null);
  const scrollRef = useRef(null);
  const itemLayouts = useRef({});
  const dateLayouts = useRef({});

  useEffect(() => {
    if (highlightId || highlightName) {
      console.log('Highlighting ID:', highlightId, 'Name:', highlightName);
      // 1. Reset Filters Immediately
      setFilterOwner('Semua');
      setFilterType('Semua');
      setSearch('');
      // Only set highlightedId if it's a direct ID match
      setHighlightedId(highlightId || null);
      
      // 2. Persistent Scroll Search with Smart Matching
      let attempts = 0;
      const findAndScroll = setInterval(() => {
        // Try to find the item in itemLayouts
        let targetLayout = itemLayouts.current[String(highlightId)];
        
        if (!targetLayout) {
          const matchingTx = transactions.find(t => 
            (highlightId && (
              String(t.id) === String(highlightId) || 
              String(t.billId) === String(highlightId) || 
              String(t.goalId) === String(highlightId)
            )) ||
            (highlightName && t.name && (
              String(t.name).toLowerCase() === String(highlightName).toLowerCase() ||
              String(t.name).toLowerCase() === `bayar tagihan: ${highlightName}`.toLowerCase()
            ))
          );
          if (matchingTx) {
            targetLayout = itemLayouts.current[String(matchingTx.id)];
            if (targetLayout) {
              setHighlightedId(matchingTx.id);
              // Clear highlightName so we only highlight this specific ID from now on
              navigation.setParams({ highlightName: null }); 
            }
          }
        }

        if (targetLayout && scrollRef.current) {
          const sectionY = dateLayouts.current[targetLayout.date] || 0;
          const absoluteY = targetLayout.localY + sectionY;
          
          const scrollTarget = scrollRef.current.scrollTo || (scrollRef.current.getNode && scrollRef.current.getNode().scrollTo);
          if (scrollTarget) {
            scrollRef.current.scrollTo({ y: Math.max(0, absoluteY - 100), animated: true });
          }
          
          clearInterval(findAndScroll);
          
          // Clear highlight after a few seconds
          setTimeout(() => {
            setHighlightedId(null);
            navigation.setParams({ highlightId: null, highlightName: null });
          }, 5000);
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
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth()); // 0-11
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // UI States
  const [selectedTx, setSelectedTx] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animations
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
    Animated.parallel([
      Animated.timing(fadeAnims[0], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[1], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[2], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[3], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[0], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[1], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[2], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[3], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' })
    ]).start(() => navigation.goBack());
  };

  const formatMoney = (amount) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount || 0);

  const filtered = useMemo(() => {
    return (transactions || []).filter(tx => {
      const txDate = new Date(tx.date);
      const monthMatch = txDate.getMonth() === filterMonth;
      const yearMatch = txDate.getFullYear() === filterYear;
      
      const ownerMatch =
        filterOwner === 'Semua' ||
        (filterOwner === 'Saya' && tx.owner === myName) ||
        (filterOwner === 'Pasangan' && tx.owner !== myName);
      const typeMatch = filterType === 'Semua' || tx.type === filterType;
      const searchMatch =
        !search ||
        tx.name?.toLowerCase().includes(search.toLowerCase()) ||
        tx.category?.toLowerCase().includes(search.toLowerCase());
      return monthMatch && yearMatch && ownerMatch && typeMatch && searchMatch;
    });
  }, [transactions, filterOwner, filterType, search, myName, filterMonth, filterYear]);

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const period = `${monthNames[filterMonth]} ${filterYear}`;
    
    setLoading(true);
    try {
      await exportToXLS(filtered, period, myName, { user: filterOwner, type: filterType === 'income' ? 'Pemasukan' : filterType === 'expense' ? 'Pengeluaran' : 'Semua' }, accounts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderTransactionItem = ({ item, index, date }) => (
    <TransactionCard 
      key={item.id}
      tx={item} 
      index={index} 
      theme={theme} 
      myName={myName} 
      loading={loading} 
      accounts={accounts}
      formatMoney={formatMoney}
      onEdit={() => {
        setSelectedTx(item);
        setActionModalVisible(true);
      }} 
      isHighlighted={
        (highlightedId && String(highlightedId) === String(item.id)) || 
        (highlightId && String(highlightId) === String(item.id)) ||
        (highlightId && String(highlightId) === String(item.billId)) ||
        (highlightId && String(highlightId) === String(item.goalId)) ||
        (!highlightedId && highlightName && (
          String(item.name).toLowerCase() === String(highlightName).toLowerCase() ||
          String(item.name).toLowerCase() === `bayar tagihan: ${highlightName}`.toLowerCase()
        ))
      }
      onLayout={(e) => {
        itemLayouts.current[String(item.id)] = { localY: e.nativeEvent.layout.y, date };
      }}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
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

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.main}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Mini Cards */}
        <Animated.View style={[styles.summaryGrid, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
           <LinearGradient colors={[theme.primary, theme.primary + 'AA']} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Masuk</Text>
              <Text style={styles.summaryValue}>Rp {formatMoney(totalIncome)}</Text>
           </LinearGradient>
           <LinearGradient colors={[theme.error, theme.error + 'AA']} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Keluar</Text>
              <Text style={styles.summaryValue}>Rp {formatMoney(totalExpense)}</Text>
           </LinearGradient>
        </Animated.View>

        {/* Search & Date Picker Pill */}
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
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
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: 8, 
              backgroundColor: theme.primary + '15', 
              paddingHorizontal: 16, 
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.primary + '33'
            }}
          >
            <MaterialIcons name="event" size={20} color={theme.primary} />
            <Text style={{ color: theme.onSurface, fontWeight: 'bold', fontSize: 13 }}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][filterMonth]} {filterYear}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Export Tools */}
        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
          <TouchableOpacity 
            onPress={handleExportPDF} 
            disabled={loading}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceContainerLow, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.outlineVariant + '22', marginRight: 12 }}
          >
            <MaterialIcons name="picture-as-pdf" size={20} color={theme.error} />
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurface, marginLeft: 8 }}>Laporan PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleExportExcel} 
            disabled={loading}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceContainerLow, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.outlineVariant + '22' }}
          >
            <MaterialIcons name="description" size={20} color="#10B981" />
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurface, marginLeft: 8 }}>Data Excel</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }]}>
            <View style={{ backgroundColor: theme.surface, padding: 30, borderRadius: 24, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ marginTop: 16, color: theme.onSurface, fontWeight: 'bold' }}>Menyiapkan Laporan...</Text>
            </View>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
           {['Semua', 'Saya', 'Pasangan'].map(opt => (
             <TouchableOpacity key={opt} style={[styles.chip, filterOwner === opt && { backgroundColor: theme.primary }]} onPress={() => setFilterOwner(opt)}>
                <Text style={[styles.chipText, { color: filterOwner === opt ? theme.onPrimary : theme.onSurfaceVariant }]}>{opt === 'Saya' ? myName : opt === 'Pasangan' ? partnerName : opt}</Text>
             </TouchableOpacity>
           ))}
           <View style={{ width: 1, backgroundColor: theme.outlineVariant + '33', marginHorizontal: 4 }} />
           {[{ key: 'Semua', label: 'Tipe' }, { key: 'income', label: 'Masuk' }, { key: 'expense', label: 'Keluar' }].map(opt => (
             <TouchableOpacity key={opt.key} style={[styles.chip, filterType === opt.key && { backgroundColor: theme.primary }]} onPress={() => setFilterType(opt.key)}>
                <Text style={[styles.chipText, { color: filterType === opt.key ? theme.onPrimary : theme.onSurfaceVariant }]}>{opt.label}</Text>
             </TouchableOpacity>
           ))}
        </ScrollView>
      </Animated.View>

        {/* List Content */}
        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          {grouped.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: theme.surfaceContainerLow, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                 <MaterialIcons name="receipt-long" size={60} color={theme.primary + '22'} />
              </View>
              <Text style={[styles.emptyText, { color: theme.onSurface }]}>Belum ada catatan</Text>
              <Text style={[styles.emptySubText, { color: theme.onSurfaceVariant }]}>Catatan transaksi Anda akan muncul di sini.</Text>
            </View>
          ) : grouped.map(([date, txs], gIdx) => (
            <View 
              key={date} 
              style={{ marginBottom: 24 }}
              onLayout={(e) => {
                dateLayouts.current[date] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.dateHeader}>
                 <Text style={[styles.dateText, { color: theme.primary }]}>{date}</Text>
                 <View style={[styles.dateLine, { backgroundColor: theme.outlineVariant + '22' }]} />
              </View>
              {txs.map((tx, idx) => renderTransactionItem({ item: tx, index: idx, date }))}
            </View>
          ))}
          <View style={{ height: 80 }} />
        </Animated.View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDateModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, paddingBottom: 40 }]}>
            <View style={styles.modalHandle} />
            <View style={{ padding: 24 }}>
               <Text style={[styles.modalTitle, { color: theme.onSurface, marginBottom: 20 }]}>Pilih Periode</Text>
               
               <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12, textTransform: 'uppercase' }}>BULAN</Text>
               <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
                    <TouchableOpacity 
                      key={m} 
                      onPress={() => setFilterMonth(i)}
                      style={{ 
                        width: '31%', 
                        paddingVertical: 12, 
                        borderRadius: 12, 
                        alignItems: 'center', 
                        backgroundColor: filterMonth === i ? theme.primary : theme.surfaceContainerLow,
                        borderWidth: 1,
                        borderColor: filterMonth === i ? theme.primary : 'transparent'
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: filterMonth === i ? theme.onPrimary : theme.onSurface }}>{m}</Text>
                    </TouchableOpacity>
                  ))}
               </View>

               <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12, marginTop: 24, textTransform: 'uppercase' }}>TAHUN</Text>
               <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <TouchableOpacity 
                      key={y} 
                      onPress={() => setFilterYear(y)}
                      style={{ 
                        flex: 1, 
                        paddingVertical: 12, 
                        borderRadius: 12, 
                        alignItems: 'center', 
                        backgroundColor: filterYear === y ? theme.primary : theme.surfaceContainerLow,
                        borderWidth: 1,
                        borderColor: filterYear === y ? theme.primary : 'transparent'
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: filterYear === y ? theme.onPrimary : theme.onSurface }}>{y}</Text>
                    </TouchableOpacity>
                  ))}
               </View>

               <TouchableOpacity 
                 onPress={() => setDateModalVisible(false)}
                 style={{ marginTop: 32, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
               >
                 <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Terapkan</Text>
               </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Action Modal */}
      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
            <View style={{ padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '11' }}>
               <Text style={[styles.modalTitle, { color: theme.onSurface }]}>Aksi Transaksi</Text>
               <Text style={{ color: theme.onSurfaceVariant, fontSize: 13 }}>{selectedTx?.name}</Text>
            </View>
            <View style={{ padding: 12 }}>
               <TouchableOpacity 
                 onPress={() => {
                   setActionModalVisible(false);
                   if (selectedTx.type === 'transfer') navigation.navigate('Transfer', { editingTransaction: selectedTx });
                   else navigation.navigate('Transaksi', { editingTransaction: selectedTx });
                 }} 
                 style={styles.modalAction}
               >
                  <View style={[styles.modalActionIcon, { backgroundColor: theme.primary + '15' }]}>
                     <MaterialIcons name="edit" size={22} color={theme.primary} />
                  </View>
                  <Text style={[styles.modalActionText, { color: theme.onSurface }]}>Edit Transaksi</Text>
               </TouchableOpacity>
               
               <TouchableOpacity 
                 onPress={() => { setActionModalVisible(false); setTimeout(() => setConfirmVisible(true), 300); }} 
                 style={styles.modalAction}
               >
                  <View style={[styles.modalActionIcon, { backgroundColor: theme.error + '15' }]}>
                     <MaterialIcons name="delete-outline" size={22} color={theme.error} />
                  </View>
                  <Text style={[styles.modalActionText, { color: theme.error }]}>Hapus Transaksi</Text>
               </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalClose} onPress={() => setActionModalVisible(false)}>
               <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, padding: 32, alignItems: 'center' }]}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.error + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
               <MaterialIcons name="warning" size={40} color={theme.error} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 12 }}>Hapus Permanen?</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
              Tindakan ini akan mengembalikan saldo dompet Anda secara otomatis.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
               <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.surfaceContainerHighest }]} onPress={() => setConfirmVisible(false)}>
                  <Text style={{ color: theme.onSurface, fontWeight: 'bold' }}>Batal</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={[styles.confirmBtn, { backgroundColor: theme.error }]} 
                 onPress={async () => {
                   setLoading(true);
                   try {
                     await deleteTransaction(selectedTx.id);
                     setConfirmVisible(false);
                   } catch (e) {
                     Alert.alert('Gagal', 'Terjadi kesalahan sistem');
                   } finally {
                     setLoading(false);
                   }
                 }}
                 disabled={loading}
               >
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ya, Hapus</Text>}
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Moved outside to prevent re-mounting on every re-render
const TransactionCard = ({ tx, index, theme, myName, loading, accounts, formatMoney, onEdit, isHighlighted, onLayout }) => {
  const itemAnim = useRef(new Animated.Value(0)).current;
  const hAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(itemAnim, {
      toValue: 1,
      delay: index * 40,
      useNativeDriver: Platform.OS !== 'web',
      tension: 50,
      friction: 8
    }).start();
  }, []);

  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(hAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.delay(3000),
        Animated.timing(hAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]).start();
    } else {
      hAnim.setValue(0);
    }
  }, [isHighlighted]);

  const totalAmt = (tx.myContrib || 0) + (tx.partnerContrib || 0);
  const isOwner = tx.owner === myName;
  const typeColor = tx.type === 'income' ? theme.primary : tx.type === 'transfer' ? '#6366F1' : theme.error;

  return (
    <Animated.View 
      onLayout={onLayout}
      style={{ 
        opacity: itemAnim, 
        transform: [
          { translateY: itemAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }
        ] 
      }}
    >
      <Animated.View style={{
        borderRadius: 28,
        marginBottom: 12,
        backgroundColor: hAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.surfaceContainerLow, theme.primary + '33'] }),
        borderWidth: hAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }),
        borderColor: hAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', theme.primary] }),
        overflow: 'hidden',
      }}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => {
            if (isOwner && !loading) {
              onEdit();
            }
          }}
          disabled={loading}
          style={styles.txCard}
        >
          <View style={[styles.txIconBg, { backgroundColor: typeColor + '15' }]}>
            <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'payments' : tx.type === 'transfer' ? 'swap-horiz' : 'shopping-bag')} size={24} color={typeColor} />
          </View>
          <View style={styles.txInfo}>
            <Text style={[styles.txName, { color: theme.onSurface }]} numberOfLines={1}>{tx.name}</Text>
            <View style={styles.txMeta}>
              <View style={[styles.txCatBadge, { backgroundColor: theme.primary + '10' }]}>
                <Text style={[styles.txCatText, { color: theme.primary }]}>{tx.category}</Text>
              </View>
              <View style={styles.txWallet}>
                 <Text style={[styles.txWalletName, { color: theme.onSurfaceVariant }]}>
                  {(() => {
                    const accId = tx.type === 'transfer' ? tx.fromAccountId : tx.accountId;
                    const acc = (accounts || []).find(a => a.id === accId);
                    return acc ? acc.name : 'Tunai';
                  })()}
                </Text>
              </View>
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
  headerBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  avatarWrapper: { width: 36, height: 36, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  main: { paddingHorizontal: 20, paddingBottom: 100 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  summaryCard: { flex: 1, padding: 20, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 17, fontWeight: '900' },

  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  searchInput: { flex: 1, marginHorizontal: 12, fontSize: 15 },
  filterScroll: { marginBottom: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  chipText: { fontSize: 12, fontWeight: 'bold' },

  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 },
  dateText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateLine: { flex: 1, height: 1 },

  txCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 10 },
  txIconBg: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, marginLeft: 16 },
  txName: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txCatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  txCatText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
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
  modalClose: { padding: 20, alignItems: 'center', marginTop: 8 },
  confirmBtn: { flex: 1, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});

export default TransactionHistoryScreen;
