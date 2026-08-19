import React, { useContext, useState, useEffect, useRef } from 'react';
import TextInput from '../components/ThemeTextInput';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, Alert, ActivityIndicator, Animated, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatMoney } from '../utils/formatUtils';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import Text from '../components/ThemeText';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';

const availableCustomIcons = [
  'star', 'pets', 'child-friendly', 'cake', 'favorite', 'emoji-events',
  'payments', 'account-balance-wallet', 'favorite', 'paid', 'monetization-on', 'trending-up', 'work', 'volunteer-activism', 'card-giftcard',
  'restaurant', 'local-cafe', 'fastfood', 'local-grocery-store', 'local-pizza',
  'commute', 'directions-car', 'local-gas-station', 'flight', 'water-drop', 'bolt', 'wifi', 'phone-iphone',
  'shopping-cart', 'checkroom', 'movie', 'sports-esports', 'fitness-center', 'spa', 'palette',
  'medical-services', 'healing', 'school', 'menu-book',
  'home', 'home-repair-service', 'build', 'laptop-mac', 'chair'
];

const TransactionScreen = ({ navigation, route }) => {
  const { theme } = useContext(ThemeContext);
  const { addTransaction, updateTransaction, transactions, categories, addCategory, addNotification, accounts } = useContext(DataContext);
  const { user, avatar } = useContext(AuthContext);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const selectionRef = useRef({ start: 0, end: 0 });
  const selectionMyRef = useRef({ start: 0, end: 0 });
  const [selectionState, setSelectionState] = useState({ start: 0, end: 0 });
  const [selectionMyState, setSelectionMyState] = useState({ start: 0, end: 0 });
  const amountRef = useRef('');
  const myContribRef = useRef('');

  const formatDisplay = (val) => {
    if (!val) return '0';
    return formatMoney(val);
  };

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const [aestheticAlertVisible, setAestheticAlertVisible] = useState(false);
  const [aestheticAlertConfig, setAestheticAlertConfig] = useState({ title: '', message: '', icon: 'info', color: '#6366F1' });

  const showAestheticAlert = (title, message, icon = 'info', color = '#6366F1') => {
    setAestheticAlertConfig({ title, message, icon, color });
    setAestheticAlertVisible(true);
  };
  const [name, setName] = useState('');
  const [isKonta, setIsKonta] = useState(false);
  const [type, setType] = useState('expense');
  const [categoryObj, setCategoryObj] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [customIcon, setCustomIcon] = useState('star');
  const [isPatungan, setIsPatungan] = useState(false);
  const [myContrib, setMyContrib] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef(null);

  // Animations
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

  useEffect(() => {
    Animated.stagger(80, [
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

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '').toString();
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (val) => {
    const oldText = amountRef.current || '';
    const oldSel = selectionRef.current.start;

    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');

    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = oldText.slice(0, oldSel - 2) + oldText.slice(oldSel);
    }

    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setAmount(formatted);
    amountRef.current = formatted;

    let newPos = formatted.length;
    let count = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (count >= digitsAfter) break;
      if (formatted[i] !== '.') {
        count++;
      }
      newPos = i;
    }

    setSelectionState({ start: newPos, end: newPos });
    selectionRef.current = { start: newPos, end: newPos };
  };

  const handleMyContribChange = (val) => {
    const oldText = myContribRef.current || '';
    const oldSel = selectionMyRef.current.start;

    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');

    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = oldText.slice(0, oldSel - 2) + oldText.slice(oldSel);
    }

    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setMyContrib(formatted);
    myContribRef.current = formatted;

    let newPos = formatted.length;
    let count = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (count >= digitsAfter) break;
      if (formatted[i] !== '.') {
        count++;
      }
      newPos = i;
    }

    setSelectionMyState({ start: newPos, end: newPos });
    selectionMyRef.current = { start: newPos, end: newPos };
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategoryObj(null);
    setCustomCategory('');
    setCustomIcon('star');
    if (newType === 'income') {
      setIsPatungan(false);
      setMyContrib('');
    }
  };

  // Baca parameter navigasi (misal: dari FAB Pemasukan atau Tagihan Lunas)
  useEffect(() => {
    if (route?.params?.type) {
      handleTypeChange(route.params.type);
    }
    if (route?.params?.predefinedName) {
      setName(route.params.predefinedName);
    }
    if (route?.params?.predefinedAmount) {
      const formatted = formatInput(route.params.predefinedAmount);
      setAmount(formatted);
      amountRef.current = formatted;
    }
    if (route?.params?.editingTransaction) {
      const tx = route.params.editingTransaction;
      const myName = user?.name || 'Kamu';
      const owner = (tx.owner || '').toLowerCase().trim();
      const normMe = (myName || '').toLowerCase().trim();
      const isMe = owner === normMe || owner.includes(normMe) || normMe.includes(owner);
      
      if (!isMe || tx.owner !== user.name) {
        showAestheticAlert('Akses Dibatasi', 'Kamu hanya bisa mengedit transaksi milikmu sendiri untuk menjaga integritas data pribadi Pasangan.', 'lock', theme.primary);
        setTimeout(() => navigation.goBack(), 2000);
        return;
      }
      setIsEditMode(true);
      setEditingId(tx.id);
      const formattedAmt = formatInput((tx.amount || 0).toString());
      setAmount(formattedAmt);
      amountRef.current = formattedAmt;
      setSelectionState({ start: formattedAmt.length, end: formattedAmt.length });
      selectionRef.current = { start: formattedAmt.length, end: formattedAmt.length };
      setName(tx.name);
      setType(tx.type);
      setIsKonta(tx.isJoint);
      setIsPatungan(tx.isPatungan);
      const formattedContrib = tx.myContrib ? formatInput(tx.myContrib.toString()) : '';
      setMyContrib(formattedContrib);
      myContribRef.current = formattedContrib;
      setSelectedAccountId(tx.type === 'transfer' ? tx.fromAccountId : tx.accountId);

      const cat = (categories[tx.type] || []).find(c => c.name === tx.category);
      if (cat) {
        setCategoryObj(cat);
      } else {
        setCategoryObj({ name: 'Lainnya', icon: tx.icon });
        setCustomCategory(tx.category);
        setCustomIcon(tx.icon);
      }
      if (tx.date) {
        setDate(new Date(tx.date));
      }
    }
  }, [route?.params?.type, route?.params?.predefinedName, route?.params?.predefinedAmount, route?.params?.editingTransaction, categories]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const myAccounts = accounts.filter(a => {
        const owner = (a.owner || '').toLowerCase().trim();
        const curName = (user?.name || '').toLowerCase().trim();
        return owner === curName || owner.includes(curName) || curName.includes(owner) || owner === '' || owner === 'kamu';
      });
      if (myAccounts.length > 0) {
        setSelectedAccountId(myAccounts[0].id);
      }
    }
  }, [accounts, user, selectedAccountId]);

  const calcPartnerContrib = () => {
    const total = Number(amount.replace(/\./g, '')) || 0;
    const mine = Number(myContrib.replace(/\./g, '')) || 0;
    const diff = total - mine;
    return diff > 0 ? diff : 0;
  };

  const handleSave = async () => {
    setLoading(true);
    let newId = editingId;
    try {
      let finalCategoryName = categoryObj?.name;
      let finalIcon = categoryObj?.icon;

      if (categoryObj?.name === 'Lainnya') {
        finalCategoryName = customCategory.trim();
        finalIcon = customIcon;
        if (!finalCategoryName) {
          Alert.alert('Data kategori kosong', 'Tuliskan nama kategori baru kamu terlebih dahulu!');
          setLoading(false);
          return;
        }
        await addCategory(type, { name: finalCategoryName, icon: finalIcon });
      }

      const finalTxName = name.trim() ? name.trim() : finalCategoryName;

      const rawAmount = amount.replace(/\./g, '');

      if (!rawAmount || !finalCategoryName || !selectedAccountId) {
        Alert.alert('Data belum lengkap', 'Pastikan nominal, kategori, dan dompet sumber sudah dipilih!');
        setLoading(false);
        return;
      }

      const numAmount = Number(rawAmount) || 0;
      let fMy = numAmount;
      let fPar = 0;

      if (type === 'income') {
        if (isKonta) {
          fMy = numAmount / 2;
          fPar = numAmount / 2;
        } else {
          fMy = numAmount;
          fPar = 0;
        }
      } else {
        if (isKonta) {
          fMy = numAmount / 2;
          fPar = numAmount / 2;
        } else if (isPatungan) {
          fMy = Number(myContrib.replace(/\./g, '')) || 0;
          fPar = calcPartnerContrib();
        } else {
          fMy = numAmount;
          fPar = 0;
        }
      }

      if (isEditMode) {
        const txUpdate = {
          name: finalTxName,
          amount: numAmount,
          type,
          category: finalCategoryName,
          icon: finalIcon || (type === 'income' ? 'payments' : 'receipt'),
          isJoint: isKonta,
          isPatungan: type === 'expense' ? (!isKonta && isPatungan) : false,
          myContrib: fMy,
          partnerContrib: fPar,
          date: date.toISOString(),
        };

        if (type === 'transfer') {
          txUpdate.fromAccountId = selectedAccountId;
          txUpdate.toAccountId = route.params.editingTransaction?.toAccountId;
        } else {
          txUpdate.accountId = selectedAccountId;
        }

        await updateTransaction(editingId, txUpdate);
      } else {
        newId = await addTransaction({
          name: finalTxName,
          amount: numAmount,
          type,
          category: finalCategoryName,
          icon: finalIcon || (type === 'income' ? 'payments' : 'receipt'),
          owner: user?.name || 'Kamu',
          isJoint: isKonta,
          isPatungan: type === 'expense' ? (!isKonta && isPatungan) : false,
          myContrib: fMy,
          partnerContrib: fPar,
          accountId: selectedAccountId,
          date: date.toISOString(),
        });
      }

      if (!isPatungan && !isKonta) {
        await addNotification({
          title: isEditMode ? 'Transaksi Diubah' : 'Transaksi Baru',
          body: `${user?.name || 'Kamu'} baru saja ${isEditMode ? 'mengubah' : 'mencatat'} ${type === 'income' ? 'pemasukan' : 'pengeluaran'} "${finalTxName}" sebesar Rp ${formatMoney(numAmount)}.`,
          icon: isEditMode ? 'edit' : (type === 'income' ? 'trending-up' : 'trending-down'),
          color: type === 'income' ? 'success' : 'error',
          sender: user?.name || 'Kamu',
          targetType: 'transaction',
          targetId: newId,
          targetName: finalTxName,
        });
      }

      Animated.parallel([
        Animated.timing(fadeAnims[0], { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnims[1], { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnims[2], { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnims[3], { toValue: 0, duration: 400, useNativeDriver: true })
      ]).start(() => {
        navigation.navigate('MainTabs', {
          screen: 'Dashboard',
          params: { highlightTxId: newId }
        });
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const getStyles = (t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: t.surface, zIndex: 50 },
    headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    headerBtn: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    main: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 150 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: t.onSurface, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 14, color: t.onSurfaceVariant, marginTop: 4, marginBottom: 24 },
    formCard: { backgroundColor: t.surfaceContainerLow, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: t.outlineVariant + '1A', overflow: 'hidden' },

    typeToggleWrap: { flexDirection: 'row', backgroundColor: t.surfaceContainerLowest, borderRadius: 16, padding: 4, marginBottom: 24 },
    typeBtnAct: { flex: 1, backgroundColor: t.primary, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    typeBtnIna: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    typeTextAct: { fontWeight: 'bold', color: t.onPrimary, fontSize: 12 },
    typeTextIna: { fontWeight: 'bold', color: t.onSurfaceVariant, fontSize: 12 },

    label: { fontSize: 10, fontWeight: 'bold', color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    nameInputWrapper: { marginBottom: 16 },
    nameInput: { backgroundColor: t.surfaceContainerLowest, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, fontWeight: 'bold', color: t.onSurface },

    catScroll: { marginBottom: 16 },
    catBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: t.surfaceContainerLowest, borderWidth: 1, borderColor: t.outlineVariant + '1A', marginRight: 8 },
    catBtnAct: { backgroundColor: t.primary, borderColor: t.primary },
    catText: { fontSize: 12, color: t.onSurfaceVariant, fontWeight: 'bold' },
    catTextAct: { fontSize: 12, color: t.onPrimary, fontWeight: 'bold' },

    customCatWrapper: { marginBottom: 24, backgroundColor: t.surfaceContainerLowest + '80', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: t.primary + '33' },
    customCatInput: { backgroundColor: t.surfaceContainerLowest, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, fontWeight: 'bold', color: t.onSurface, borderWidth: 1, borderColor: t.outlineVariant + '33' },
    iconPickerScroll: { marginTop: 8 },
    iconPickerBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: t.surfaceContainer, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    iconPickerBtnAct: { backgroundColor: t.primaryContainer, borderColor: t.primary },

    nominalInputWrapper: { position: 'relative', justifyContent: 'center', marginBottom: 24, marginTop: 12 },
    nominalCurrency: { position: 'absolute', left: 20, zIndex: 10, color: t.primary, fontWeight: 'bold', fontSize: 20 },
    nominalInput: { backgroundColor: t.surfaceContainerLowest, borderRadius: 24, paddingVertical: 20, paddingLeft: 64, paddingRight: 24, fontSize: 30, fontWeight: 'bold', color: t.onSurface },
    inputAmount: { backgroundColor: t.surfaceContainerLowest, borderRadius: 24, paddingVertical: 20, paddingLeft: 64, paddingRight: 24, fontSize: 30, fontWeight: 'bold', color: t.onSurface },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surfaceContainerLowest + '80', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: t.outlineVariant + '1A', marginBottom: 24 },
    switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    switchIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.primaryContainer + '4D', justifyContent: 'center', alignItems: 'center' },
    switchTitle: { fontSize: 14, fontWeight: 'bold', color: t.onSurface },
    switchSubtitle: { fontSize: 10, color: t.onSurfaceVariant },

    patunganCard: { backgroundColor: t.surfaceContainerLowest, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: t.primary + '1A', marginBottom: 24 },
    patunganHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    pHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: t.primary + '1A', justifyContent: 'center', alignItems: 'center' },
    pTitle: { fontSize: 14, fontWeight: 'bold', color: t.onSurface },
    pSplitRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: t.outlineVariant + '1A', paddingTop: 16 },
    pCol: { flex: 1 },
    pLabel: { fontSize: 10, fontWeight: 'bold', color: t.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    pInputWrapper: { position: 'relative', justifyContent: 'center' },
    pCurrency: { position: 'absolute', left: 12, zIndex: 10, color: t.primary, fontSize: 10, fontWeight: 'bold' },
    pInput: { backgroundColor: t.surfaceContainerLow, borderRadius: 12, paddingVertical: 10, paddingLeft: 40, paddingRight: 12, fontSize: 14, fontWeight: 'bold', color: t.onSurface, borderWidth: 1, borderColor: t.outlineVariant + '1A' },
    pInputDisabled: { backgroundColor: t.surfaceContainerLow + '80', borderRadius: 12, paddingVertical: 10, paddingLeft: 40, paddingRight: 12, fontSize: 14, fontWeight: 'bold', color: t.onSurfaceVariant, borderWidth: 1, borderColor: t.outlineVariant + '0D' },
    pCurrencyDisabled: { position: 'absolute', left: 12, zIndex: 10, color: t.onSurfaceVariant + '80', fontSize: 10, fontWeight: 'bold' },
    pInfo: { flexDirection: 'row', gap: 8, backgroundColor: t.primary + '0D', padding: 12, borderRadius: 12, marginTop: 16 },
    pInfoText: { fontSize: 10, color: t.onSurfaceVariant, flex: 1 },

    submitBtn: { borderRadius: 32, overflow: 'hidden' },
    submitGradient: { paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    submitText: { color: t.onPrimary, fontWeight: 'bold', fontSize: 18 },
    submitIconBg: { backgroundColor: t.onPrimary + '1A', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

    recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, marginTop: 32 },
    recentTitle: { fontSize: 20, fontWeight: '900', color: t.onSurface, letterSpacing: -0.5 },
    txItem: { backgroundColor: t.surfaceContainer, padding: 16, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    txIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: t.surfaceContainerLowest, justifyContent: 'center', alignItems: 'center' },
    txName: { fontWeight: 'bold', fontSize: 14, color: t.onSurface },
    txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    txBadgeKita: { fontSize: 9, backgroundColor: t.primaryContainer + '33', color: t.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, fontWeight: 'bold', fontStyle: 'italic', textTransform: 'uppercase' },
    txBadgePribadi: { fontSize: 9, backgroundColor: t.outlineVariant + '33', color: t.onSurfaceVariant, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, fontWeight: 'bold', fontStyle: 'italic', textTransform: 'uppercase' },
    txTime: { fontSize: 10, color: t.onSurfaceVariant },
    txRight: { alignItems: 'flex-end' },
    txAmountNeg: { fontSize: 14, fontWeight: 'bold', color: t.error },
    txAmountPos: { fontSize: 14, fontWeight: 'bold', color: t.primary },
    txCatTag: { fontSize: 9, color: t.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

    accountPickerTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
    accountScroll: { marginBottom: 24 },
    accountBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: t.surfaceContainerLowest, borderWidth: 1, borderColor: t.outlineVariant + '1A', marginRight: 10 },
    accountBtnAct: { borderColor: t.primary, borderWidth: 2 },
    accountIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    accountName: { fontSize: 13, fontWeight: 'bold' },
    accountBalance: { fontSize: 10, fontWeight: '500' },
  });

  const styles = getStyles(theme);

  const currentCats = type === 'expense' ? categories.expense : categories.income;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

      <Animated.View style={[styles.header, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.headerBtn, { backgroundColor: theme.surfaceContainerLow }]}>
          <MaterialIcons name="arrow-back-ios-new" size={20} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.onSurface }]}>{isEditMode ? 'Edit Transaksi' : 'Catat Transaksi'}</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.main} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <Text style={styles.pageTitle}>Catat transaksi baru.</Text>
          <Text style={styles.pageSubtitle}>Jangan sampai lupa uang kita lari ke mana.</Text>
        </Animated.View>

        <Animated.View style={[styles.formCard, { opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }]}>
          <View style={styles.typeToggleWrap}>
            <TouchableOpacity style={type === 'expense' ? styles.typeBtnAct : styles.typeBtnIna} onPress={() => handleTypeChange('expense')}>
              <Text style={type === 'expense' ? styles.typeTextAct : styles.typeTextIna}>Pengeluaran</Text>
            </TouchableOpacity>
            <TouchableOpacity style={type === 'income' ? styles.typeBtnAct : styles.typeBtnIna} onPress={() => handleTypeChange('income')}>
              <Text style={type === 'income' ? styles.typeTextAct : styles.typeTextIna}>Pemasukan</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nama Transaksi (Opsional)</Text>
          <View style={styles.nameInputWrapper}>
            <TextInput
              style={styles.nameInput}
              placeholder={type === 'expense' ? "Cth: Beli Kopi (Boleh kosong)" : "Cth: Gaji (Boleh kosong)"}
              placeholderTextColor={theme.onSurfaceVariant}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginLeft: 4 }}>
            <Text style={[styles.label, { marginBottom: 0, marginLeft: 0 }]}>Pilih Kategori</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Categories")}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "bold" }}>Kelola</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {currentCats.map(cat => {
              const isActive = categoryObj?.name === cat.name;
              return (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.catBtn, isActive && styles.catBtnAct]}
                  onPress={() => {
                    setCategoryObj(cat);
                    setCustomCategory('');
                  }}
                >
                  <MaterialIcons name={cat.icon} size={16} color={isActive ? theme.onPrimary : theme.onSurfaceVariant} style={{ marginRight: 6 }} />
                  <Text style={isActive ? styles.catTextAct : styles.catText}>{cat.name}</Text>
                </TouchableOpacity>
              )
            })}

            <TouchableOpacity
              style={[styles.catBtn, categoryObj?.name === 'Lainnya' && styles.catBtnAct]}
              onPress={() => {
                setCategoryObj({ name: 'Lainnya', icon: 'more-horiz' });
                setCustomCategory('');
              }}
            >
              <MaterialIcons name="add-circle-outline" size={16} color={categoryObj?.name === 'Lainnya' ? theme.onPrimary : theme.onSurfaceVariant} style={{ marginRight: 6 }} />
              <Text style={categoryObj?.name === 'Lainnya' ? styles.catTextAct : styles.catText}>Lainnya</Text>
            </TouchableOpacity>
          </ScrollView>

          {categoryObj?.name === 'Lainnya' && (
            <View style={styles.customCatWrapper}>
              <Text style={[styles.label, { marginLeft: 0 }]}>Tentukan Nama & Ikon Baru</Text>
              <TextInput
                style={styles.customCatInput}
                placeholder="Misal: Servis Motor"
                placeholderTextColor={theme.onSurfaceVariant}
                value={customCategory}
                onChangeText={setCustomCategory}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPickerScroll}>
                {availableCustomIcons.map(ic => (
                  <TouchableOpacity key={ic} style={[styles.iconPickerBtn, customIcon === ic && styles.iconPickerBtnAct]} onPress={() => setCustomIcon(ic)}>
                    <MaterialIcons name={ic} size={20} color={customIcon === ic ? theme.primary : theme.onSurfaceVariant} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          <Text style={styles.label}>Tanggal Transaksi</Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS === 'web') {
                dateInputRef.current?.showPicker?.() || dateInputRef.current?.click();
              } else {
                setShowDatePicker(true);
              }
            }}
            style={[styles.nameInput, { marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }]}
          >
            <MaterialIcons name="calendar-today" size={20} color={theme.primary} />
            <Text style={{ color: theme.onSurface, fontSize: 16, flex: 1 }}>
              {dayjs(date).format('DD MMMM YYYY')}
            </Text>
            {Platform.OS === 'web' && (
              <input 
                ref={dateInputRef}
                type="date" 
                value={dayjs(date).format('YYYY-MM-DD')}
                onChange={(e) => {
                  if (e.target.value) setDate(new Date(e.target.value));
                }}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
            )}
          </TouchableOpacity>

          {showDatePicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          <Text style={styles.label}>Nominal Total</Text>
          <View style={styles.nominalInputWrapper}>
            <Text style={styles.nominalCurrency}>IDR</Text>
            <TextInput
              style={styles.inputAmount}
              placeholder="0"
              placeholderTextColor={theme.onSurfaceVariant}
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              selection={selectionState}
              onSelectionChange={(e) => {
                const sel = e.nativeEvent.selection;
                setSelectionState(sel);
                selectionRef.current = sel;
              }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <View style={styles.switchIcon}>
                <MaterialIcons name="group" size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={styles.switchTitle}>Bagi Rata 50:50? (Uang Bersama)</Text>
                <Text style={styles.switchSubtitle}>Beban dibagi dua sama rata dengan Pasangan</Text>
              </View>
            </View>
            <Switch
              value={isKonta}
              onValueChange={(val) => {
                setIsKonta(val);
                if (val) setIsPatungan(false);
              }}
              trackColor={{ false: theme.surfaceContainerHighest, true: theme.primaryContainer }}
              thumbColor={isKonta ? theme.primary : theme.onSurfaceVariant}
            />
          </View>

          {type === 'expense' && (
            <View style={styles.patunganCard}>
              <View style={styles.patunganHeader}>
                <View style={styles.pHeaderLeft}>
                  <View style={styles.pIcon}>
                    <MaterialIcons name="call-split" size={20} color={theme.primary} />
                  </View>
                  <Text style={styles.pTitle}>Split Porsi (Custom)</Text>
                </View>
                <Switch
                  value={isPatungan}
                  onValueChange={(val) => {
                    setIsPatungan(val);
                    if (val) setIsKonta(false);
                  }}
                  trackColor={{ false: theme.surfaceContainerHighest, true: theme.primaryContainer }}
                  thumbColor={isPatungan ? theme.primary : theme.onSurfaceVariant}
                />
              </View>

              {(isKonta || isPatungan) && (
                <View style={styles.pSplitRow}>
                  {isKonta ? (
                    <View style={{ flex: 1, backgroundColor: theme.surfaceContainerLow, padding: 12, borderRadius: 16, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: theme.primary, fontWeight: 'bold' }}>BAGI RATA 50:50</Text>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.onSurface }}>Rp {formatMoney((Number(amount.replace(/\./g, '')) || 0) / 2)} / orang</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.pCol}>
                        <Text style={styles.pLabel}>Kontribusi Kamu</Text>
                        <View style={styles.pInputWrapper}>
                          <Text style={styles.pCurrency}>IDR</Text>
                          <TextInput
                            style={styles.pInput}
                            placeholder="0"
                            keyboardType="numeric"
                            placeholderTextColor={theme.onSurfaceVariant}
                            value={myContrib}
                            onChangeText={handleMyContribChange}
                            selection={selectionMyState}
                            onSelectionChange={(e) => {
                              const sel = e.nativeEvent.selection;
                              setSelectionMyState(sel);
                              selectionMyRef.current = sel;
                            }}
                          />
                        </View>
                      </View>
                      <View style={styles.pCol}>
                        <Text style={styles.pLabel}>Beban Pasangan</Text>
                        <View style={styles.pInputWrapper}>
                          <Text style={styles.pCurrencyDisabled}>IDR</Text>
                          <TextInput
                            style={styles.pInputDisabled}
                            value={formatMoney(calcPartnerContrib())}
                            editable={false}
                          />
                        </View>
                      </View>
                    </>
                  )}
                </View>
              )}

              <View style={styles.pInfo}>
                <MaterialIcons name="info" size={16} color={theme.primary} />
                <Text style={styles.pInfoText}>
                  {isKonta
                    ? 'Saldo kamu & pasangan akan terpotong otomatis 50:50.'
                    : (isPatungan
                      ? 'Porsi pasangan akan ditagihkan untuk konfirmasi.'
                      : 'Nyalakan fitur ini jika ingin beban dibagi dengan Pasangan.')}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.accountPickerTitle}>
            <Text style={[styles.label, { marginBottom: 0 }]}>Sumber Dana (Pilih Dompet)</Text>
            <TouchableOpacity onPress={() => navigation.navigate("AddAccount")}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "bold" }}>+ Baru</Text>
            </TouchableOpacity>
          </View>

          {(() => {
            const myAccounts = (accounts || []).filter(acc => acc.owner === user?.name);

            if (myAccounts.length === 0) {
              return (
                <TouchableOpacity
                  style={[styles.switchRow, { borderStyle: 'dashed', borderColor: theme.primary }]}
                  onPress={() => navigation.navigate("AddAccount")}
                >
                  <Text style={{ color: theme.primary, fontWeight: 'bold', flex: 1, textAlign: 'center' }}>+ Belum ada dompet pribadi. Klik untuk tambah.</Text>
                </TouchableOpacity>
              );
            }
            return (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
                {myAccounts.map(acc => {
                  const isActive = selectedAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.accountBtn, isActive && styles.accountBtnAct]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <View style={[styles.accountIcon, { backgroundColor: acc.color + '22' }]}>
                        <MaterialIcons name={acc.icon || 'payments'} size={18} color={acc.color || theme.primary} />
                      </View>
                      <View>
                        <Text style={[styles.accountName, { color: theme.onSurface }]}>{acc.name}</Text>
                        <Text style={[styles.accountBalance, { color: theme.onSurfaceVariant }]}>Rp {formatMoney(acc.balance)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            );
          })()}

          <TouchableOpacity
            style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={loading}
          >
            <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {loading ? (
                <>
                  <ActivityIndicator color={theme.onPrimary} size="small" />
                  <Text style={styles.submitText}>Memproses...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitText}>{isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi'}</Text>
                  <View style={styles.submitIconBg}>
                    <MaterialIcons name={isEditMode ? 'check' : 'save'} size={20} color={theme.onPrimary} />
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Riwayat Kamu</Text>
          </View>

          {(transactions || []).slice(0, 5).map(tx => (
            <View key={tx.id} style={styles.txItem}>
              <View style={styles.txLeft}>
                <View style={styles.txIconBg}>
                  <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'payments' : 'receipt')} size={24} color={theme.primary} />
                </View>
                <View>
                  <Text style={styles.txName}>{tx.name}</Text>
                  <View style={styles.txMeta}>
                    <Text style={tx.isJoint ? styles.txBadgeKita : styles.txBadgePribadi}>
                      {tx.isPatungan ? 'PATUNGAN' : tx.isJoint ? 'KITA' : String(tx.owner || myName).toUpperCase()}
                    </Text>
                    <Text style={styles.txTime}>
                      {new Date(tx.date).toString() !== 'Invalid Date'
                        ? new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                        : '-'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={tx.type === 'income' ? styles.txAmountPos : styles.txAmountNeg}>
                  {tx.type === 'income' ? '+' : '-'} {formatMoney(tx.amount || 0)}
                </Text>
                {tx.isPatungan ? (
                  <Text style={styles.txCatTag}>Psg: {formatMoney(tx.partnerContrib || 0)}</Text>
                ) : (
                  <Text style={styles.txCatTag}>{tx.category}</Text>
                )}
              </View>
            </View>
          ))}
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default TransactionScreen;

