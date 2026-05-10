import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Image, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';

const availableCustomIcons = [
  'star', 'pets', 'child-friendly', 'cake', 'favorite', 'emoji-events',
  'payments', 'account-balance-wallet', 'savings', 'paid', 'monetization-on', 'trending-up', 'work', 'volunteer-activism', 'card-giftcard',
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

  const formatMoney = (amount) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount);

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [isKonta, setIsKonta] = useState(false); 
  const [type, setType] = useState('expense');
  const [categoryObj, setCategoryObj] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [customIcon, setCustomIcon] = useState('star');
  const [isPatungan, setIsPatungan] = useState(false);
  const [myContrib, setMyContrib] = useState('');

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '').toString();
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (val) => {
    const oldText = amountRef.current || '';
    const oldSel = selectionRef.current.start;
    
    let processedVal = val;
    // Fix: Jika user menghapus titik, hapus juga angka di depannya
    if (val.length === oldText.length - 1 && oldText[oldSel - 1] === '.') {
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
    if (val.length === oldText.length - 1 && oldText[oldSel - 1] === '.') {
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
      setIsEditMode(true);
      setEditingId(tx.id);
      const formattedAmt = formatInput((tx.amount || 0).toString());
      setAmount(formattedAmt);
      amountRef.current = formattedAmt;
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
    }
  }, [route?.params?.type, route?.params?.predefinedName, route?.params?.predefinedAmount, route?.params?.editingTransaction, categories]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const myAccounts = accounts.filter(a => a.owner === user?.name);
      if (myAccounts.length > 0) {
        setSelectedAccountId(myAccounts[0].id);
      }
    }
  }, [accounts, user, selectedAccountId]);

  const calcPartnerContrib = () => {
    const total = Number(amount.replace(/\./g, '')) || 0;
    const mine = Number(myContrib) || 0;
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
          Alert.alert('Data kategori kosong', 'Tuliskan nama kategori baru Anda terlebih dahulu!');
          setLoading(false);
          return;
        }
        await addCategory(type, { name: finalCategoryName, icon: finalIcon });
      }

      const finalTxName = name.trim() ? name.trim() : finalCategoryName;

      // Hapus titik sebelum diproses angkanya
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
          fMy = Number(myContrib) || 0;
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
        };

        if (type === 'transfer') {
          txUpdate.fromAccountId = selectedAccountId;
          // Ambil toAccountId lama dari parameter route
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
          owner: user?.name || 'Saya', 
          isJoint: isKonta,
          isPatungan: type === 'expense' ? (!isKonta && isPatungan) : false,
          myContrib: fMy,
          partnerContrib: fPar,
          accountId: selectedAccountId,
        });
      }

      await addNotification({
        title: isEditMode ? 'Transaksi Diperbarui' : 'Transaksi Baru',
        body: `${user?.name || 'Pasangan'} baru saja ${isEditMode ? 'mengubah' : 'mencatat'} ${type === 'income' ? 'pemasukan' : 'pengeluaran'} "${finalTxName}" sebesar Rp ${formatMoney(numAmount)}.`,
        icon: type === 'income' ? 'payments' : 'shopping-bag',
        color: type === 'income' ? 'primary' : 'error',
        sender: user?.name || 'Saya',
        targetType: 'transaction',
        targetId: newId,
        targetName: finalTxName,
      });

      // Langsung balik ke Dashboard biar terasa instant + Highlight
      navigation.navigate('MainTabs', { 
        screen: 'Dashboard',
        params: { highlightTxId: newId } 
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: t.surface, zIndex: 50 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrapper: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: t.surfaceContainer, borderWidth: 1, borderColor: t.outlineVariant + '33' },
    avatar: { width: '100%', height: '100%' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: t.primary, letterSpacing: -0.5 },
    main: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: t.onSurface, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 14, color: t.onSurfaceVariant, marginTop: 4, marginBottom: 24 },
    formCard: { backgroundColor: t.surfaceContainerLow, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: t.outlineVariant + '1A', overflow: 'hidden' },
    
    typeToggleWrap: { flexDirection: 'row', backgroundColor: t.surfaceContainerLowest, borderRadius: 16, padding: 4, marginBottom: 24 },
    typeBtnAct: { flex: 1, backgroundColor: t.primaryContainer, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    typeBtnIna: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    typeTextAct: { fontWeight: 'bold', color: t.onPrimaryContainer, fontSize: 12 },
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
          <Text style={styles.headerTitle}>{user?.name || 'Saya'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: 8, backgroundColor: theme.surfaceContainerHighest, borderRadius: 20 }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={20} color={theme.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.main} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Catat transaksi baru.</Text>
        <Text style={styles.pageSubtitle}>Jangan sampai lupa uang kita lari ke mana.</Text>

        <View style={styles.formCard}>
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
              placeholderTextColor={theme.surfaceContainerHighest}
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
              <Text style={[styles.label, {marginLeft: 0}]}>Tentukan Nama & Ikon Baru</Text>
              <TextInput 
                style={styles.customCatInput}
                placeholder="Misal: Servis Motor"
                placeholderTextColor={theme.surfaceContainerHighest}
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

          <Text style={styles.label}>Nominal Total</Text>
          <View style={styles.nominalInputWrapper}>
            <Text style={styles.nominalCurrency}>IDR</Text>
            <TextInput 
              style={styles.inputAmount}
              placeholder="0"
              placeholderTextColor={theme.surfaceContainerHighest}
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
                <MaterialIcons name={type === 'income' ? 'account-balance-wallet' : 'account-tree'} size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={styles.switchTitle}>Uang Bersama?</Text>
                <Text style={styles.switchSubtitle}>
                  {type === 'income' 
                    ? (isKonta ? 'Masuk ke tabungan Kita' : 'Hanya tabungan Pribadi') 
                    : 'Serap dari saldo Kita 50:50'}
                </Text>
              </View>
            </View>
            <Switch 
              value={isKonta} 
              onValueChange={setIsKonta}
              trackColor={{ false: theme.surfaceContainerHighest, true: theme.primaryContainer }}
              thumbColor={isKonta ? theme.primary : theme.onSurfaceVariant}
            />
          </View>

          {type === 'expense' && (
            <View style={styles.patunganCard}>
              <View style={styles.patunganHeader}>
                <View style={styles.pHeaderLeft}>
                  <View style={styles.pIcon}>
                    <MaterialIcons name="group" size={20} color={theme.primary} />
                  </View>
                  <Text style={styles.pTitle}>Aktifkan Patungan</Text>
                </View>
                <Switch 
                  value={isKonta ? false : isPatungan} 
                  disabled={isKonta}
                  onValueChange={setIsPatungan}
                  trackColor={{ false: theme.surfaceContainerHighest, true: theme.primaryContainer }}
                  thumbColor={(isPatungan && !isKonta) ? theme.primary : theme.onSurfaceVariant}
                />
              </View>

              {(!isKonta && isPatungan) && (
                <View style={styles.pSplitRow}>
                  <View style={styles.pCol}>
                    <Text style={styles.pLabel}>Kontribusi Saya</Text>
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
                </View>
              )}
              
              <View style={styles.pInfo}>
                <MaterialIcons name="info" size={16} color={theme.primary} />
                <Text style={styles.pInfoText}>
                  {isKonta 
                    ? 'Karena Bersama aktif, fitur Patungan dimatikan & beban terbagi 50:50.' 
                    : (isPatungan 
                        ? 'Kalkulasi uang Anda dan Pasangan (Beban Pasangan dihitung otomatis).' 
                        : 'Nyalakan fitur ini jika transaksi pribadi ingin dibebankan parsial.')}
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
            <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.submitGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
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
        </View>

        <View>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Riwayat Anda</Text>
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
                      {tx.isPatungan ? 'PATUNGAN' : tx.isJoint ? 'KITA' : 'PRIBADI'}
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
        </View>

      </ScrollView>
    </View>
  );
};

export default TransactionScreen;
