import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Dimensions, Modal, Image, Alert, Animated, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { exportToXLS, exportToPDF } from '../utils/exportUtils';
import Svg, { Circle, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation, route }) => {
  const { theme } = useContext(ThemeContext);
  const { transactions, getBalance, bills, addBill, updateBill, deleteBill, notifications, addNotification, goals, accounts, deleteTransaction } = useContext(DataContext);
  const { user, householdUsers, avatar, lastReadNotif, markNotificationsAsRead } = useContext(AuthContext);
  
  const [filter, setFilter] = useState('Kita');
  const [timeFilter, setTimeFilter] = useState('Bulan ini');
  const [notifyVisible, setNotifyVisible] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [billActionModalVisible, setBillActionModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isEditingBill, setIsEditingBill] = useState(false);
  
  // Custom Confirm Modal states
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});
  
  // Transaction Action States
  const [selectedRecentTx, setSelectedRecentTx] = useState(null);
  const [txActionModalVisible, setTxActionModalVisible] = useState(false);
  const [txConfirmVisible, setTxConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // Toast States
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    Animated.spring(toastAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 40,
      friction: 7
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true
      }).start(() => {
        setToastVisible(false);
      });
    }, 3500);
  };

  const scrollRef = useRef(null);

  // Fitur Tarik / Double Tap buat Refresh
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data dari Firestore sudah real-time, jadi kita beri sensasi loading 1.2 detik saja
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  }, []);

  // Listen untuk klik tab "Beranda" pas lagi di dalam Beranda
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // Kalau layar sedang aktif dan user pencet tabnya lagi (Double tap logic)
      if (navigation.isFocused()) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        onRefresh();
      }
    });
    return unsubscribe;
  }, [navigation, onRefresh]);
  const [billsY, setBillsY] = useState(0);
  const [recentY, setRecentY] = useState(0);
  const [goalsY, setGoalsY] = useState(0);
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;

  const triggerHighlight = (id) => {
    setHighlightedId(id);
    highlightAnim.setValue(0);
    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.delay(800),
      Animated.timing(highlightAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start(() => setHighlightedId(null));
  };

  // Trigger highlight if coming from Transaksi/Transfer screen
  useEffect(() => {
    if (route.params?.highlightTxId) {
      const tid = route.params.highlightTxId;
      // Beri sedikit delay agar transisi layar selesai
      setTimeout(() => {
        triggerHighlight(tid);
        // Reset params
        navigation.setParams({ highlightTxId: null });
      }, 500);
    }
  }, [route.params?.highlightTxId]);

  const handleNotifClick = (notif) => {
    setNotifyVisible(false);
    setTimeout(() => {
      if (notif.targetType === 'goal' && notif.targetId) {
        const goalData = Array.isArray(goals) ? goals.find(g => g.id === notif.targetId) : null;
        if (goalData?.achieved) {
          navigation.navigate('MemoryDetail', { goalId: notif.targetId });
        } else {
          navigation.navigate('GoalDetail', { goalId: notif.targetId });
        }
      } else if (notif.targetType === 'bill' && notif.targetId) {
        scrollRef.current?.scrollTo({ y: billsY, animated: true });
        setTimeout(() => triggerHighlight(notif.targetId), 400);
      } else if (notif.targetType === 'transaction') {
        scrollRef.current?.scrollTo({ y: recentY, animated: true });
        if (notif.targetId) {
          setTimeout(() => triggerHighlight(notif.targetId), 400);
        } else if (notif.targetName) {
          setTimeout(() => triggerHighlight(notif.targetName), 400);
        }
      } else if (notif.title?.toLowerCase().includes('tagihan')) {
        scrollRef.current?.scrollTo({ y: billsY, animated: true });
      } else if (notif.title?.toLowerCase().includes('transaksi') || notif.title?.toLowerCase().includes('pemasukan') || notif.title?.toLowerCase().includes('pengeluaran')) {
        scrollRef.current?.scrollTo({ y: recentY, animated: true });
      }
    }, 300);
  };

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnim, { toValue, useNativeDriver: true, bounciness: 8 }).start();
    setFabOpen(!fabOpen);
  };

  const handleFabAction = (action) => {
    toggleFab();
    setTimeout(() => {
      if (action === 'pengeluaran') navigation.navigate('Transaksi', { type: 'expense' });
      else if (action === 'pemasukan') navigation.navigate('Transaksi', { type: 'income' });
      else if (action === 'tagihan') {
        setIsEditingBill(false);
        setBillName('');
        setBillAmount('');
        setBillDays('');
        setBillModalVisible(true);
      }
      else if (action === 'transfer') navigation.navigate('Transfer');
      else if (action === 'goals') navigation.navigate('Goals');
    }, 200);
  };

  const fabActions = [
    { key: 'goals', icon: 'favorite', label: 'Goals baru', color: '#E879F9' },
    { key: 'transfer', icon: 'swap-horiz', label: 'Pindah dana', color: '#6366F1' },
    { key: 'tagihan', icon: 'receipt-long', label: 'Pengingat tagihan', color: '#F59E0B' },
    { key: 'pemasukan', icon: 'payments', label: 'Pemasukan', color: '#10B981' },
    { key: 'pengeluaran', icon: 'shopping-bag', label: 'Pengeluaran', color: '#F43F5E' },
  ];
  
  const myName = user?.name || 'Saya';
  const partnerName = householdUsers.find(u => u !== myName);
  const hasPartner = !!partnerName;

  const activeGoals = Array.isArray(goals)
      ? goals
          .filter(g => g && g.achieved !== true && g.status !== 'achieved')
          .sort((a, b) => {
            const progressA = a.targetAmount > 0 ? (a.currentAmount || 0) / a.targetAmount : 0;
            const progressB = b.targetAmount > 0 ? (b.currentAmount || 0) / b.targetAmount : 0;
            return progressA - progressB;
          })
          .slice(0, 2)
      : [];

    const totalActiveGoals = Array.isArray(goals) ? goals.filter(g => g && g.achieved !== true).length : 0;
    const totalSaved = activeGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

  const displayNotifs = notifications.filter(n => n.sender !== myName);
  // Default to 0 if lastReadNotif is undefined, ensuring everything shows up properly if reading fails, but correctly handles synced values.
  const unreadCount = displayNotifs.filter(n => new Date(n.createdAt).getTime() > (lastReadNotif || 0)).length;

  const handleOpenNotify = async () => {
    setNotifyVisible(true);
    
    // Ambil waktu notifikasi terbaru untuk mencegah bug karena perbedaan jam antar device (clock skew)
    const maxNotifTime = displayNotifs.length > 0 
      ? Math.max(...displayNotifs.map(n => new Date(n.createdAt).getTime()))
      : 0;
      
    const now = Math.max(Date.now(), maxNotifTime);
    
    if (markNotificationsAsRead) {
      markNotificationsAsRead(now);
    }
  };

  // State for new bill
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDays, setBillDays] = useState('');


  const activeName = filter === 'Saya' ? myName : (filter === 'Pasangan' ? partnerName : 'Kita');
  
  const filteredByTime = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    const today = new Date();
    if (timeFilter === 'Hari ini') {
      return txDate.toDateString() === today.toDateString();
    } else if (timeFilter === 'Minggu ini') {
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      return txDate >= lastWeek;
    } else if (timeFilter === 'Bulan ini') {
      return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
    } else if (timeFilter === 'Tahun ini') {
      return txDate.getFullYear() === today.getFullYear();
    }
    return true; // Semua Waktu
  });

  const filteredTx = filteredByTime.filter(tx => {
    if (filter === 'Kita') return true;
    if (filter === 'Saya') return tx.owner === myName;
    if (filter === 'Pasangan') return tx.owner !== myName;
    return true;
  });
  
  const safeAccounts = accounts || [];
  const filteredAccounts = safeAccounts.filter(acc => {
    if (filter === 'Kita') return true;
    if (filter === 'Saya') return acc.owner === myName;
    if (filter === 'Pasangan') return acc.owner === partnerName;
    return true;
  });

  const currentBalance = getBalance(activeName);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount);
  };

  // === Hitung data chart per kategori (hanya pengeluaran) ===
  const expenseTx = filteredTx.filter(tx => tx.type === 'expense');
  const totalExpense = expenseTx.reduce((sum, tx) => sum + (tx.myContrib + tx.partnerContrib), 0);

  const CHART_COLORS = [
    '#A78BFA', // ungu
    '#F472B6', // pink
    '#34D399', // hijau
    '#FB923C', // oranye
    '#60A5FA', // biru
    '#FBBF24', // kuning
    '#F87171', // merah
  ];

  const categoryMap = {};
  expenseTx.forEach(tx => {
    const cat = tx.category || 'Lainnya';
    categoryMap[cat] = (categoryMap[cat] || 0) + (tx.myContrib + tx.partnerContrib);
  });

  // Urutkan dari terbesar ke terkecil, max 5 kategori
  const sortedCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Konstanta SVG donut
  const RADIUS = 55;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~345.6
  const STROKE_WIDTH = 20;

  // Hitung offset & dash array untuk tiap segmen
  const buildSegments = () => {
    if (totalExpense === 0 || sortedCategories.length === 0) return [];
    let offset = 0;
    return sortedCategories.map(([cat, amount], i) => {
      const ratio = amount / totalExpense;
      const dash = ratio * CIRCUMFERENCE;
      const gap = CIRCUMFERENCE - dash;
      const seg = { cat, amount, color: CHART_COLORS[i % CHART_COLORS.length], dash, gap, offset };
      offset += dash;
      return seg;
    });
  };
  const segments = buildSegments();

  const handleSaveBill = () => {
    if (!billName || !billAmount || !billDays) return;
    const numDays = Number(billDays);
    const dueDate = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000).toISOString();
    
    if (isEditingBill && selectedBill) {
      updateBill(selectedBill.id, {
        name: billName,
        amount: Number(billAmount),
        dueDate,
      });
      addNotification({
        title: 'Tagihan Diperbarui',
        body: `${myName} mengubah detail tagihan "${billName}".`,
        icon: 'receipt-long',
        color: 'primary',
        sender: myName,
        targetType: 'bill',
        targetId: selectedBill.id,
      });
    } else {
      addBill({
        name: billName,
        amount: Number(billAmount),
        dueDate,
      });
      addNotification({
        title: 'Tagihan Baru',
        body: `${myName} menambahkan tagihan baru: "${billName}" sebesar Rp ${formatMoney(Number(billAmount))}.`,
        icon: 'receipt-long',
        color: 'primary',
        sender: myName,
        targetType: 'bill',
      });
    }
    
    setBillName('');
    setBillAmount('');
    setBillDays('');
    setBillModalVisible(false);
    setIsEditingBill(false);
  };

  const handleBillClick = (bill) => {
    setSelectedBill(bill);
    setBillActionModalVisible(true);
  };

  const handleEditBill = () => {
    setBillActionModalVisible(false);
    setIsEditingBill(true);
    setBillName(selectedBill.name);
    setBillAmount(selectedBill.amount.toString());
    
    // Hitung ulang hari sisa untuk diisi di form
    let currentDaysLeft = selectedBill.daysLeft;
    if (selectedBill.dueDate) {
      const diff = new Date(selectedBill.dueDate).getTime() - Date.now();
      currentDaysLeft = Math.ceil(diff / (1000 * 3600 * 24));
    }
    setBillDays(currentDaysLeft.toString());
    
    setTimeout(() => setBillModalVisible(true), 300);
  };

  const handleDeleteBill = () => {
    setBillActionModalVisible(false);
    setTimeout(() => {
      setConfirmConfig({
        title: 'Hapus Tagihan',
        message: 'Yakin ingin menghapus tagihan ini secara permanen?',
        cancelText: 'Batal',
        confirmText: 'Hapus',
        confirmColor: theme.error,
        onConfirm: () => {
          deleteBill(selectedBill.id);
          addNotification({
            title: 'Tagihan Dihapus',
            body: `${myName} telah menghapus tagihan "${selectedBill.name}".`,
            icon: 'delete',
            color: 'error',
            sender: myName,
            targetType: 'bill',
          });
          setConfirmVisible(false);
        }
      });
      setConfirmVisible(true);
    }, 300);
  };

  const handleMarkPaid = () => {
    setBillActionModalVisible(false);
    setTimeout(() => {
      setConfirmConfig({
        title: 'Tandai Lunas',
        message: 'Apakah kamu ingin otomatis mencatat tagihan ini sebagai Pengeluaran?',
        cancelText: 'Tidak, Hapus Saja',
        confirmText: 'Ya, Catat!',
        confirmColor: theme.primary,
        onCancel: () => {
          deleteBill(selectedBill.id);
          addNotification({
            title: 'Tagihan Lunas',
            body: `${myName} menandai tagihan "${selectedBill.name}" telah lunas!`,
            icon: 'check-circle',
            color: 'primary',
            sender: myName,
            targetType: 'bill',
          });
          setConfirmVisible(false);
        },
        onConfirm: () => {
          deleteBill(selectedBill.id);
          addNotification({
            title: 'Tagihan Lunas',
            body: `${myName} menandai tagihan "${selectedBill.name}" telah lunas dan mencatatnya.`,
            icon: 'check-circle',
            color: 'primary',
            sender: myName,
            targetType: 'bill',
          });
          setConfirmVisible(false);
          navigation.navigate('Transaksi', { 
            type: 'expense', 
            predefinedName: selectedBill.name, 
            predefinedAmount: selectedBill.amount.toString() 
          });
        }
      });
      setConfirmVisible(true);
    }, 300);
  };

  const handleRemindBill = () => {
    if (!selectedBill) return;
    if (!hasPartner) {
      Alert.alert('Belum Ada Pasangan', 'Tunggu pasangan Anda bergabung sebelum mengirim pengingat.');
      return;
    }
    setBillActionModalVisible(false);
    addNotification({
      title: 'Pengingat Tagihan',
      body: `${myName} mengingatkan: Tagihan "${selectedBill.name}" sebesar Rp ${formatMoney(selectedBill.amount)} belum lunas!`,
      icon: 'bolt',
      color: 'error',
      sender: myName,
      targetType: 'bill',
      targetId: selectedBill.id,
    });
    showToast(`Terkirim! Notifikasi pengingat untuk "${selectedBill.name}" telah dikirim ke pasangan Anda.`);
  };

  const getStyles = (t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingHorizontal: 24, 
      paddingVertical: 16, 
      backgroundColor: t.surface, 
      zIndex: 50,
      borderBottomWidth: 0, // Pastikan nggak ada garis bawah
      elevation: 0, // Hapus bayangan Android
      shadowOpacity: 0, // Hapus bayangan iOS
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logoText: { fontSize: 22, fontWeight: '900', color: t.primary, letterSpacing: -1, marginRight: 4 },
    avatarWrapper: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: t.surfaceContainer, borderWidth: 1, borderColor: t.outlineVariant + '33', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: t.primary, letterSpacing: -0.5 },
    
    main: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
    
    heroSection: { marginBottom: 32 },
    heroLabel: { fontSize: 14, fontWeight: '500', color: t.onSurfaceVariant, marginBottom: 4 },
    balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 24 },
    currency: { color: t.primary, fontSize: 24, fontWeight: 'bold' },
    balanceValue: { fontSize: 36, fontWeight: '900', color: t.onSurface, letterSpacing: -1 },
    
    toggleContainer: { backgroundColor: t.surfaceContainerLow, padding: 6, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', maxWidth: 260 },
    toggleBtnActive: { backgroundColor: t.primaryContainer, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, flex: 1, alignItems: 'center' },
    toggleBtnInactive: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, flex: 1, alignItems: 'center' },
    toggleTextActive: { color: t.onPrimaryContainer, fontSize: 14, fontWeight: 'bold' },
    toggleTextInactive: { color: t.onSurfaceVariant, fontSize: 14, fontWeight: '500' },

    bentoRow: { flexDirection: 'column', gap: 16, marginBottom: 16 },
    chartCard: { backgroundColor: t.surfaceContainerLow, borderRadius: 32, padding: 24 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: t.onSurface },
    cardBadge: { fontSize: 12, color: t.onSurfaceVariant, backgroundColor: t.surfaceContainer, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    donutInner: { position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    donutLabel: { fontSize: 10, color: t.onSurfaceVariant, letterSpacing: 1, textTransform: 'uppercase' },
    donutValue: { fontSize: 14, fontWeight: 'bold', color: t.onSurface },
    legendContainer: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: t.surfaceContainerLowest, borderRadius: 20 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { fontSize: 11, color: t.onSurfaceVariant, fontWeight: '600', maxWidth: 90 },
    legendPercent: { fontSize: 11, color: t.onSurface, fontWeight: 'bold' },

    goalCard: { backgroundColor: t.primaryContainer + '33', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: t.primary + '1A', overflow: 'hidden' },
    goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    goalTitle: { fontWeight: 'bold', color: t.primary, fontSize: 16 },
    goalSubtitle: { fontSize: 12, color: t.onSurfaceVariant },
    goalStatus: { fontSize: 18, fontWeight: 'bold', color: t.onSurface },
    goalStatusSub: { fontSize: 10, fontWeight: 'normal', color: t.onSurfaceVariant },
    progressBarBg: { height: 8, backgroundColor: t.surfaceContainer, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
    progressBarFill: { height: '100%', width: '65%', backgroundColor: t.primary, borderRadius: 4 },

    ctaBtn: { borderRadius: 32, marginTop: 16, overflow: 'hidden' },
    ctaGradient: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ctaText: { color: t.onPrimary, fontWeight: 'bold', fontSize: 18 },
    ctaIconBg: { backgroundColor: t.onPrimary + '1A', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    fabContainer: { position: 'absolute', right: 24, bottom: 108, alignItems: 'flex-end' },
    fabMain: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
    fabGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    fabItem: { position: 'absolute', bottom: 0, right: 0, alignItems: 'flex-end' },
    fabItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    fabMini: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
    fabLabel: { backgroundColor: 'rgba(15,15,15,0.85)', color: '#fff', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },

    billsSection: { marginBottom: 24 },
    billsScroll: { paddingRight: 24, paddingBottom: 8 },
    billCard: { backgroundColor: t.surfaceContainer, borderRadius: 24, padding: 16, marginRight: 12, minWidth: 140, borderWidth: 1, borderColor: t.outlineVariant + '1A' },
    billCardUrgent: { backgroundColor: t.primaryContainer + '33', borderColor: t.primary + '33' },
    billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    billIconBg: { width: 32, height: 32, borderRadius: 12, backgroundColor: t.surfaceContainerLowest, justifyContent: 'center', alignItems: 'center' },
    billBadge: { fontSize: 9, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
    billBadgeOk: { backgroundColor: t.surfaceContainerHigh, color: t.onSurfaceVariant },
    billBadgeUrgent: { backgroundColor: t.error, color: t.onError },
    billTitle: { fontSize: 14, fontWeight: 'bold', color: t.onSurface, marginBottom: 2 },
    billPrice: { fontSize: 12, fontWeight: '500', color: t.primary },

    recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, marginTop: 16 },
    recentTitle: { fontSize: 20, fontWeight: '900', color: t.onSurface, letterSpacing: -0.5 },
    recentSeeAll: { color: t.primary, fontSize: 12, fontWeight: 'bold' },
    txItem: { backgroundColor: t.surfaceContainer, padding: 16, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    txIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: t.surfaceContainerLowest, justifyContent: 'center', alignItems: 'center' },
    txName: { fontWeight: 'bold', fontSize: 14, color: t.onSurface },
    txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    txBadge: { fontSize: 10, backgroundColor: t.secondaryContainer, color: t.onSecondaryContainer, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    txTime: { fontSize: 10, color: t.onSurfaceVariant },
    txWallet: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.surfaceContainerHigh, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    txWalletName: { fontSize: 10, color: t.onSurfaceVariant, fontWeight: 'bold' },
    txAmountNeg: { fontSize: 14, fontWeight: 'bold', color: t.error },
    txAmountPos: { fontSize: 14, fontWeight: 'bold', color: t.primary },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: t.surface, borderRadius: 32, padding: 24, width: '100%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: t.onSurface, marginBottom: 24 },
    inputLabel: { fontSize: 12, fontWeight: 'bold', color: t.onSurfaceVariant, marginBottom: 8 },
    input: { backgroundColor: t.surfaceContainerLowest, borderRadius: 16, padding: 16, marginBottom: 16, color: t.onSurface },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    btnCancel: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: t.surfaceContainerHighest },
    btnSave: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: t.primary },

    walletSection: { marginBottom: 24, marginTop: 8 },
    walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    walletTitle: { fontSize: 16, fontWeight: 'bold', color: t.onSurface },
    walletSeeAll: { fontSize: 12, fontWeight: 'bold', color: t.primary },
    walletScroll: { paddingRight: 24 },
    walletCard: { backgroundColor: t.surfaceContainerLow, borderRadius: 20, padding: 16, marginRight: 12, minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: t.outlineVariant + '1A' },
    walletIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    walletInfo: { flex: 1 },
    walletName: { fontSize: 13, fontWeight: 'bold', color: t.onSurface },
    walletBalance: { fontSize: 11, fontWeight: 'bold', color: t.primary, marginTop: 2 },
    
    // Toast Styles
    toastContainer: {
      position: 'absolute',
      top: 60,
      left: 24,
      right: 24,
      zIndex: 9999,
      alignItems: 'center',
    },
    toastContent: {
      backgroundColor: t.surfaceContainerHighest,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
      borderWidth: 1,
      borderColor: t.outlineVariant + '33',
      maxWidth: '100%',
    },
    toastText: {
      color: t.onSurface,
      fontSize: 13,
      fontWeight: '600',
      flexShrink: 1,
    },
  });

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrapper}>
            {avatar?.startsWith('file://') || avatar?.startsWith('data:image') ? (
              <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <MaterialIcons name={avatar || 'person'} size={24} color={theme.primary} />
            )}
          </View>
          <Text style={styles.headerTitle}>{myName}</Text>
        </View>
        <TouchableOpacity onPress={handleOpenNotify}>
          <View>
            <MaterialIcons name="notifications-none" size={26} color={theme.primary} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: theme.error, borderRadius: 10, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: theme.surface }}>
                <Text style={{ color: theme.onError, fontSize: 9, fontWeight: 'bold' }}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollRef} 
        contentContainerStyle={styles.main} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.primary]} 
            tintColor={theme.primary} 
          />
        }
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroLabel}>Saldo kita</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.currency}>Rp</Text>
            <Text style={styles.balanceValue}>{formatMoney(currentBalance)}</Text>
          </View>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity style={filter === 'Kita' ? styles.toggleBtnActive : styles.toggleBtnInactive} onPress={() => setFilter('Kita')}>
              <Text style={filter === 'Kita' ? styles.toggleTextActive : styles.toggleTextInactive}>Kita</Text>
            </TouchableOpacity>
            <TouchableOpacity style={filter === 'Saya' ? styles.toggleBtnActive : styles.toggleBtnInactive} onPress={() => setFilter('Saya')}>
              <Text style={filter === 'Saya' ? styles.toggleTextActive : styles.toggleTextInactive}>{myName}</Text>
            </TouchableOpacity>
            {hasPartner ? (
              <TouchableOpacity style={filter === 'Pasangan' ? styles.toggleBtnActive : styles.toggleBtnInactive} onPress={() => setFilter('Pasangan')}>
                <Text style={filter === 'Pasangan' ? styles.toggleTextActive : styles.toggleTextInactive}>{partnerName}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.toggleBtnInactive} disabled>
                <Text style={[styles.toggleTextInactive, { opacity: 0.5 }]}>Menunggu...</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Wallets Section */}
        <View style={styles.walletSection}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletTitle}>Dompet Kita</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Wallets')}>
              <Text style={styles.walletSeeAll}>Kelola</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.walletScroll} 
            nestedScrollEnabled={true} 
            directionalLockEnabled={true}
            onScrollBeginDrag={() => navigation.setOptions({ swipeEnabled: false })}
            onScrollEndDrag={() => navigation.setOptions({ swipeEnabled: true })}
            onMomentumScrollEnd={() => navigation.setOptions({ swipeEnabled: true })}
            onTouchStart={() => navigation.setOptions({ swipeEnabled: false })}
            onTouchEnd={() => navigation.setOptions({ swipeEnabled: true })}
          >
            {filteredAccounts.length === 0 ? (
              filter === 'Pasangan' ? (
                <View style={[styles.walletCard, { backgroundColor: theme.surfaceContainerLow, minWidth: 180, justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialIcons name="account-balance-wallet" size={20} color={theme.onSurfaceVariant} style={{ opacity: 0.5 }} />
                  <Text style={[styles.walletName, { color: theme.onSurfaceVariant, textAlign: 'center', marginTop: 4 }]}>
                    {partnerName} belum punya dompet
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.walletCard, { borderStyle: 'dashed', borderColor: theme.primary, backgroundColor: 'transparent', minWidth: 180 }]}
                  onPress={() => navigation.navigate('AddAccount')}
                >
                  <View style={[styles.walletIcon, { backgroundColor: theme.primary + '1A' }]}>
                    <MaterialIcons name="add" size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.walletName, { color: theme.primary }]}>Tambah Dompet</Text>
                </TouchableOpacity>
              )
            ) : (
              filteredAccounts.map(acc => (
                <TouchableOpacity 
                  key={acc.id} 
                  style={styles.walletCard}
                  onPress={() => navigation.navigate('Wallets')}
                >
                  <View style={[styles.walletIcon, { backgroundColor: acc.color + '1A' }]}>
                    <MaterialIcons name={acc.icon || 'payments'} size={18} color={acc.color || theme.primary} />
                  </View>
                  <View style={styles.walletInfo}>
                    <Text style={styles.walletName} numberOfLines={1}>{acc.name}</Text>
                    <Text style={styles.walletBalance}>Rp {new Intl.NumberFormat('id-ID').format(acc.balance || 0)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.bentoRow}>
          <View style={styles.chartCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Pengeluaran</Text>
                <Text style={styles.cardBadge}>{timeFilter}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  onPress={() => exportToPDF(filteredTx, timeFilter, user?.name || 'User', { user: filter, type: 'Semua' }, accounts)} 
                  style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.primary + '1A', justifyContent: 'center', alignItems: 'center' }}
                >
                  <MaterialIcons name="picture-as-pdf" size={20} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => exportToXLS(filteredTx, timeFilter, user?.name || 'User', { user: filter, type: 'Semua' }, accounts)} 
                  style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.primary + '1A', justifyContent: 'center', alignItems: 'center' }}
                >
                  <MaterialIcons name="table-view" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginBottom: 16, marginTop: 4 }}
              onScrollBeginDrag={() => navigation.setOptions({ swipeEnabled: false })}
              onScrollEndDrag={() => navigation.setOptions({ swipeEnabled: true })}
              onMomentumScrollEnd={() => navigation.setOptions({ swipeEnabled: true })}
              onTouchStart={() => navigation.setOptions({ swipeEnabled: false })}
              onTouchEnd={() => navigation.setOptions({ swipeEnabled: true })}
            >
              {['Hari ini', 'Minggu ini', 'Bulan ini', 'Tahun ini', 'Semua Waktu'].map((period) => (
                <TouchableOpacity 
                  key={period} 
                  onPress={() => setTimeFilter(period)}
                  style={{ 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 20, 
                    backgroundColor: timeFilter === period ? theme.primaryContainer : 'transparent',
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: timeFilter === period ? theme.primary : theme.outlineVariant + '33'
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: timeFilter === period ? theme.onPrimaryContainer : theme.onSurfaceVariant }}>{period}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {segments.length > 0 ? (
              <>
                <View style={{ marginVertical: 16, alignItems: 'center', justifyContent: 'center', height: 160, position: 'relative' }}>
                  <Svg width="160" height="160" viewBox="0 0 150 150" style={{ transform: [{ rotate: '-90deg' }] }}>
                    {/* Track kosong */}
                    <Circle cx="75" cy="75" r="55" stroke={theme.surfaceContainer} strokeWidth="20" fill="transparent" />
                    {/* Segmen per kategori */}
                    {segments.map((seg, i) => (
                      <Circle
                        key={i}
                        cx="75"
                        cy="75"
                        r="55"
                        stroke={seg.color}
                        strokeWidth="19"
                        fill="transparent"
                        strokeDasharray={`${seg.dash - 2} ${seg.gap + 2}`}
                        strokeDashoffset={-seg.offset}
                        strokeLinecap="round"
                      />
                    ))}
                  </Svg>
                  <View style={styles.donutInner}>
                    <Text style={styles.donutLabel}>Total</Text>
                    <Text style={[styles.donutValue, { fontSize: 12 }]}>Rp {formatMoney(totalExpense)}</Text>
                  </View>
                </View>

                {/* Legend */}
                <View style={styles.legendContainer}>
                  {segments.map((seg, i) => (
                    <View key={i} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>{seg.cat}</Text>
                      <Text style={styles.legendPercent}>{Math.round((seg.amount / totalExpense) * 100)}%</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={{ height: 160, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: theme.onSurfaceVariant, fontSize: 12 }}>Belum ada pengeluaran dicatat</Text>
                <Text style={{ color: theme.onSurfaceVariant + '80', fontSize: 10 }}>Catat transaksi untuk melihat grafik</Text>
              </View>
            )}
          </View>

          {/* Goals Kita Section */}
          <View onLayout={(e) => setGoalsY(e.nativeEvent.layout.y)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, letterSpacing: -0.5 }}>Goals kita</Text>
                {hasPartner && totalActiveGoals > 0 && (
                  <View style={{ backgroundColor: theme.surfaceContainerHigh, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.onSurfaceVariant, textTransform: 'uppercase' }}>
                      {totalActiveGoals} aktif
                    </Text>
                  </View>
                )}
              </View>
              {hasPartner && totalActiveGoals > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('Goals')} activeOpacity={0.7}>
                  <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold' }}>Lihat Semua</Text>
                </TouchableOpacity>
              )}
            </View>

            {!hasPartner ? (
              <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: theme.primary + '33' }}>
                <Text style={{ color: theme.onSurfaceVariant, fontSize: 12, textAlign: 'center' }}>
                  Menunggu pasangan bergabung sebelum memulai mimpi.
                </Text>
              </View>
            ) : activeGoals.length > 0 ? (
              <>
                <View style={{ gap: 12 }}>
                  {activeGoals.map(goal => {
                    const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount || 0) / goal.targetAmount * 100, 100) : 0;
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
                        activeOpacity={0.8}
                        style={{ flexDirection: 'row', backgroundColor: theme.surfaceContainerLow, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.outlineVariant + '22', alignItems: 'center' }}
                      >
                        <View style={{ width: 88, height: 88, backgroundColor: theme.surfaceContainer }}>
                          {goal.previewImage ? (
                            <Image source={{ uri: goal.previewImage }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                              <MaterialIcons name="savings" size={28} color={theme.primary + '99'} />
                            </View>
                          )}
                        </View>
                        <View style={{ padding: 14, flex: 1, justifyContent: 'center' }}>
                          <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface, marginBottom: 8 }} numberOfLines={1}>{goal.name}</Text>
                          <View style={{ height: 6, backgroundColor: theme.surfaceContainerHighest, borderRadius: 3, marginBottom: 8 }}>
                            <View style={{ height: '100%', width: `${progress}%`, backgroundColor: theme.primary, borderRadius: 3 }} />
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.primary }}>Rp {formatMoney(goal.currentAmount)}</Text>
                            <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>Rp {formatMoney(goal.targetAmount)}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {totalActiveGoals > 2 && (
                  <TouchableOpacity onPress={() => navigation.navigate('Goals')} style={{ marginTop: 8 }}>
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                      + {totalActiveGoals - 2} goals lainnya
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={{ backgroundColor: theme.primaryContainer + '33', borderRadius: 32, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: theme.primary + '33' }}>
                <MaterialIcons name="savings" size={40} color={theme.primary + '88'} />
                <Text style={{ color: theme.onSurface, fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>Belum ada goals</Text>
                <Text style={{ color: theme.onSurfaceVariant, fontSize: 12, marginBottom: 16, textAlign: 'center' }}>
                  Mulai wujudkan impian bersama
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Goals')} style={{ backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                  <Text style={{ color: theme.onPrimary, fontWeight: 'bold', fontSize: 12 }}>Buat Goal Pertama</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Bills */}
        <View style={styles.billsSection} onLayout={(e) => setBillsY(e.nativeEvent.layout.y)}>
          <View style={[styles.recentHeader, { marginTop: 8 }]}>
            <Text style={styles.recentTitle}>Pengingat Tagihan</Text>
          </View>
          
          {bills.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.billsScroll}>
              {bills.map(bill => {
                let dynamicDaysLeft = bill.daysLeft;
                if (bill.dueDate) {
                  const diffTime = new Date(bill.dueDate).getTime() - Date.now();
                  dynamicDaysLeft = Math.ceil(diffTime / (1000 * 3600 * 24));
                }
                const isHighlighted = highlightedId === bill.id;
                const bgColor = highlightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['transparent', theme.primary + '33'],
                });
                return (
                  <Animated.View key={bill.id} style={[{ borderRadius: 24 }, isHighlighted && { backgroundColor: bgColor }]}>
                    <TouchableOpacity style={[styles.billCard, dynamicDaysLeft <= 3 && styles.billCardUrgent]} activeOpacity={0.8} onPress={() => handleBillClick(bill)}>
                      <View style={styles.billHeader}>
                        <View style={styles.billIconBg}><MaterialIcons name="receipt-long" size={16} color={dynamicDaysLeft <= 3 ? theme.primary : theme.onSurfaceVariant} /></View>
                        <Text style={[styles.billBadge, dynamicDaysLeft <= 3 ? styles.billBadgeUrgent : styles.billBadgeOk]}>{dynamicDaysLeft} HARI</Text>
                      </View>
                      <Text style={styles.billTitle}>{bill.name}</Text>
                      <Text style={styles.billPrice}>Rp {formatMoney(bill.amount)}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={{ color: theme.onSurfaceVariant, fontSize: 12 }}>Belum ada tagihan tersimpan.</Text>
          )}
        </View>

        {/* Dynamic Recent Transactions */}
        <View style={{ marginBottom: 40, marginTop: 24 }} onLayout={(e) => setRecentY(e.nativeEvent.layout.y)}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Update terakhir</Text>
          </View>

          {filteredTx.slice(0, 5).map((tx) => {
            const isHighlighted = highlightedId === tx.id || highlightedId === tx.name;
            const bgColor = highlightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [theme.surfaceContainer, theme.primary + '55'],
            });
            return (
              <TouchableOpacity 
                key={tx.id} 
                activeOpacity={0.7}
                onPress={() => {
                  if (tx.owner === user?.name) {
                    setSelectedRecentTx(tx);
                    setTxActionModalVisible(true);
                  }
                }}
              >
                <Animated.View style={[styles.txItem, { backgroundColor: isHighlighted ? bgColor : theme.surfaceContainer }]}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIconBg}>
                      <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'payments' : tx.type === 'transfer' ? 'swap-horiz' : 'shopping-bag')} size={24} color={tx.type === 'transfer' ? '#6366F1' : theme.primary} />
                    </View>
                    <View>
                      <Text style={styles.txName}>{tx.name}</Text>
                      <View style={styles.txMeta}>
                        <Text style={styles.txBadge}>{tx.category}</Text>
                        <View style={styles.txWallet}>
                          <MaterialIcons name="account-balance-wallet" size={10} color={theme.onSurfaceVariant} />
                          <Text style={styles.txWalletName}>
                            {(() => {
                              const acc = (accounts || []).find(a => a.id === tx.accountId || a.id === tx.fromAccountId);
                              return acc ? acc.name : 'Tunai';
                            })()}
                          </Text>
                        </View>
                        <Text style={styles.txTime}>{(new Date(tx.date).toString() !== 'Invalid Date' ? new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-')}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[tx.type === 'income' ? styles.txAmountPos : tx.type === 'transfer' ? { color: '#6366F1', fontSize: 14, fontWeight: 'bold' } : styles.txAmountNeg]}>
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '⇅' : '-'} {formatMoney(tx.myContrib + tx.partnerContrib)}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
          {filteredTx.length === 0 && (
            <Text style={{ textAlign: 'center', color: theme.onSurfaceVariant, marginTop: 16 }}>Belum ada mutasi dicatat</Text>
          )}
        </View>
      </ScrollView>

      {/* FAB Multi-Action */}
      {fabOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleFab}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
        />
      )}
      <View style={styles.fabContainer} pointerEvents="box-none">
        {fabActions.map((action, i) => {
          const translateY = fabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(68 * (i + 1))],
          });
          const opacity = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
          const scale = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
          return (
            <Animated.View key={action.key} style={[styles.fabItem, { transform: [{ translateY }, { scale }], opacity }]}>
              <TouchableOpacity onPress={() => handleFabAction(action.key)} style={styles.fabItemRow}>
                <Text style={styles.fabLabel}>{action.label}</Text>
                <View style={[styles.fabMini, { backgroundColor: action.color }]}>
                  <MaterialIcons name={action.icon} size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        <TouchableOpacity onPress={toggleFab} style={styles.fabMain} activeOpacity={0.85}>
          <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.fabGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Animated.View style={{
              transform: [{ rotate: fabAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg', '45deg'] }) }]
            }}>
              <MaterialIcons name="add" size={28} color="#fff" />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Bill Modal */}
      <Modal visible={billModalVisible} transparent animationType="slide" onRequestClose={() => { setBillModalVisible(false); setIsEditingBill(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditingBill ? 'Edit Tagihan' : 'Tambah Tagihan'}</Text>
            
            <Text style={styles.inputLabel}>Nama Tagihan</Text>
            <TextInput style={styles.input} placeholder="Misal: Listrik" placeholderTextColor={theme.onSurfaceVariant} value={billName} onChangeText={setBillName} />
            
            <Text style={styles.inputLabel}>Nominal (Rp)</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="numeric" placeholderTextColor={theme.onSurfaceVariant} value={billAmount} onChangeText={setBillAmount} />
            
            <Text style={styles.inputLabel}>Sisa Hari Jatuh Tempo</Text>
            <TextInput style={styles.input} placeholder="Misal: 14" keyboardType="numeric" placeholderTextColor={theme.onSurfaceVariant} value={billDays} onChangeText={setBillDays} />
            
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setBillModalVisible(false); setIsEditingBill(false); }}>
                <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSaveBill}>
                <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bill Action Modal */}
      <Modal visible={billActionModalVisible} transparent animationType="fade" onRequestClose={() => setBillActionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBillActionModalVisible(false)}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '33' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 4 }}>Kelola Tagihan</Text>
              <Text style={{ fontSize: 13, color: theme.onSurfaceVariant }}>{selectedBill?.name} - Rp {formatMoney(selectedBill?.amount)}</Text>
            </View>
            <View style={{ padding: 8 }}>
              <TouchableOpacity onPress={handleMarkPaid} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary + '1A', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="check-circle" size={20} color={theme.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface }}>Tandai Lunas</Text>
                  <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Tandai tagihan ini sudah dibayar</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleEditBill} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="edit" size={20} color={theme.onSurfaceVariant} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface }}>Edit Tagihan</Text>
                  <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Ubah nominal atau tanggal</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleRemindBill} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.error + '1A', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="bolt" size={20} color={theme.error} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface }}>Ingatkan Pasangan</Text>
                  <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Kirim notifikasi peringatan</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDeleteBill} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="delete" size={20} color={theme.error} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.error }}>Hapus Tagihan</Text>
                  <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Hapus tanpa mencatat</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 24 }]}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 12, textAlign: 'center' }}>{confirmConfig.title}</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>{confirmConfig.message}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: theme.surfaceContainerHighest, padding: 16, borderRadius: 16, alignItems: 'center' }} 
                onPress={() => {
                  if (confirmConfig.onCancel) confirmConfig.onCancel();
                  else setConfirmVisible(false);
                }}
              >
                <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>{confirmConfig.cancelText || 'Batal'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: confirmConfig.confirmColor || theme.primary, padding: 16, borderRadius: 16, alignItems: 'center' }} 
                onPress={confirmConfig.onConfirm}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{confirmConfig.confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Popover */}
      <Modal visible={notifyVisible} transparent animationType="fade" onRequestClose={() => setNotifyVisible(false)}>
        <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} onPress={() => setNotifyVisible(false)}>
          <View style={{ alignItems: 'flex-end', paddingTop: 65, paddingRight: 20 }}>
            <View style={{ width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: theme.surface, marginRight: 10 }} />
            <TouchableOpacity activeOpacity={1} style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 20, width: Dimensions.get('window').width * 0.88, maxHeight: Dimensions.get('window').height * 0.65, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: theme.onSurface, letterSpacing: -0.5 }}>Pemberitahuan</Text>
                <TouchableOpacity onPress={() => setNotifyVisible(false)} style={{ padding: 6, backgroundColor: theme.surfaceContainerHighest, borderRadius: 16 }}>
                  <MaterialIcons name="close" size={16} color={theme.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {displayNotifs.length > 0 ? displayNotifs.map(notif => (
                  <TouchableOpacity
                    key={notif.id}
                    activeOpacity={0.7}
                    onPress={() => handleNotifClick(notif)}
                    style={{ flexDirection: 'row', gap: 12, marginBottom: 20, backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 12 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme[notif.color] + '1A', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                      <MaterialIcons name={notif.icon} size={20} color={theme[notif.color]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontSize: 13, color: theme.onSurface, fontWeight: 'bold' }}>{notif.title}</Text>
                        <MaterialIcons name="chevron-right" size={16} color={theme.onSurfaceVariant} />
                      </View>
                      <Text style={{ fontSize: 12, color: theme.onSurfaceVariant, lineHeight: 18 }}>{notif.body}</Text>
                      <Text style={{ fontSize: 9, color: theme.primary, marginTop: 6, fontWeight: 'bold', letterSpacing: 0.5 }}>{(new Date(notif.createdAt).toString() !== 'Invalid Date' ? new Date(notif.createdAt).toLocaleDateString('id-ID') : '-')}</Text>
                    </View>
                  </TouchableOpacity>
                )) : (
                  <Text style={{ textAlign: 'center', color: theme.onSurfaceVariant, padding: 20 }}>Belum ada notifikasi baru.</Text>
                )}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transaction Action Modal */}
      <Modal visible={txActionModalVisible} transparent animationType="fade" onRequestClose={() => setTxActionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTxActionModalVisible(false)}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '33' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 4 }}>Kelola Transaksi</Text>
              <Text style={{ fontSize: 13, color: theme.onSurfaceVariant }}>{selectedRecentTx?.name} - Rp {formatMoney((selectedRecentTx?.myContrib || 0) + (selectedRecentTx?.partnerContrib || 0))}</Text>
            </View>
            <View style={{ padding: 8 }}>
              <TouchableOpacity 
                onPress={() => {
                  setTxActionModalVisible(false);
                  if (selectedRecentTx.type === 'transfer') {
                    navigation.navigate('Transfer', { editingTransaction: selectedRecentTx });
                  } else {
                    navigation.navigate('Transaksi', { editingTransaction: selectedRecentTx });
                  }
                }} 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary + '1A', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="edit" size={20} color={theme.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface }}>Edit Transaksi</Text>
                  <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Ubah nominal, kategori, atau dompet</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => {
                  setTxActionModalVisible(false);
                  setTimeout(() => setTxConfirmVisible(true), 300);
                }} 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.error + '1A', justifyContent: 'center', alignItems: 'center' }}>
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

      {/* Confirm Delete Transaction Modal */}
      <Modal visible={txConfirmVisible} transparent animationType="fade" onRequestClose={() => setTxConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 24 }]}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 12, textAlign: 'center' }}>Hapus Transaksi?</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>
              Yakin ingin menghapus transaksi ini? Saldo dompet Anda akan disesuaikan secara otomatis.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: theme.surfaceContainerHighest, padding: 16, borderRadius: 16, alignItems: 'center' }} 
                onPress={() => setTxConfirmVisible(false)}
              >
                <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: theme.error, padding: 16, borderRadius: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }} 
                onPress={async () => {
                  setLoading(true);
                  try {
                    await deleteTransaction(selectedRecentTx.id);
                    setTxConfirmVisible(false);
                  } catch (e) {
                    // console.error(e);
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

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toastContainer, 
            { 
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.toastContent}>
            <MaterialIcons name="bolt" size={20} color={theme.primary} />
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default DashboardScreen;
