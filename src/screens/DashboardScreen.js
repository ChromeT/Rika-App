import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Dimensions, Modal, Image, Alert, Animated, ActivityIndicator, RefreshControl, Platform } from 'react-native';
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

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation, route }) => {
  const safeAreaInsets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  console.log('Dashboard safeAreaInsets:', safeAreaInsets);
  // Safe Context Access
  const themeCtx = useContext(ThemeContext);
  const dataCtx = useContext(DataContext);
  const authCtx = useContext(AuthContext);

  const theme = themeCtx?.theme || { background: '#0b0f10', surface: '#0b0f10', primary: '#b2cad3', onSurface: '#dde7eb' };
  const { 
    transactions = [], getBalance = () => 0, bills = [], 
    addBill, updateBill, deleteBill, payBill, 
    notifications = [], addNotification, goals = [], 
    accounts = [], deleteTransaction, updateTransaction, 
    confirmSplitTransaction,
    markSingleNotifAsRead, markAllNotificationsAsRead
  } = dataCtx || {};
  const { user, householdUsers = [], avatar } = authCtx || {};
  
  const [filter, setFilter] = useState('Kita');
  const [timeFilter, setTimeFilter] = useState('Bulan ini');
  const [notifyVisible, setNotifyVisible] = useState(false);
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [billActionModalVisible, setBillActionModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [billType, setBillType] = useState('one-time'); // 'one-time', 'recurring', 'installment'
  const [billTotalTenor, setBillTotalTenor] = useState('12');
  const [billIcon, setBillIcon] = useState('favorite');
  const [billColor, setBillColor] = useState('#6366F1');
  
  const [payBillModalVisible, setPayBillModalVisible] = useState(false);
  const [selectedPayAccountId, setSelectedPayAccountId] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});
  const [loading, setLoading] = useState(false);
  
  const [selectedSplitTx, setSelectedSplitTx] = useState(null);
  const [selectedSplitAccountId, setSelectedSplitAccountId] = useState(null);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  
  // Quick Edit States
  const [isQuickEditVisible, setIsQuickEditVisible] = useState(false);
  const [quickEditTx, setQuickEditTx] = useState(null);
  const [quickEditName, setQuickEditName] = useState('');
  const [quickEditAmount, setQuickEditAmount] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const quickSelectionRef = useRef({ start: 0, end: 0 });
  const [quickSelectionState, setQuickSelectionState] = useState({ start: 0, end: 0 });
  const quickAmountRef = useRef('');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
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
      // Calculate absolute Y dynamically to avoid race conditions with section layouts
      const absoluteY = layout.localY + (sectionLayouts.current[layout.section] || 0);
      // Offset adjusted to 300 to ensure item is clearly in the top half of the screen
      scrollRef.current.scrollTo({ y: Math.max(0, absoluteY - 300), animated: true });
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

    // Advanced routing based on old UI logic
    if ((type === 'goal' || title.includes('goal') || title.includes('mimpi') || title.includes('dana')) && targetId) {
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


  const myName = user?.name || 'Saya';
  const partnerName = householdUsers?.find(u => u !== myName);
  const hasPartner = !!partnerName;



  // Filtered Data
  const filteredTx = (transactions || []).filter(tx => {
    if (!tx) return false;
    const txDate = new Date(tx.date);
    const today = new Date();
    let timeMatch = true;
    if (timeFilter === 'Hari ini') timeMatch = txDate.toDateString() === today.toDateString();
    else if (timeFilter === 'Minggu ini') {
      const lastWeek = new Date(); lastWeek.setDate(today.getDate() - 7);
      timeMatch = txDate >= lastWeek;
    } else if (timeFilter === 'Bulan ini') timeMatch = txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
    
    let userMatch = true;
    if (filter === 'Saya') userMatch = tx.owner === myName;
    else if (filter !== 'Kita') userMatch = tx.owner === filter;
    
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
    const formatted = formatInput((tx.amount || 0).toString());
    setQuickEditTx(tx);
    setQuickEditName(tx.name);
    setQuickEditAmount(formatted);
    quickAmountRef.current = formatted;
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
        partnerContrib: fPar
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
    const formatted = formatMoney(processedVal.replace(/\D/g, ''));
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

  const handleDeleteBill = () => {
    setBillActionModalVisible(false);
    setTimeout(() => {
      setConfirmConfig({
        title: 'Hapus Tagihan',
        message: 'Yakin ingin menghapus tagihan ini?',
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
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.avatarWrapper}>
            {avatar?.startsWith('data:image') || avatar?.startsWith('file://') ? (
              <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <MaterialIcons name={avatar || 'person'} size={24} color={theme.primary} />
            )}
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 12, color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Halo,</Text>
            <Text style={[styles.headerTitle, { color: theme.onSurface }]}>{myName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setNotifyVisible(true)} style={styles.notifBtn}>
          <MaterialIcons name="notifications-none" size={26} color={theme.onSurface} />
          {notifications.filter(n => {
            if (!user?.name || !n.sender) return true;
            return n.sender.toLowerCase().trim() !== user.name.toLowerCase().trim();
          }).filter(n => !n.readBy?.includes(user?.name)).length > 0 && (
            <View style={styles.notifBadge}>
              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>
                {notifications.filter(n => {
                  if (!user?.name || !n.sender) return true;
                  return n.sender.toLowerCase().trim() !== user.name.toLowerCase().trim();
                }).filter(n => !n.readBy?.includes(user?.name)).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.main} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
      >
        <Animated.View style={{ opacity: sectionsAnim[0], transform: [{ translateY: sectionsAnim[0].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }] }}>
          <LinearGradient colors={[theme.primary, theme.primary + 'AA']} style={styles.heroCard} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={styles.heroLabel}>Total Saldo {filter}</Text>
            <Text style={styles.heroValue}>Rp {formatMoney(getBalance(filter === 'Saya' ? myName : filter))}</Text>
            <View style={styles.filterRow}>
              {['Kita', 'Saya', partnerName].filter(Boolean).map(f => (
                <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, filter === f && { color: theme.primary }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
        {/* Pending Splits Confirmation Section */}
        {pendingSplits.length > 0 && (
          <Animated.View 
            onLayout={(e) => { sectionLayouts.current.pending = e.nativeEvent.layout.y; }}
            style={{ opacity: sectionsAnim[1], transform: [{ translateY: sectionsAnim[1].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 24 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MaterialIcons name="notification-important" size={20} color={theme.primary} />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.onSurface }}>Butuh Konfirmasi Kamu</Text>
              <View style={{ backgroundColor: theme.error, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{pendingSplits.length}</Text>
              </View>
            </View>
            {pendingSplits.map(tx => (
              <Animated.View 
                key={tx.id} 
                onLayout={(e) => {
                  const layout = e.nativeEvent.layout;
                  itemLayouts.current[`pending_${tx.id}`] = { localY: layout.y, height: layout.height, section: 'pending' };
                }}
                style={{ 
                  backgroundColor: highlightedId === `pending_${tx.id}` ? 
                    highlightAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.surfaceContainerLow, theme.primary + '33'] }) : 
                    theme.surfaceContainerLow, 
                  borderRadius: 24, 
                  borderWidth: 1.5, 
                  borderColor: highlightedId === `pending_${tx.id}` ? theme.primary : theme.primary + '33',
                  marginBottom: 12,
                  overflow: 'hidden'
                }}
              >
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedSplitTx(tx);
                    setSplitModalVisible(true);
                  }}
                  style={{ 
                    padding: 16, 
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface }}>{tx.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>
                      {tx.isJoint ? 'Bagi rata 50:50' : 'Patungan Custom'} • Rp {formatMoney(tx.partnerContrib)}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: theme.onPrimary, fontSize: 12, fontWeight: 'bold' }}>Konfirmasi</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        <Animated.View style={{ opacity: sectionsAnim[2], transform: [{ translateY: sectionsAnim[2].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 24 }}>
           <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Dompet Kita</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Wallets')}><Text style={{ color: theme.primary, fontWeight: 'bold' }}>Semua</Text></TouchableOpacity>
           </View>
           <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.walletScroll}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 10 }}
            >
              {accounts.length === 0 ? (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={[
                      styles.walletCard, 
                      { 
                        width: width - 48, 
                        height: 90,
                        backgroundColor: theme.surface, 
                        borderWidth: 2, 
                        borderStyle: 'dashed', 
                        borderColor: theme.outline,
                        justifyContent: 'center',
                        gap: 16
                      }
                    ]} 
                    onPress={() => navigation.navigate('AddAccount')}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialIcons name="account-balance-wallet" size={24} color={theme.primary} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>Belum ada dompet</Text>
                      <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Tap di sini untuk tambah dompet pertama kamu</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {accounts.map(acc => (
                    <TouchableOpacity 
                      key={acc.id} 
                      style={[styles.walletCard, { backgroundColor: theme.surface, shadowColor: theme.onSurface, shadowOpacity: 0.04 }]} 
                      onPress={() => navigation.navigate('Wallets', { walletId: acc.id })}
                    >
                      <View style={[styles.walletIcon, { backgroundColor: (acc.color || theme.primary) + '15' }]}>
                        <MaterialIcons name={acc.icon || 'payments'} size={20} color={acc.color || theme.primary} />
                      </View>
                      <View>
                        <Text style={[styles.walletName, { color: theme.onSurface }]} numberOfLines={1}>{acc.name}</Text>
                        <Text style={[styles.walletBalance, { color: theme.primary }]}>Rp {formatMoney(acc.balance)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity 
                    style={[
                      styles.walletCard, 
                      { 
                        borderStyle: 'dashed', 
                        borderWidth: 1.5, 
                        borderColor: theme.outline,
                        backgroundColor: 'transparent',
                        elevation: 0,
                        shadowOpacity: 0
                      }
                    ]} 
                    onPress={() => navigation.navigate('AddAccount')}
                  >
                    <MaterialIcons name="add-circle-outline" size={24} color={theme.onSurfaceVariant} />
                    <Text style={{ color: theme.onSurfaceVariant, fontSize: 12, fontWeight: 'bold' }}>Tambah</Text>
                  </TouchableOpacity>
                </>
              )}
           </ScrollView>
        </Animated.View>
        {/* Expense Analysis Section */}
        <Animated.View 
          onLayout={(e) => { sectionLayouts.current.expense = e.nativeEvent.layout.y; }}
          style={{ opacity: sectionsAnim[3], transform: [{ translateY: sectionsAnim[3].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 24 }}
        >
          <View style={[styles.surfaceCard, { backgroundColor: theme.surfaceContainerLow, padding: 24, borderRadius: 32, marginBottom: 24, borderWidth: 1, borderColor: theme.outlineVariant + '15' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Pengeluaran</Text>
              
              {/* Micro User Switcher for precise analysis */}
              <View style={{ 
                flexDirection: 'row', 
                backgroundColor: theme.surfaceContainerHighest + '66', 
                padding: 3, 
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.outlineVariant + '11'
              }}>
                {['Kita', 'Saya', (partnerName || 'Pasangan')].map(f => (
                  <TouchableOpacity 
                    key={f} 
                    onPress={() => setFilter(f)}
                    style={{ 
                      paddingHorizontal: 10, 
                      paddingVertical: 5, 
                      borderRadius: 9,
                      backgroundColor: filter === f ? theme.primary : 'transparent'
                    }}
                  >
                    <Text style={{ 
                      fontSize: 10, 
                      fontWeight: '900', 
                      color: filter === f ? theme.onPrimary : theme.onSurfaceVariant,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginHorizontal: -4 }}>
              {['Hari ini', 'Minggu ini', 'Bulan ini', 'Tahun ini', 'Semua Waktu'].map(tf => (
                <TouchableOpacity 
                  key={tf} 
                  onPress={() => setTimeFilter(tf)} 
                  style={[
                    { marginHorizontal: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: theme.surfaceContainerHighest },
                    timeFilter === tf && { backgroundColor: theme.primary }
                  ]}
                >
                  <Text style={{ color: timeFilter === tf ? theme.onPrimary : theme.onSurfaceVariant, fontSize: 12, fontWeight: 'bold' }}>{tf}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              {/* Left Side: Professional Donut Chart */}
              <View style={{ width: 140, height: 140, position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
                <Svg width="140" height="140" viewBox="0 0 120 120">
                  <G rotation={-90} originX={60} originY={60}>
                    <Circle cx="60" cy="60" r={RADIUS} stroke={theme.surfaceContainerHighest + '44'} strokeWidth="10" fill="none" />
                    {segments.map((seg, i) => {
                      let offset = segments.slice(0, i).reduce((s, x) => s + x.dash, 0);
                      return <Circle key={i} cx="60" cy="60" r={RADIUS} stroke={seg.color} strokeWidth="10" fill="none" strokeDasharray={`${seg.dash} ${CIRCUMFERENCE}`} strokeDashoffset={-offset} strokeLinecap="round" />;
                    })}
                  </G>
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: theme.onSurfaceVariant, fontWeight: '900', letterSpacing: 1.5, opacity: 0.9 }}>TOTAL</Text>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: theme.onSurface, marginTop: 2 }}>Rp {formatMoney(totalExpense)}</Text>
                </View>
              </View>

              {/* Right Side: Detailed Percentages Legend */}
              <View style={{ flex: 1, gap: 12 }}>
                {segments.length === 0 ? (
                  <Text style={{ color: theme.onSurfaceVariant, fontSize: 12, fontStyle: 'italic' }}>Belum ada data pengeluaran</Text>
                ) : (
                  segments.map((seg, i) => {
                    const exactPercentage = (seg.amount / (totalExpense || 1)) * 100;
                    const displayPercentage = exactPercentage > 0 && exactPercentage < 1 ? '< 1' : Math.round(exactPercentage);
                    return (
                      <View key={i} style={{ width: '100%' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurface }} numberOfLines={1}>{seg.cat}</Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: theme.primary }}>{displayPercentage}%</Text>
                        </View>
                        {/* Micro Progress Bar */}
                        <View style={{ height: 4, backgroundColor: theme.surfaceContainerHighest + '44', borderRadius: 2, width: '100%' }}>
                          <View style={{ height: '100%', width: `${Math.max(exactPercentage, 1)}%`, backgroundColor: seg.color, borderRadius: 2 }} />
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Bill Reminder Section */}
        <Animated.View 
          onLayout={(e) => { sectionLayouts.current.bills = e.nativeEvent.layout.y; }}
          style={{ opacity: sectionsAnim[4], transform: [{ translateY: sectionsAnim[4].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 32 }}
        >
           <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Tagihan Mendatang</Text>
              <TouchableOpacity onPress={() => { resetBillForm(); setBillModalVisible(true); }}>
                <View style={{ backgroundColor: theme.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ color: theme.primary, fontSize: 11, fontWeight: 'bold' }}>+ Baru</Text>
                </View>
              </TouchableOpacity>
           </View>
           {bills.length === 0 ? (
             <TouchableOpacity 
               onPress={() => setBillModalVisible(true)}
               style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 24, padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.outlineVariant + '44' }}
             >
                <MaterialIcons name="receipt-long" size={32} color={theme.onSurfaceVariant + '44'} />
                <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, marginTop: 8 }}>Belum ada tagihan terdaftar</Text>
             </TouchableOpacity>
           ) : (
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                {bills.sort((a,b) => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const aDate = new Date(a.dueDate); aDate.setHours(0,0,0,0);
                  const bDate = new Date(b.dueDate); bDate.setHours(0,0,0,0);
                  return (aDate - today) - (bDate - today);
                }).slice(0, 5).map(bill => (
                  <Animated.View 
                    key={bill.id}
                    onLayout={(e) => {
                       itemLayouts.current[bill.id] = { localY: e.nativeEvent.layout.y, section: 'bills' }; 
                    }}
                  >
                    <TouchableOpacity 
                      onPress={() => { setSelectedBill(bill); setBillActionModalVisible(true); }}
                      style={{ 
                        backgroundColor: highlightedId === bill.id ? 
                          highlightAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.surfaceContainerLow, theme.primary + '33'] }) : 
                          theme.surfaceContainerLow, 
                        padding: 20, borderRadius: 28, width: 220, marginRight: 16, borderWidth: 1, 
                        borderColor: highlightedId === bill.id ? theme.primary : theme.outlineVariant + '11' 
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bill.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                          <MaterialIcons name={bill.icon || 'favorite'} size={20} color={bill.color} />
                        </View>
                        <View style={{ backgroundColor: (() => {
                          const today = new Date(); today.setHours(0,0,0,0);
                          const target = new Date(bill.dueDate); target.setHours(0,0,0,0);
                          const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                          return diff <= 3 ? '#F43F5E' : theme.primary;
                        })() + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                           <Text style={{ color: (() => {
                              const today = new Date(); today.setHours(0,0,0,0);
                              const target = new Date(bill.dueDate); target.setHours(0,0,0,0);
                              const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                              return diff <= 3 ? '#F43F5E' : theme.primary;
                           })(), fontSize: 10, fontWeight: 'bold' }}>
                             {(() => {
                               const today = new Date(); today.setHours(0,0,0,0);
                               const target = new Date(bill.dueDate); target.setHours(0,0,0,0);
                               const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                               return diff < 0 ? `Terlewat ${Math.abs(diff)}` : `${diff}`;
                             })()} Hari
                           </Text>
                        </View>
                      </View>
                      <Text style={{ color: theme.onSurface, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{bill.name}</Text>
                      <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 12, marginTop: 4 }}>Rp {formatMoney(bill.amount)}</Text>
                      
                      {bill.type === 'installment' && (
                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.outlineVariant + '22' }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: theme.onSurfaceVariant }}>
                            TENOR: {bill.currentTenor || 1}/{bill.totalTenor || 1}
                          </Text>
                          <View style={{ height: 3, backgroundColor: theme.surfaceContainer, borderRadius: 2, marginTop: 4 }}>
                            <View style={{ 
                              height: '100%', 
                              width: `${((bill.currentTenor || 1) / (bill.totalTenor || 1)) * 100}%`, 
                              backgroundColor: bill.color, 
                              borderRadius: 2 
                            }} />
                          </View>
                        </View>
                      )}
                      
                      {bill.type === 'recurring' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <MaterialIcons name="autorenew" size={10} color={theme.onSurfaceVariant} />
                          <Text style={{ fontSize: 9, color: theme.onSurfaceVariant, fontWeight: 'bold' }}>RUTIN</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                ))}
             </ScrollView>
           )}
        </Animated.View>

        {/* Goals Progress Section */}
        <Animated.View 
          onLayout={(e) => { sectionLayouts.current.goals = e.nativeEvent.layout.y; }}
          style={{ opacity: sectionsAnim[5], transform: [{ translateY: sectionsAnim[5].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 32 }}
        >
           <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Goals kita</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ backgroundColor: theme.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '900' }}>{goals.filter(g => !g.achieved).length} AKTIF</Text>
                </View>
                {goals.filter(g => g.achieved).length > 0 && (
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Goals', { initialTab: 'achieved' })}
                    style={{ backgroundColor: '#81C784' + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#81C784' + '33' }}
                  >
                    <MaterialIcons name="stars" size={10} color="#81C784" />
                    <Text style={{ fontSize: 10, color: '#81C784', fontWeight: '900' }}>{goals.filter(g => g.achieved).length} TERCAPAI</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold', fontSize: 13 }}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {!hasPartner ? (
            <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: theme.primary + '33' }}>
              <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                Menunggu pasangan bergabung sebelum memulai mimpi bersama.
              </Text>
            </View>
          ) : goals.filter(g => !g.achieved).length === 0 ? (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Goals')}
              style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 32, padding: 24, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.outlineVariant + '44' }}
            >
              <MaterialIcons name="favorite" size={32} color={theme.onSurfaceVariant + '44'} />
              <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, marginTop: 8 }}>Belum ada goals aktif</Text>
            </TouchableOpacity>
          ) : (
            goals.filter(g => !g.achieved).slice(0, 3).map((goal, idx) => {
              const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
              return (
                <TouchableOpacity 
                  key={goal.id || idx} 
                  onLayout={(e) => {
                    itemLayouts.current[goal.id || idx] = { localY: e.nativeEvent.layout.y, section: 'goals' };
                  }}
                  onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
                  activeOpacity={0.9}
                  style={{ 
                    backgroundColor: theme.surfaceContainerLow, 
                    padding: 14, 
                    borderRadius: 30, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginBottom: 14, 
                    borderWidth: 1, 
                    borderColor: theme.outlineVariant + '15',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3
                  }}
                >
                  <View style={{ width: 90, height: 90, borderRadius: 22, overflow: 'hidden', backgroundColor: theme.surfaceContainerHighest, borderWidth: 1, borderColor: theme.outlineVariant + '11' }}>
                    {goal.previewImage ? (
                      <Image source={{ uri: goal.previewImage }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <MaterialIcons name="auto-awesome" size={32} color={theme.primary + '33'} />
                      </View>
                    )}
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)']} style={StyleSheet.absoluteFill} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: theme.onSurface, flex: 1 }} numberOfLines={1}>{goal.name}</Text>
                      <View style={{ backgroundColor: theme.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                         <Text style={{ fontSize: 9, fontWeight: '900', color: theme.primary }}>{Math.round(progress)}%</Text>
                      </View>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                       <MaterialIcons name="flag" size={10} color={theme.onSurfaceVariant} />
                       <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, fontWeight: 'bold' }}>PROGRES GOAL</Text>
                    </View>

                    <View style={{ height: 6, backgroundColor: theme.surfaceContainerHighest, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                      <LinearGradient 
                        colors={[theme.primary, theme.primary + '88']} 
                        start={{x:0, y:0}} end={{x:1, y:0}}
                        style={{ height: '100%', width: `${progress}%`, borderRadius: 3 }} 
                      />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.onSurfaceVariant }}>Rp</Text>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: theme.primary }}>{formatMoney(goal.currentAmount)}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.onSurfaceVariant }}>/ {formatMoney(goal.targetAmount)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>
        
        <Animated.View 
          onLayout={(e) => { sectionLayouts.current.recent = e.nativeEvent.layout.y; }}
          style={{ opacity: sectionsAnim[6], transform: [{ translateY: sectionsAnim[6].interpolate({ inputRange:[0,1], outputRange:[20,0] }) }], marginTop: 32 }}
        >
           <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Aktivitas Terakhir</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Riwayat')}><Text style={{ color: theme.primary, fontWeight: 'bold' }}>Lihat</Text></TouchableOpacity>
           </View>
           {filteredTx.length === 0 ? (
             <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 24, padding: 24, alignItems: 'center' }}>
                <MaterialIcons name="history" size={32} color={theme.onSurfaceVariant + '44'} />
                <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, marginTop: 8 }}>Belum ada aktivitas dicatat</Text>
             </View>
           ) : (
             filteredTx.slice(0, 5).map((tx, idx) => (
               <Animated.View 
                  key={tx.id || idx} 
                  onLayout={(e) => { 
                    itemLayouts.current[`recent_${tx.id}`] = { localY: e.nativeEvent.layout.y, section: 'recent' }; 
                  }} 
                  style={[
                    styles.surfaceCard,
                    { 
                      backgroundColor: highlightedId === `recent_${tx.id}` ? 
                        highlightAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.surfaceContainerLow, theme.primary + '33'] }) : 
                        theme.surfaceContainerLow, 
                      marginBottom: 12, 
                      borderWidth: 1, 
                      borderColor: highlightedId === `recent_${tx.id}` ? theme.primary : theme.outlineVariant + '15',
                      overflow: 'hidden'
                    }
                  ]}>
                 <TouchableOpacity style={styles.txItem} onPress={() => openQuickEdit(tx)}>
                  <View style={[styles.txIcon, { backgroundColor: (tx.type === 'income' ? theme.primary : theme.error) + '15' }]}>
                    <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'add' : 'remove')} size={20} color={tx.type === 'income' ? theme.primary : theme.error} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.txName, { color: theme.onSurface }]} numberOfLines={1}>{tx.name}</Text>
                    <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>{tx.category} • {tx.owner}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.type === 'income' ? theme.primary : theme.error }]}>
                    {tx.type === 'income' ? '+' : '-'}Rp {formatMoney(tx.myContrib + tx.partnerContrib)}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
             ))
           )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modern FAB */}
      <View style={styles.fabContainer}>
          {fabOpen && fabActions.map((act, i) => (
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
                <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{act.label}</Text>
                </View>
                <View style={[styles.fabMini, { backgroundColor: act.color, shadowColor: act.color, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }]}>
                   <MaterialIcons name={act.icon} size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
         <TouchableOpacity onPress={toggleFab} style={[styles.fabMain, { backgroundColor: theme.surface }]} activeOpacity={0.8}>
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
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 20 }, 
            shadowOpacity: 0.5, 
            shadowRadius: 30, 
            elevation: 20, 
            borderWidth: 1, 
            borderColor: 'rgba(255,255,255,0.08)' 
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Pemberitahuan</Text>
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
                    if (notifIcon === 'favorite' || notifIcon === 'savings' || notifIcon === 'stars' || type === 'goal' || msgLower.includes('goal') || msgLower.includes('dana') || msgLower.includes('mimpi')) {
                      return { name: 'favorite', color: '#E879F9' };
                    }
                    
                    // Bill icons
                    if (type === 'bill' || msgLower.includes('tagihan') || titleLower.includes('tagihan')) {
                      if (msgLower.includes('bayar') || msgLower.includes('lunas') || msgLower.includes('terbayar')) {
                        return { name: 'receipt-long', color: '#10B981' };
                      }
                      return { name: 'bolt', color: '#F59E0B' };
                    }
                    
                    // Transaction icons
                    if (type === 'transaction' || type === 'split_pending' || type === 'split_approved') {
                      if (msgLower.includes('pemasukan')) return { name: 'payments', color: '#10B981' };
                      if (msgLower.includes('patungan') || msgLower.includes('konfirmasi')) return { name: 'people', color: '#6366F1' };
                      if (msgLower.includes('tagihan')) return { name: 'receipt-long', color: '#F59E0B' };
                      return { name: 'shopping-bag', color: '#F43F5E' };
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
                          {isUnread && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />}
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
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setBillModalVisible(false)} />
          <View style={[styles.modalContent, { maxHeight: '90%', padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ padding: 24, paddingBottom: 40 }}>
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
                    <TextInput style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]} placeholder="Misal: 12" keyboardType="numeric" placeholderTextColor={theme.onSurfaceVariant + '88'} value={billTotalTenor} onChangeText={setBillTotalTenor} />
                  </>
                )}

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>NAMA TAGIHAN</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]} placeholder="Misal: Listrik" placeholderTextColor={theme.onSurfaceVariant + '88'} value={billName} onChangeText={setBillName} />
                
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8, marginLeft: 4 }}>NOMINAL (RP)</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]} placeholder="0" keyboardType="numeric" placeholderTextColor={theme.onSurfaceVariant + '88'} value={billAmount} onChangeText={handleBillAmountChange} selection={selectionBill} onSelectionChange={(e) => setSelectionBill(e.nativeEvent.selection)} />
                
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
                <View><Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>Ingatkan Pasangan</Text><Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Kirim pengingat segera</Text></View>
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
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '33' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 4 }}>Pilih Pembayaran</Text>
              <Text style={{ fontSize: 13, color: theme.onSurfaceVariant }}>Bayar "{selectedBill?.name}" sebesar Rp {formatMoney(selectedBill?.amount)}</Text>
            </View>
            <View style={{ padding: 16 }}>
              <ScrollView style={{ maxHeight: 300 }}>
                {accounts.map(acc => (
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
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{loading ? 'Memproses...' : 'Konfirmasi Bayar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setConfirmVisible(false)}>
          <View style={[styles.modalContent, { padding: 24 }]}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 12, textAlign: 'center' }}>{confirmConfig.title}</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>{confirmConfig.message}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: theme.surfaceContainerLow, padding: 16, borderRadius: 16, alignItems: 'center' }} onPress={() => setConfirmVisible(false)}>
                <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: theme.primary, padding: 16, borderRadius: 16, alignItems: 'center' }} onPress={confirmConfig.onConfirm}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>OK</Text>
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
              <MaterialIcons name="delete-outline" size={40} color={theme.error} />
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
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{loading ? 'Menghapus...' : 'Hapus'}</Text>
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
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{loading ? 'Memproses...' : 'Konfirmasi Bayar'}</Text>
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
          <View style={[styles.toastContent, { backgroundColor: theme.surface, borderColor: theme.outlineVariant + '22' }]}>
            <MaterialIcons name="favorite" size={20} color={theme.primary} />
            <Text style={[styles.toastText, { color: theme.onSurface }]}>{toastMsg}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const fabActions = [
  { key: 'goals', icon: 'favorite', label: 'Goals baru', color: '#E879F9' },
  { key: 'transfer', icon: 'swap-horiz', label: 'Pindah dana', color: '#6366F1' },
  { key: 'tagihan', icon: 'receipt-long', label: 'Pengingat tagihan', color: '#F59E0B' },
  { key: 'pemasukan', icon: 'add-chart', label: 'Pemasukan', color: '#10B981' },
  { key: 'pengeluaran', icon: 'shopping-bag', label: 'Pengeluaran', color: '#F43F5E' },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrapper: { width: 44, height: 44, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  notifBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  notifBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    minWidth: 16, 
    height: 16, 
    borderRadius: 8, 
    backgroundColor: '#F43F5E', 
    borderWidth: 1.5, 
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2
  },
  main: { paddingHorizontal: 24, paddingTop: 20 },
  heroCard: { borderRadius: 36, padding: 28, marginBottom: 24 },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1.5 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 24 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  walletScroll: { marginHorizontal: -24, marginTop: 4 },
  surfaceCard: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  walletCard: { 
    width: 160, 
    padding: 16, 
    borderRadius: 24, 
    marginRight: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  walletIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  walletName: { fontSize: 13, fontWeight: 'bold' },
  walletBalance: { fontSize: 11, fontWeight: '900', marginTop: 2 },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 10 },
  txIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txName: { fontSize: 14, fontWeight: 'bold' },
  txAmount: { fontSize: 14, fontWeight: '900' },
  fabContainer: { position: 'absolute', bottom: 100, right: 24, alignItems: 'flex-end' },
  fabMain: { 
    width: 64, height: 64, borderRadius: 24, overflow: 'hidden', elevation: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { shadowColor: '#000' },
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }
    })
  },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fabAction: { position: 'absolute', bottom: 8, right: 0 },
  fabMini: { width: 48, height: 48, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  iconButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  donutCenterLarge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  input: { padding: 16, borderRadius: 16, marginBottom: 12 },
  toastContainer: { position: 'absolute', top: 100, left: 24, right: 24, alignItems: 'center', zIndex: 999 },
  toastContent: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  toastText: { fontSize: 13, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    borderRadius: 32, padding: 24, width: '90%', elevation: 10, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { shadowColor: '#000' },
      web: { boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }
    })
  },
});

export default DashboardScreen;
