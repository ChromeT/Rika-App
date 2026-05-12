import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';

const TransferScreen = ({ navigation, route }) => {
  const { theme } = useContext(ThemeContext);
  const { accounts, addTransfer, updateTransaction } = useContext(DataContext);
  const { user, avatar } = useContext(AuthContext);

  const [fromId, setFromId] = useState(null);
  const [toId, setToId] = useState(null);
  const [amount, setAmount] = useState('');
  const selectionRef = useRef({ start: 0, end: 0 });
  const [selectionState, setSelectionState] = useState({ start: 0, end: 0 });
  const amountRef = useRef('');
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Baca data jika dalam mode edit
  useEffect(() => {
    if (route.params?.editingTransaction) {
      const tx = route.params.editingTransaction;
      setIsEditMode(true);
      setEditingId(tx.id);
      setFromId(tx.fromAccountId);
      setToId(tx.toAccountId);
      const formatted = formatInput(tx.amount.toString());
      setAmount(formatted);
      amountRef.current = formatted;
    }
  }, [route.params?.editingTransaction]);
  
  // Get only my accounts
  const myAccounts = (accounts || []).filter(acc => acc.owner === user?.name);

  const formatMoney = (val) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val);
  };

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
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

  const handleTransfer = async () => {
    const rawAmount = amount.replace(/\./g, '');
    const numAmount = Number(rawAmount);

    if (!fromId || !toId || !rawAmount) {
      Alert.alert('Data belum lengkap', 'Pilih dompet asal, tujuan, dan masukkan nominalnya.');
      return;
    }
    if (fromId === toId) {
      Alert.alert('Gagal', 'Dompet asal dan tujuan tidak boleh sama.');
      return;
    }
    if (numAmount <= 0) {
      Alert.alert('Gagal', 'Nominal harus lebih dari 0.');
      return;
    }

    setLoading(true);
    try {
      let finalId = editingId;
      if (isEditMode) {
        const fromAcc = accounts.find(a => a.id === fromId);
        const toAcc = accounts.find(a => a.id === toId);

        await updateTransaction(editingId, {
          amount: numAmount,
          myContrib: numAmount, // PENTING: Biar nominal di riwayat ikut berubah
          fromAccountId: fromId,
          toAccountId: toId,
          type: 'transfer',
          name: `Transfer: ${fromAcc?.name || '...'} ➔ ${toAcc?.name || '...'}`,
          category: 'Transfer',
        });
        Alert.alert('Berhasil', 'Transfer berhasil diperbarui!');
      } else {
        finalId = await addTransfer(fromId, toId, rawAmount);
        Alert.alert('Mantap', 'Dana berhasil dipindahkan!');
      }

      // Langsung balik ke Dashboard biar 'sat-set'
      navigation.navigate('MainTabs', { 
        screen: 'Dashboard',
        params: { highlightTxId: finalId } 
      });
    } catch (e) {
      Alert.alert('Gagal', `Terjadi kesalahan saat ${isEditMode ? 'memperbarui' : 'memindahkan'} dana.`);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: theme.surface },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarWrapper: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: theme.surfaceContainer, borderWidth: 1, borderColor: theme.outlineVariant + '33' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.primary },
    main: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
    card: { backgroundColor: theme.surfaceContainerLow, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: theme.outlineVariant + '1A' },
    label: { fontSize: 10, fontWeight: 'bold', color: theme.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
    
    walletScroll: { marginBottom: 24 },
    walletBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: theme.surfaceContainerLowest, borderWidth: 1, borderColor: theme.outlineVariant + '1A', marginRight: 10 },
    walletBtnAct: { borderColor: theme.primary, borderWidth: 2 },
    walletIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    walletName: { fontSize: 13, fontWeight: 'bold', color: theme.onSurface },
    walletBalance: { fontSize: 10, color: theme.onSurfaceVariant },

    arrowWrap: { alignItems: 'center', marginVertical: 16 },
    arrowIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary + '1A', justifyContent: 'center', alignItems: 'center' },

    inputWrapper: { position: 'relative', justifyContent: 'center', marginBottom: 32 },
    currency: { position: 'absolute', left: 20, zIndex: 10, color: theme.primary, fontWeight: 'bold', fontSize: 20 },
    input: { backgroundColor: theme.surfaceContainerLowest, borderRadius: 24, paddingVertical: 20, paddingLeft: 64, paddingRight: 24, fontSize: 30, fontWeight: 'bold', color: theme.onSurface },

    submitBtn: { borderRadius: 32, overflow: 'hidden' },
    submitGradient: { paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    submitText: { color: theme.onPrimary, fontWeight: 'bold', fontSize: 18 },
  });

  const renderWalletPicker = (selectedId, onSelect, title) => (
    <View>
      <Text style={styles.label}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll}>
        {myAccounts.map(acc => {
          const isActive = selectedId === acc.id;
          return (
            <TouchableOpacity 
              key={acc.id} 
              style={[styles.walletBtn, isActive && styles.walletBtnAct]}
              onPress={() => onSelect(acc.id)}
            >
              <View style={[styles.walletIcon, { backgroundColor: acc.color + '22' }]}>
                <MaterialIcons name={acc.icon || 'payments'} size={18} color={acc.color || theme.primary} />
              </View>
              <View>
                <Text style={styles.walletName}>{acc.name}</Text>
                <Text style={styles.walletBalance}>Rp {formatMoney(acc.balance)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrapper}>
            {avatar?.startsWith('file://') || avatar?.startsWith('data:image') ? (
              <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <MaterialIcons name={avatar || 'person'} size={24} color={theme.primary} />
            )}
          </View>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Transfer' : 'Pindah Dana'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <MaterialIcons name="close" size={24} color={theme.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.main}>
        <View style={styles.card}>
          {renderWalletPicker(fromId, setFromId, 'Dari Dompet (Sumber)')}

          <View style={styles.arrowWrap}>
            <View style={styles.arrowIcon}>
              <MaterialIcons name="arrow-downward" size={24} color={theme.primary} />
            </View>
          </View>

          {renderWalletPicker(toId, setToId, 'Ke Dompet (Tujuan)')}

          <Text style={[styles.label, { marginTop: 24 }]}>Nominal Transfer</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currency}>IDR</Text>
            <TextInput 
              style={styles.input}
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

          <TouchableOpacity 
            style={[styles.submitBtn, { opacity: loading ? 0.6 : 1 }]} 
            activeOpacity={0.8} 
            onPress={handleTransfer}
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
                  <Text style={styles.submitText}>{isEditMode ? 'Simpan Perubahan' : 'Proses Transfer'}</Text>
                  <MaterialIcons name={isEditMode ? 'check' : 'send'} size={20} color={theme.onPrimary} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TransferScreen;
