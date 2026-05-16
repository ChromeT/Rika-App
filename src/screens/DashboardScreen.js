import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import TextInput from '../components/ThemeTextInput';
import { View, StyleSheet, TouchableOpacity, Dimensions, Modal, Image, Alert, Animated, ActivityIndicator, RefreshControl, Platform, Text as RNText } from 'react-native';
import Text from '../components/ThemeText';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { exportToXLS, exportToPDF } from '../utils/exportUtils';
import Svg, { Circle, G } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatMoney } from '../utils/formatUtils';
import { getShadow } from '../utils/styleUtils';
import { styles, fabActions } from './DashboardStyles';
import { 
  DashboardHeader, 
  HeroSection, 
  PendingSplitsSection, 
  WalletsSection, 
  ExpenseAnalysisSection, 
  BillsSection, 
  GoalsSection, 
  RecentActivitiesSection 
} from '../components/dashboard/DashboardSections';

const { width } = Dimensions.get('window');

/**

 * --- RIKA-APP: DASHBOARD SCREEN ---
 * Ini adalah 'Otak' sekaligus 'Wajah' utama aplikasi Rika-App.
 * 
 * Kenapa file ini panjang? Karena Dashboard ini handle banyak fitur sekaligus:
 * 1. Ringkasan Saldo (Kita, Saya, Pasangan)
 * 2. Analisis Pengeluaran (Donut Chart & Legend)
 * 3. Manajemen Tagihan (Bills)
 * 4. Progres Goals (Goal kita)
 * 5. Aktivitas Terakhir (Transactions)
 * 
 * Keputusan Arsitektur: 
 * - Kita pake Context (Theme, Data, Auth) biar data sinkron antar screen tanpa ribet passing props.
 * - Kita pake banyak Animated.View biar transisinya halus pas user scroll atau ganti filter.
 */

// UI Components are now imported from src/components/dashboard/DashboardSections.js

const DashboardScreen = ({ navigation, route }) => {



  // --- [KONTEKS & INSETS] ---
  // insets: Buat handle area 'poni' iPhone atau navbar Android biar nggak nabrak.
  const safeAreaInsets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const themeCtx = useContext(ThemeContext);
  const dataCtx = useContext(DataContext);
  const authCtx = useContext(AuthContext);

  // Fallback theme: Biar kalo Context-nya macet, aplikasi nggak langsung crash (layar putih).
  const theme = themeCtx?.theme || { background: '#0b0f10', surface: '#0b0f10', primary: '#b2cad3', onSurface: '#dde7eb', surfaceContainerLow: '#151a1c', onPrimary: '#000', onError: '#fff', onSurfaceVariant: '#a0acb0', outlineVariant: '#2d3538' };
  
  // Destructuring Data: Kita ambil semua fungsi sakti dari DataContext.
  const { 
    transactions = [], getBalance = () => 0, bills = [], 
    addBill, updateBill, deleteBill, payBill, 
    notifications = [], addNotification, goals = [], 
    accounts = [], deleteTransaction, updateTransaction, 
    confirmSplitTransaction,
    markSingleNotifAsRead, markAllNotificationsAsRead
  } = dataCtx || {};
  const { user, householdUsers = [], avatar } = authCtx || {};
  
  // --- [STATE: FILTERING] ---
  // filter: 'Kita' (gabungan), 'Saya', atau 'Pasangan'.
  const [filter, setFilter] = useState('Kita');
  const [timeFilter, setTimeFilter] = useState('Bulan ini');
  const [customStartDate, setCustomStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // --- [STATE: MODALS & UI FLOW] ---
  const [notifyVisible, setNotifyVisible] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [billActionModalVisible, setBillActionModalVisible] = useState(false);
  const [payBillModalVisible, setPayBillModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [isQuickEditVisible, setIsQuickEditVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  
  // --- [STATE: DATA ENTRY (BILLS & EDITS)] ---
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [billType, setBillType] = useState('one-time'); 
  const [billTotalTenor, setBillTotalTenor] = useState('12');
  const [billIcon, setBillIcon] = useState('favorite');
  const [billColor, setBillColor] = useState('#6366F1');
  const [selectedPayAccountId, setSelectedPayAccountId] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({});
  const [aestheticAlertVisible, setAestheticAlertVisible] = useState(false);
  const [aestheticAlertConfig, setAestheticAlertConfig] = useState({ title: '', message: '', icon: 'info', color: '#6366F1' });

  const showAestheticAlert = (title, message, icon = 'info', color = '#6366F1') => {
    setAestheticAlertConfig({ title, message, icon, color });
    setAestheticAlertVisible(true);
  };
  const [loading, setLoading] = useState(false);
  const [selectedSplitTx, setSelectedSplitTx] = useState(null);
  const [selectedSplitAccountId, setSelectedSplitAccountId] = useState(null);
  const [quickEditTx, setQuickEditTx] = useState(null);
  const [quickEditName, setQuickEditName] = useState('');
  const [quickEditAmount, setQuickEditAmount] = useState('');
  const [quickEditAccountId, setQuickEditAccountId] = useState(null);
  const quickSelectionRef = useRef({ start: 0, end: 0 });
  const [quickSelectionState, setQuickSelectionState] = useState({ start: 0, end: 0 });
  const quickAmountRef = useRef('');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset filters to default
    setFilter('Kita');
    setTimeFilter('Bulan ini');
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const billDateInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    Animated.sequence([
      Animated.spring(toastAnim, { 
        toValue: 1, 
        tension: 40, 
        friction: 7, 
        useNativeDriver: Platform.OS !== 'web' 
      }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { 
        toValue: 0, 
        duration: 300, 
        useNativeDriver: Platform.OS !== 'web' 
      })
    ]).start(() => setToastVisible(false));
  };

  const scrollRef = useRef(null);
  const itemLayouts = useRef({});
  const sectionLayouts = useRef({ pending: 0, bills: 0, goals: 0, recent: 0, expense: 0 });
  const horizontalScrollRef = useRef(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;

  const triggerHighlight = (id) => {
    setHighlightedId(id);
    highlightAnim.setValue(0);
    
    // Auto scroll logic
    const layout = itemLayouts.current[id];
    if (layout && scrollRef.current) {
      // Calculate absolute Y dynamically
      const absoluteY = layout.localY + (sectionLayouts.current[layout.section] || 0);
      // Offset -100 places the item at the very top of the visible area for maximum readability.
      // We use a large paddingBottom to ensure even items at the end can reach this position.
      scrollRef.current.scrollTo({ y: Math.max(0, absoluteY - 100), animated: true });
    }

    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.delay(1200),
      Animated.timing(highlightAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start(() => setHighlightedId(null));
  };

  // Listen untuk klik tab "Beranda" pas lagi di dalam Beranda
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      if (navigation.isFocused()) {
        // Scroll to top
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        // Trigger refresh and reset filters
        onRefresh();
      }
    });
    return unsubscribe;
  }, [navigation, onRefresh]);

  const handleNotifClick = (notif) => {
    if (!notif) return;
    setNotifyVisible(false);
    
    // Mark as read when clicked
    if (markSingleNotifAsRead && notif.id) {
      markSingleNotifAsRead(notif.id);
    }
    
    // Deep ID extraction (support all variants)
    const rawId = notif.targetId || notif.txId || notif.transactionId || notif.id;
    const targetId = rawId ? String(rawId) : null;
    
    // Smart Name Parsing
    let targetName = notif.targetName || notif.name || null;
    if (!targetName && (notif.body || notif.message)) {
      const content = notif.body || notif.message;
      const match = content.match(/"([^"]+)"/);
      if (match) targetName = match[1];
    }

    const type = notif.type || notif.targetType;
    const title = notif.title?.toLowerCase() || '';

    // Advanced routing based on notification payload
    if ((type === 'goal' || title.includes('goal') || title.includes('dana')) && targetId) {
      const goalData = Array.isArray(goals) ? goals.find(g => String(g.id) === targetId) : null;
      if (goalData?.achieved || goalData?.status === 'achieved') {
        navigation.navigate('MemoryDetail', { goalId: targetId });
      } else {
        navigation.navigate('GoalDetail', { goalId: targetId });
      }
    } else if (type === 'bill' || title.includes('tagihan') || title.includes('bayar') || title.includes('lunas')) {
      if (targetId && itemLayouts.current[targetId]) {
        triggerHighlight(targetId);
      } else if (targetId || targetName) {
        // If not found on dashboard, check history (maybe it's a paid bill transaction)
        navigation.navigate('Riwayat', { highlightId: targetId, highlightName: targetName });
      } else {
        // Just scroll to bills section if possible (using a known y or just navigation)
        navigation.navigate('Beranda'); 
      }
    } else if (type === 'split_pending' || title.includes('konfirmasi')) {
      const pendingKey = `pending_${targetId}`;
      if (targetId && itemLayouts.current[pendingKey]) {
        triggerHighlight(pendingKey);
      } else {
        // Fallback: Scroll to the entire pending section header if specific item not found
        scrollRef.current?.scrollTo({ y: Math.max(0, sectionLayouts.current.pending - 100), animated: true });
      }
    } else if (type === 'transaction' || title.includes('transaksi') || title.includes('pemasukan') || title.includes('disetujui') || title.includes('patungan')) {
      const recentKey = `recent_${targetId}`;
      if (targetId && itemLayouts.current[recentKey]) {
        triggerHighlight(recentKey);
      } else if (targetId || targetName) {
        navigation.navigate('Riwayat', { highlightId: targetId, highlightName: targetName });
      } else {
        navigation.navigate('Riwayat');
      }
    } else if (targetId || targetName) {
      if (targetId && itemLayouts.current[targetId]) triggerHighlight(targetId);
      else navigation.navigate('Riwayat', { highlightId: targetId, highlightName: targetName });
    } else {
      navigation.navigate('Riwayat');
    }
  };
  
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // Entrance Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sectionsAnim = useRef([...Array(7)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = sectionsAnim.map((anim, index) => 
      Animated.spring(anim, { toValue: 1, delay: index * 80, useNativeDriver: Platform.OS !== 'web', tension: 50, friction: 8 })
    );
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      Animated.stagger(80, animations)
    ]).start();
  }, []);


  const myName = user?.name || 'Ayip';
  const partnerName = householdUsers?.find(u => u !== myName);
  const hasPartner = !!partnerName;



  // Filtered Data
  const filteredTx = (transactions || []).filter(tx => {
    if (!tx) return false;
    const txDate = new Date(tx.date);
    const today = new Date();
    today.setHours(23,59,59,999);
    
    let timeMatch = true;
    if (timeFilter === 'Hari ini') {
      timeMatch = txDate.toDateString() === today.toDateString();
    } else if (timeFilter === 'Minggu ini') {
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      lastWeek.setHours(0,0,0,0);
      timeMatch = txDate >= lastWeek;
    } else if (timeFilter === 'Bulan ini') {
      timeMatch = txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
    } else if (timeFilter === 'Tahun ini') {
      timeMatch = txDate.getFullYear() === today.getFullYear();
    } else if (timeFilter === 'Kustom') {
      const start = new Date(customStartDate); start.setHours(0,0,0,0);
      const end = new Date(customEndDate); end.setHours(23,59,59,999);
      timeMatch = txDate >= start && txDate <= end;
    } else if (timeFilter === 'Semua Waktu') {
      timeMatch = true;
    }
    
    let userMatch = true;
    if (filter === 'Kita') {
      userMatch = true;
    } else {
      // Muncul jika owner transaksi adalah filter (Saya/Pasangan)
      // ATAU jika itu transaksi patungan/uang bersama (isPatungan/isJoint)
      const isShared = tx.isPatungan || tx.isJoint;
      if (filter === 'Ayip' || filter === myName) {
        const owner = (tx.owner || '').toLowerCase().trim();
        const normMe = (myName || '').toLowerCase().trim();
        const isMe = owner === normMe || owner.includes(normMe) || normMe.includes(owner);
        userMatch = isMe || (isShared && (tx.myContrib || 0) > 0);
      } else {
        userMatch = tx.owner === filter || (isShared && (tx.partnerContrib || 0) > 0);
      }
    }
    
    return timeMatch && userMatch;
  });

  const expenseTx = filteredTx.filter(tx => tx.type === 'expense');
  const totalExpense = expenseTx.reduce((sum, tx) => sum + (tx.myContrib + tx.partnerContrib), 0);

  const pendingSplits = (transactions || []).filter(tx => 
    tx.status === 'pending_partner' && tx.owner !== myName
  );
  const categoryMap = {};
  expenseTx.forEach(tx => {
    const cat = tx.category || 'Lainnya';
    categoryMap[cat] = (categoryMap[cat] || 0) + (tx.myContrib + tx.partnerContrib);
  });
  const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const RADIUS = 50;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  /**
   * segments (Donut Chart Logic)
   * Di sinilah "sihir" grafik donat terjadi.
   * Kita ngambil data pengeluaran yang udah difilter, terus kita ubah jadi
   * array 'segments' yang berisi warna, dash (buat Svg), dan persentase.
   */
  const segments = sortedCategories.map(([cat, amount], i) => {

    const ratio = totalExpense > 0 ? amount / totalExpense : 0;
    return { cat, amount, dash: ratio * CIRCUMFERENCE, color: ['#A78BFA', '#F472B6', '#34D399', '#FB923C', '#60A5FA'][i % 5] };
  });

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnim, { toValue, useNativeDriver: Platform.OS !== 'web', bounciness: 8 }).start();
    setFabOpen(!fabOpen);
  };

  const handleFabAction = (action) => {
    toggleFab();
    setTimeout(() => {
      if (action === 'pengeluaran') navigation.navigate('Transaksi', { type: 'expense' });
      else if (action === 'pemasukan') navigation.navigate('Transaksi', { type: 'income' });
      else if (action === 'transfer') navigation.navigate('Transfer');
      else if (action === 'goals') navigation.navigate('Goals');
      else if (action === 'tagihan') { resetBillForm(); setBillModalVisible(true); }
    }, 200);
  };

  const openQuickEdit = (tx) => {
    // PROTEKSI: Cek kepemilikan transaksi
    if (tx.owner !== user.name) {
      showAestheticAlert('Akses Terbatas', 
        `Transaksi ini dicatat oleh ${tx.owner}. Kamu hanya bisa mengedit transaksi milikmu sendiri untuk menjaga integritas data pribadi Rika.` ,
        'lock', theme.primary);
      return;
    }
    
    const formatted = formatInput((tx.amount || 0).toString());
    setQuickEditTx(tx);
    setQuickEditName(tx.name);
    setQuickEditAmount(formatted);
    quickAmountRef.current = formatted;
    setQuickEditAccountId(tx.type === 'transfer' ? tx.fromAccountId : tx.accountId);
    setQuickSelectionState({ start: formatted.length, end: formatted.length });
    quickSelectionRef.current = { start: formatted.length, end: formatted.length };
    setIsQuickEditVisible(true);
  };

  const handleSaveQuickEdit = async () => {
    if (!quickEditTx) return;
    setLoading(true);
    try {
      const numAmount = Number(quickEditAmount.replace(/\./g, '')) || 0;
      let fMy = numAmount;
      let fPar = 0;
      if (quickEditTx.isJoint) {
        fMy = numAmount / 2;
        fPar = numAmount / 2;
      }
      await updateTransaction(quickEditTx.id, {
        name: quickEditName,
        amount: numAmount,
        myContrib: fMy,
        partnerContrib: fPar,
        accountId: quickEditAccountId
      });
      setIsQuickEditVisible(false);
      showToast('Transaksi diperbarui!');
    } catch (e) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat memperbarui transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuickEdit = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!quickEditTx) return;
    setLoading(true);
    try {
      await deleteTransaction(quickEditTx.id);
      setDeleteConfirmVisible(false);
      setIsQuickEditVisible(false);
      showToast('Transaksi dihapus');
    } catch (e) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus.');
    } finally {
      setLoading(false);
    }
  };

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '').toString();
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleQuickAmountChange = (val) => {
    const oldText = quickAmountRef.current || '';
    const oldSel = quickSelectionRef.current.start;
    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');
    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = oldText.slice(0, oldSel - 2) + oldText.slice(oldSel);
    }
    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setQuickEditAmount(formatted);
    quickAmountRef.current = formatted;
    let newPos = formatted.length;
    let count = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (count >= digitsAfter) break;
      if (formatted[i] !== '.') {
        count++;
      }
      newPos = i;
    }
    setQuickSelectionState({ start: newPos, end: newPos });
    quickSelectionRef.current = { start: newPos, end: newPos };
  };

  const resetBillForm = () => {
    setIsEditingBill(false);
    setBillName('');
    setBillAmount('');
    billAmountRef.current = '';
    setSelectionBill({ start: 0, end: 0 });
    selectionBillRef.current = { start: 0, end: 0 };
    setBillDueDate(new Date());
    setBillType('one-time');
    setBillTotalTenor('12');
    setBillIcon('favorite');
    setBillColor('#6366F1');
  };

  const billAmountRef = useRef('');
  const selectionBillRef = useRef({ start: 0, end: 0 });
  const [selectionBill, setSelectionBill] = useState({ start: 0, end: 0 });

  const billIcons = [
    { name: 'favorite', label: 'Umum' },
    { name: 'favorite-border', label: 'Hati' },
    { name: 'volunteer-activism', label: 'Kasih' },
    { name: 'health-and-safety', label: 'Kesehatan' },
    { name: 'home', label: 'Sewa/KPR' },
    { name: 'directions-car', label: 'Kendaraan' },
    { name: 'school', label: 'Pendidikan' },
    { name: 'shopping-cart', label: 'Cicilan' },
    { name: 'star', label: 'Premium' },
  ];

  const billColors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4'];

  const handleBillAmountChange = (val) => {
    const oldText = billAmountRef.current || '';
    const oldSel = selectionBillRef.current.start;
    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');
    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = oldText.slice(0, oldSel - 2) + oldText.slice(oldSel);
    }
    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setBillAmount(formatted);
    billAmountRef.current = formatted;
    let newPos = formatted.length;
    let count = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (count >= digitsAfter) break;
      if (formatted[i] !== '.') {
        count++;
      }
      newPos = i;
    }
    setSelectionBill({ start: newPos, end: newPos });
    selectionBillRef.current = { start: newPos, end: newPos };
  };

  const handleSaveBill = async () => {
    if (!billName || !billAmount || !billDueDate) return;
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const targetDate = new Date(billDueDate);
      targetDate.setHours(0,0,0,0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const dueDate = billDueDate.toISOString();
      const rawAmount = billAmount.replace(/\./g, '');
      const numAmount = Number(rawAmount);
      
      const billData = {
        name: billName,
        amount: numAmount,
        dueDate,
        daysUntil: numDays,
        type: billType,
        icon: billIcon,
        color: billColor,
        totalTenor: billType === 'installment' ? Number(billTotalTenor) : 1,
        currentTenor: isEditingBill ? selectedBill.currentTenor : 1,
      };

      if (isEditingBill) {
        await updateBill(selectedBill.id, billData);
        addNotification({
          title: 'Tagihan Diperbarui',
          body: `${myName} mengubah detail tagihan "${billName}".`,
          icon: 'favorite',
          color: 'primary',
          sender: myName,
          targetType: 'bill',
          targetId: selectedBill.id,
        });
      } else {
        const newBillId = await addBill(billData);
        addNotification({
          title: 'Tagihan Baru',
          body: `${myName} menambahkan tagihan baru: "${billName}" sebesar Rp ${formatMoney(numAmount)}.`,
          icon: billIcon,
          color: 'primary',
          sender: myName,
          targetType: 'bill',
          targetId: newBillId,
        });
      }
      resetBillForm();
      setBillModalVisible(false);
      showToast(isEditingBill ? 'Tagihan diperbarui' : 'Tagihan ditambahkan');
    } catch (e) {
      Alert.alert('Gagal', 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBill = () => {
    setBillActionModalVisible(false);
    setIsEditingBill(true);
    setBillName(selectedBill.name);
    const formatted = formatMoney(selectedBill.amount);
    setBillAmount(formatted);
    billAmountRef.current = formatted;
    setBillType(selectedBill.type || 'one-time');
    setBillTotalTenor(String(selectedBill.totalTenor || '12'));
    setBillIcon(selectedBill.icon || 'favorite');
    setBillColor(selectedBill.color || '#6366F1');
    setBillDueDate(new Date(selectedBill.dueDate || Date.now()));
    setTimeout(() => setBillModalVisible(true), 300);
  };

  /**
   * handleDeleteBill
   * Fungsi untuk menghapus tagihan.
   * Kenapa pake setTimeout? Biar animasi modal nutup selesai dulu sebelum modal konfirmasi muncul.
   */
  const handleDeleteBill = () => {
    setBillActionModalVisible(false);
    setTimeout(() => {
      setConfirmConfig({
        title: 'Hapus Tagihan',
        message: 'Yakin ingin menghapus tagihan ini? Data ini nggak bisa dikembalikan lho.',
        onConfirm: async () => {
          await deleteBill(selectedBill.id);
          setConfirmVisible(false);
          showToast('Tagihan dihapus');
        }
      });
      setConfirmVisible(true);
    }, 300);
  };

  const handleMarkPaid = () => {
    setBillActionModalVisible(false);
    setPayBillModalVisible(true);
  };

  /**
   * handleConfirmPayment
   * Fungsi 'final' buat bayar tagihan.
   * Alurnya: Cek dompet -> Panggil payBill (Firestore) -> Tutup modal -> Kasih feedback.
   */
  const handleConfirmPayment = async () => {
    if (!selectedPayAccountId) return;
    setLoading(true);
    try {
      await payBill(selectedBill.id, selectedPayAccountId);
      setPayBillModalVisible(false);
      showToast(`Tagihan "${selectedBill.name}" lunas!`);
    } catch (e) {
      Alert.alert('Gagal', 'Gagal memproses pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemindBill = () => {
    if (!selectedBill || !hasPartner) return;
    setBillActionModalVisible(false);
    addNotification({
      title: 'Pengingat Tagihan',
      body: `${myName} mengingatkan: "${selectedBill.name}" belum lunas!`,
      icon: 'favorite',
      color: 'error',
      sender: myName,
      targetType: 'bill',
      targetId: selectedBill.id,
    });
    showToast('Pengingat dikirim!');
  };

  /**
   * handleConfirmSplit
   * Fungsi buat setujuin transaksi patungan dari pasangan.
   * Kenapa selectedSplitAccountId perlu? Karena kita harus milih duitnya mau 
   * dipotong dari dompet kita yang mana.
   */
  const handleConfirmSplit = async () => {
    if (!selectedSplitAccountId) return;
    setLoading(true);
    try {
      await confirmSplitTransaction(selectedSplitTx.id, selectedSplitAccountId);
      setSplitModalVisible(false);
      showToast('Patungan dikonfirmasi!');
    } catch (e) {
      Alert.alert('Gagal', 'Konfirmasi patungan gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <DashboardHeader 
        avatar={avatar} 
        myName={myName} 
        theme={theme} 
        setNotifyVisible={setNotifyVisible} 
        notifications={notifications} 
        user={user} 
        navigation={navigation}
      />

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={[styles.main, { paddingBottom: 150 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
      >
        <HeroSection 
          theme={theme} 
          filter={filter} 
          formatMoney={formatMoney} 
          getBalance={getBalance} 
          myName={myName} 
          partnerName={partnerName} 
          setFilter={setFilter} 
          animStyle={{ opacity: sectionsAnim[0], transform: [{ translateY: sectionsAnim[0].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }] }}
        />

        <PendingSplitsSection 
          pendingSplits={pendingSplits} 
          theme={theme} 
          formatMoney={formatMoney} 
          setSelectedSplitTx={setSelectedSplitTx} 
          setSplitModalVisible={setSplitModalVisible} 
          highlightedId={highlightedId} 
          highlightAnim={highlightAnim} 
          animStyle={{ opacity: sectionsAnim[1], transform: [{ translateY: sectionsAnim[1].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 24 }}
          itemLayouts={itemLayouts}
          sectionLayouts={sectionLayouts}
        />

        <WalletsSection 
          accounts={accounts} 
          theme={theme} 
          formatMoney={formatMoney} 
          navigation={navigation} 
          width={width}
          animStyle={{ opacity: sectionsAnim[2], transform: [{ translateY: sectionsAnim[2].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 24 }}
          sectionLayouts={sectionLayouts}
        />

        <ExpenseAnalysisSection 
          theme={theme} filter={filter} myName={myName} partnerName={partnerName} setFilter={setFilter} 
          timeFilter={timeFilter} setTimeFilter={setTimeFilter} 
          customStartDate={customStartDate} customEndDate={customEndDate} 
          setShowStartPicker={setShowStartPicker} setShowEndPicker={setShowEndPicker}
          showStartPicker={showStartPicker} showEndPicker={showEndPicker}
          setCustomStartDate={setCustomStartDate} setCustomEndDate={setCustomEndDate}
          segments={segments} totalExpense={totalExpense} formatMoney={formatMoney} 
          RADIUS={RADIUS} CIRCUMFERENCE={CIRCUMFERENCE} 
          animStyle={{ opacity: sectionsAnim[3], transform: [{ translateY: sectionsAnim[3].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 24 }}
          sectionLayouts={sectionLayouts}
          isDarkMode={themeCtx?.isDarkMode}
        />


        <BillsSection 
          bills={bills} theme={theme} formatMoney={formatMoney} 
          setSelectedBill={setSelectedBill} setBillActionModalVisible={setBillActionModalVisible} 
          highlightedId={highlightedId} highlightAnim={highlightAnim} 
          animStyle={{ opacity: sectionsAnim[4], transform: [{ translateY: sectionsAnim[4].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 32 }}
          itemLayouts={itemLayouts} resetBillForm={resetBillForm} setBillModalVisible={setBillModalVisible}
          sectionLayouts={sectionLayouts}
        />

        <GoalsSection 
          goals={goals} hasPartner={hasPartner} theme={theme} formatMoney={formatMoney} 
          navigation={navigation} sectionLayouts={sectionLayouts} itemLayouts={itemLayouts}
          animStyle={{ opacity: sectionsAnim[5], transform: [{ translateY: sectionsAnim[5].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 32 }}
        />

        <RecentActivitiesSection 
          filteredTx={filteredTx} theme={theme} filter={filter} myName={myName} partnerName={partnerName} formatMoney={formatMoney} 
          navigation={navigation} openQuickEdit={openQuickEdit} 
          highlightedId={highlightedId} highlightAnim={highlightAnim} 
          animStyle={{ opacity: sectionsAnim[6], transform: [{ translateY: sectionsAnim[6].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 32 }}
          itemLayouts={itemLayouts} sectionLayouts={sectionLayouts}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modern FAB */}
      <View style={styles.fabContainer}>
        {fabOpen ? fabActions.map((act, i) => (
            <Animated.View 
              key={act.key} 
              style={[
                styles.fabAction, 
                { 
                  opacity: fabAnim,
                  transform: [{ translateY: fabAnim.interpolate({ inputRange:[0,1], outputRange:[0, -(80 + (64 * i))] }) }] 
                }
              ]}
            >
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: 250, paddingRight: 8 }} 
                onPress={() => handleFabAction(act.key)}
              >
                <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                  <RNText style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>{act.label}</RNText>
                </View>
                <View style={[styles.fabMini, { backgroundColor: act.color, shadowColor: act.color, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }]}>
                   <MaterialIcons name={act.icon} size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )) : null}
         <TouchableOpacity onPress={toggleFab} style={styles.fabMain} activeOpacity={0.8}>
            <LinearGradient 
              colors={[theme.primary, theme.primary + 'CC']} 
              style={styles.fabGradient}
            >
               <Animated.View style={{ transform: [{ rotate: fabAnim.interpolate({ inputRange:[0,1], outputRange:['0deg', '45deg'] }) }] }}>
                 <MaterialIcons name="add" size={32} color={theme.onPrimary} />
               </Animated.View>
            </LinearGradient>
         </TouchableOpacity>
      </View>

      {/* Notification Dropdown Modal */}
      <Modal visible={notifyVisible} transparent animationType="fade" onRequestClose={() => setNotifyVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setNotifyVisible(false)}>
          <View style={{ 
            position: 'absolute', 
            top: (safeAreaInsets?.top || 0) + 60, 
            right: 24, 
            width: '85%', 
            maxHeight: '60%', 
            backgroundColor: theme.surfaceContainer, 
            borderRadius: 32, 
            padding: 20, 
            ...getShadow('#000', 0.5, 30, { width: 0, height: 20 }, 20),
            borderWidth: 1, 
            borderColor: 'rgba(255,255,255,0.08)' 
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.onSurface, letterSpacing: -0.5 }}>Pemberitahuan</Text>
              <TouchableOpacity onPress={() => { setNotifyVisible(false); if (markAllNotificationsAsRead) markAllNotificationsAsRead(); }} style={{ padding: 4 }}>
                <MaterialIcons name="done-all" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {notifications.filter(n => {
                if (!user?.name || !n.sender) return true;
                return n.sender.toLowerCase().trim() !== user.name.toLowerCase().trim();
              }).length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 100 }}>
                  <MaterialIcons name="notifications-none" size={40} color={theme.outlineVariant} />
                  <Text style={{ color: theme.onSurface, fontSize: 18, fontWeight: 'bold', marginTop: 20 }}>Hening Sekali...</Text>
                </View>
              ) : (
                notifications
                  .filter(n => {
                    if (!user?.name || !n.sender) return true;
                    return n.sender.toLowerCase().trim() !== user.name.toLowerCase().trim();
                  })
                  .sort((a,b) => {
                    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return tB - tA;
                  })
                  .map((notif, idx) => {
                  const type = notif.type || notif.targetType;
                  const message = notif.message || notif.body || 'Ada aktivitas baru';
                  const title = notif.title || 'Informasi';
                  const getIcon = () => {
                    const msgLower = message.toLowerCase();
                    const titleLower = title.toLowerCase();
                    const notifIcon = notif.icon || '';
                    
                    // Goal icons
                    if (notifIcon === 'favorite' || notifIcon === 'savings' || notifIcon === 'stars' || type === 'goal' || msgLower.includes('goal') || msgLower.includes('dana')) {
                      return { name: 'favorite', color: '#E879F9' };
                    }
                    
                    // Bill icons
                    if (type === 'bill' || msgLower.includes('tagihan') || titleLower.includes('tagihan')) {
                      if (msgLower.includes('bayar') || msgLower.includes('lunas') || msgLower.includes('terbayar')) {
                        return { name: 'receipt-long', color: theme.success };
                      }
                      return { name: 'bolt', color: '#F59E0B' };
                    }
                    
                    // Transaction icons
                    if (type === 'transaction' || type === 'split_pending' || type === 'split_approved') {
                      if (msgLower.includes('pemasukan')) return { name: 'payments', color: theme.success };
                      if (msgLower.includes('patungan') || msgLower.includes('konfirmasi')) return { name: 'people', color: theme.primary };
                      if (msgLower.includes('tagihan')) return { name: 'receipt-long', color: '#F59E0B' };
                      return { name: 'shopping-bag', color: theme.error };
                    }
                    
                    return { name: 'notifications', color: theme.primary };
                  };
                  const isUnread = !notif.readBy?.includes(user?.name);
                  const icon = getIcon();
                  return (
                    <TouchableOpacity 
                      key={notif.id || idx} 
                      onPress={() => handleNotifClick(notif)} 
                      style={{ 
                        flexDirection: 'row', 
                        padding: 18, 
                        backgroundColor: isUnread ? theme.surfaceContainerHigh : theme.surfaceContainerLow, 
                        borderRadius: 24, 
                        marginBottom: 12, 
                        alignItems: 'center',
                        borderWidth: isUnread ? 1 : 0,
                        borderColor: isUnread ? theme.primary + '33' : 'transparent'
                      }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: icon.color + '20', justifyContent: 'center', alignItems: 'center' }}><MaterialIcons name={icon.name} size={22} color={icon.color} /></View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>{title}</Text>
                          {!!isUnread && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />}
                        </View>
                        <Text style={{ fontSize: 13, color: theme.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>{message}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Add/Edit Bill Modal */}
      <Modal visible={billModalVisible} transparent animationType="slide" onRequestClose={() => setBillModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setBillModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '90%', padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, opacity: 1 }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ padding: 24, paddingBottom: 150 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: theme.onSurface, marginBottom: 24 }}>{isEditingBill ? 'Edit Tagihan' : 'Tambah Tagihan'}</Text>
                
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>TIPE TAGIHAN</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                  {[
                    { id: 'one-time', label: 'Sekali', icon: 'favorite' },
                    { id: 'recurring', label: 'Rutin', icon: 'autorenew' },
                    { id: 'installment', label: 'Tenor', icon: 'calendar-today' }
                  ].map(t => (
                    <TouchableOpacity 
                      key={t.id} 
                      onPress={() => setBillType(t.id)}
                      style={{ 
                        flex: 1, 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: 6, 
                        paddingVertical: 12, 
                        borderRadius: 16, 
                        backgroundColor: billType === t.id ? theme.primary + '20' : theme.surfaceContainerLow,
                        borderWidth: 1,
                        borderColor: billType === t.id ? theme.primary : 'transparent'
                      }}
                    >
                      <MaterialIcons name={t.icon} size={16} color={billType === t.id ? theme.primary : theme.onSurfaceVariant} />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: billType === t.id ? theme.primary : theme.onSurfaceVariant }}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {billType === 'installment' && (
                  <>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>TOTAL TENOR (BULAN)</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]} placeholder="Misal: 12" keyboardType="numeric" placeholderTextColor={theme.onSurfaceVariant} value={billTotalTenor} onChangeText={setBillTotalTenor} />
                  </>
                )}

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>NAMA TAGIHAN</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]} placeholder="Misal: Listrik" placeholderTextColor={theme.onSurfaceVariant} value={billName} onChangeText={setBillName} />
                
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>NOMINAL (RP)</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]} 
                      placeholder="0" 
                      keyboardType="numeric" 
                      placeholderTextColor={theme.onSurfaceVariant} 
                      value={billAmount} 
                      onChangeText={handleBillAmountChange} 
                      selection={selectionBill} 
                      onSelectionChange={(e) => {
                        const sel = e.nativeEvent.selection;
                        setSelectionBill(sel);
                        selectionBillRef.current = sel;
                      }} 
                    />
                
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>JATUH TEMPO</Text>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      if (billDateInputRef.current?.showPicker) {
                        try { billDateInputRef.current.showPicker(); } catch (e) {}
                      } else {
                        billDateInputRef.current?.click();
                      }
                    } else {
                      setShowDatePicker(true);
                    }
                  }}
                  style={[styles.input, { justifyContent: 'center', position: 'relative', overflow: 'hidden' }]}
                >
                  <View style={{ width: '100%', pointerEvents: 'none' }}>
                    <Text style={{ color: theme.onSurface }}>
                      {billDueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} 
                      {(() => {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const target = new Date(billDueDate);
                        target.setHours(0,0,0,0);
                        const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                        return diff >= 0 ? ` (${diff} hari lagi)` : ` (Terlewat ${Math.abs(diff)} hari)`;
                      })()}
                    </Text>
                  </View>
                  {Platform.OS === 'web' && (
                    <input 
                      ref={billDateInputRef}
                      type="date" 
                      value={billDueDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) setBillDueDate(new Date(e.target.value));
                      }}
                      style={{ 
                        position: 'absolute', top: 0, left: 0, opacity: 0, width: 0, height: 0, 
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                </TouchableOpacity>

                {Platform.OS !== 'web' && showDatePicker && (
                  <DateTimePicker
                    value={billDueDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setBillDueDate(selectedDate);
                    }}
                  />
                )}
                
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12, marginLeft: 4 }}>IKON & WARNA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  {billIcons.map(ic => (
                    <TouchableOpacity 
                      key={ic.name} 
                      onPress={() => setBillIcon(ic.name)}
                      style={{ 
                        width: 50, height: 50, borderRadius: 16, 
                        backgroundColor: billIcon === ic.name ? billColor : theme.surfaceContainerLow,
                        justifyContent: 'center', alignItems: 'center', marginRight: 10,
                        borderWidth: 2, borderColor: billIcon === ic.name ? '#fff' : 'transparent'
                      }}
                    >
                      <MaterialIcons name={ic.name} size={24} color={billIcon === ic.name ? '#fff' : theme.onSurfaceVariant} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                  {billColors.map(c => (
                    <TouchableOpacity 
                      key={c} onPress={() => setBillColor(c)}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: 3, borderColor: billColor === c ? '#fff' : 'transparent' }}
                    />
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => setBillModalVisible(false)} style={{ flex: 1, padding: 18, alignItems: 'center', borderRadius: 20, backgroundColor: theme.surfaceContainerLow }}>
                    <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveBill} style={{ flex: 2, backgroundColor: theme.primary, padding: 18, borderRadius: 20, alignItems: 'center' }}>
                    <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>{loading ? 'Menyimpan...' : 'Simpan Tagihan'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bill Action Modal */}
      <Modal visible={billActionModalVisible} transparent animationType="fade" onRequestClose={() => setBillActionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBillActionModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '33' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 4 }}>Kelola Tagihan</Text>
              <Text style={{ fontSize: 13, color: theme.onSurfaceVariant }}>{selectedBill?.name} - Rp {formatMoney(selectedBill?.amount)}</Text>
            </View>
            <View style={{ padding: 8 }}>
              <TouchableOpacity onPress={handleMarkPaid} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="check-circle" size={22} color={theme.primary} />
                </View>
                <View><Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>Tandai Lunas</Text><Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Bayar menggunakan dompet</Text></View>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleEditBill} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="edit" size={22} color={theme.onSurfaceVariant} />
                </View>
                <View><Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>Edit Tagihan</Text><Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Ubah detail tagihan ini</Text></View>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleRemindBill} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.error + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="bolt" size={22} color={theme.error} />
                </View>
                <View><Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>Ingatkan {partnerName || 'Pasangan'}</Text><Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Kirim pengingat segera</Text></View>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDeleteBill} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.error + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="delete" size={22} color={theme.error} />
                </View>
                <View><Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.error }}>Hapus Tagihan</Text><Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Hapus dari daftar pengingat</Text></View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Pay Bill Modal (Wallet Selection) */}
      <Modal visible={payBillModalVisible} transparent animationType="fade" onRequestClose={() => setPayBillModalVisible(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setPayBillModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface, padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '33' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 4 }}>Pilih Pembayaran</Text>
              <Text style={{ fontSize: 13, color: theme.onSurfaceVariant }}>Bayar "{selectedBill?.name}" sebesar Rp {formatMoney(selectedBill?.amount)}</Text>
            </View>
            <View style={{ padding: 16 }}>
              <ScrollView style={{ maxHeight: 300 }}>
                {accounts.filter(a => a.owner === user?.name || a.owner === 'Bersama').map(acc => (
                  <TouchableOpacity 
                    key={acc.id} onPress={() => setSelectedPayAccountId(acc.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: selectedPayAccountId === acc.id ? theme.primary + '15' : 'transparent', marginBottom: 8, borderWidth: 1, borderColor: selectedPayAccountId === acc.id ? theme.primary : theme.outlineVariant + '22' }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: acc.color + '15', justifyContent: 'center', alignItems: 'center' }}><MaterialIcons name={acc.icon || 'payments'} size={22} color={acc.color} /></View>
                    <View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>{acc.name}</Text><Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Saldo: Rp {formatMoney(acc.balance)}</Text></View>
                    {selectedPayAccountId === acc.id && <MaterialIcons name="check-circle" size={24} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={handleConfirmPayment} disabled={loading || !selectedPayAccountId} style={{ backgroundColor: theme.primary, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 16, opacity: (loading || !selectedPayAccountId) ? 0.6 : 1 }}>
                <Text style={{ color: theme.onPrimary, fontWeight: 'bold', fontSize: 16 }}>{loading ? 'Memproses...' : 'Konfirmasi Bayar'}</Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>

      {/* Aesthetic Alert Modal */}
      <Modal visible={aestheticAlertVisible} transparent animationType="fade" onRequestClose={() => setAestheticAlertVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAestheticAlertVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, padding: 32, alignItems: 'center', borderRadius: 32, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
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

      {/* Confirm Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setConfirmVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, padding: 24 }]}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 12, textAlign: 'center' }}>{confirmConfig.title}</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>{confirmConfig.message}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: theme.surfaceContainerLow, padding: 16, borderRadius: 16, alignItems: 'center' }} onPress={() => setConfirmVisible(false)}>
                <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: theme.primary, padding: 16, borderRadius: 16, alignItems: 'center' }} onPress={confirmConfig.onConfirm}>
                <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modern Quick Edit Modal */}
      <Modal visible={isQuickEditVisible} transparent animationType="slide" onRequestClose={() => setIsQuickEditVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsQuickEditVisible(false)}>
           <TouchableOpacity activeOpacity={1} style={{ backgroundColor: theme.surface, marginHorizontal: 24, borderRadius: 32, padding: 24, width: '90%' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 24 }}>Edit Aktivitas</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>NAMA AKTIVITAS</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]} value={quickEditName} onChangeText={setQuickEditName} />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>NOMINAL (RP)</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]} 
                value={quickEditAmount} 
                onChangeText={handleQuickAmountChange} 
                keyboardType="numeric"
                selection={quickSelectionState}
                onSelectionChange={(e) => { setQuickSelectionState(e.nativeEvent.selection); quickSelectionRef.current = e.nativeEvent.selection; }}
              />

              <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12, marginLeft: 4 }}>SUMBER DANA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                {accounts.filter(acc => acc.owner === myName || acc.owner === 'Bersama').map(acc => {
                  const isActive = quickEditAccountId === acc.id;
                  return (
                    <TouchableOpacity 
                      key={acc.id} 
                      onPress={() => setQuickEditAccountId(acc.id)} 
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
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={handleDeleteQuickEdit} disabled={loading} style={{ flex: 1, backgroundColor: theme.error + '15', padding: 18, borderRadius: 20, alignItems: 'center', opacity: loading ? 0.6 : 1 }}><Text style={{ color: theme.error, fontWeight: 'bold' }}>Hapus</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveQuickEdit} disabled={loading} style={{ flex: 2, backgroundColor: theme.primary, padding: 18, borderRadius: 20, alignItems: 'center', opacity: loading ? 0.6 : 1 }}><Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>{loading ? 'Menyimpan...' : 'Simpan'}</Text></TouchableOpacity>
              </View>
           </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: theme.error + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <MaterialIcons name="delete-sweep" size={40} color={theme.error} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.onSurface, marginBottom: 8, textAlign: 'center' }}>Hapus Transaksi?</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
              Transaksi "{quickEditTx?.name}" akan dihapus secara permanen.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity 
                onPress={() => setDeleteConfirmVisible(false)} 
                disabled={loading}
                style={{ flex: 1, height: 56, borderRadius: 20, backgroundColor: theme.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: theme.onSurface, fontWeight: 'bold' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmDelete} 
                disabled={loading}
                style={{ flex: 1, height: 56, borderRadius: 20, backgroundColor: theme.error, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1 }}
              >
                <Text style={{ color: theme.onError, fontWeight: 'bold' }}>{loading ? 'Menghapus...' : 'Hapus'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Split Confirmation Modal */}
      <Modal visible={splitModalVisible} transparent animationType="slide" onRequestClose={() => setSplitModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.outlineVariant + '15' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.onSurface }}>{selectedSplitTx?.isJoint ? 'Uang Bersama (50:50)' : 'Konfirmasi Patungan'}</Text>
                <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Pilih dompet untuk bayar porsi kamu</Text>
              </View>
              <TouchableOpacity onPress={() => setSplitModalVisible(false)}><MaterialIcons name="close" size={24} color={theme.onSurfaceVariant} /></TouchableOpacity>
            </View>
            <View style={{ backgroundColor: theme.primary + '15', padding: 16, borderRadius: 20, marginBottom: 24 }}>
              <Text style={{ fontSize: 12, color: theme.primary, fontWeight: 'bold', marginBottom: 4 }}>TRANSAKSI</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.onSurface }}>{selectedSplitTx?.name}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.primary + '1A' }}>
                <Text style={{ color: theme.onSurfaceVariant }}>Beban Kamu</Text>
                <Text style={{ fontWeight: 'bold', color: theme.primary, fontSize: 16 }}>Rp {formatMoney(selectedSplitTx?.partnerContrib || 0)}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12, marginLeft: 4 }}>PILIH DOMPET KAMU</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {accounts.filter(acc => acc.owner === myName).map(acc => (
                <TouchableOpacity key={acc.id} onPress={() => setSelectedSplitAccountId(acc.id)} style={{ padding: 14, borderRadius: 16, backgroundColor: selectedSplitAccountId === acc.id ? theme.primary + '20' : theme.surfaceContainerLow, borderWidth: 2, borderColor: selectedSplitAccountId === acc.id ? theme.primary : 'transparent', marginRight: 10, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 140 }}>
                  <MaterialIcons name={acc.icon || 'payments'} size={20} color={selectedSplitAccountId === acc.id ? theme.primary : theme.onSurfaceVariant} />
                  <View><Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurface }}>{acc.name}</Text><Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>Rp {formatMoney(acc.balance)}</Text></View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleConfirmSplit} disabled={loading || !selectedSplitAccountId} style={{ backgroundColor: theme.primary, padding: 18, borderRadius: 20, alignItems: 'center', opacity: (loading || !selectedSplitAccountId) ? 0.7 : 1 }}>
              <Text style={{ color: theme.onPrimary, fontWeight: 'bold', fontSize: 16 }}>{loading ? 'Memproses...' : 'Konfirmasi Bayar'}</Text>

            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { 
          opacity: toastAnim, 
          transform: [{ 
            translateY: toastAnim.interpolate({ 
              inputRange: [0, 1], 
              outputRange: [-60, 0] 
            }) 
          }] 
        }]}>
          <View style={[styles.toastContent, { backgroundColor: theme.surface, borderColor: theme.outlineVariant + '22', padding: 16 }]}>
            <MaterialIcons name="favorite" size={20} color={theme.primary} />
            <Text style={[styles.toastText, { color: theme.onSurface }]}>{toastMsg}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};



export default DashboardScreen;
