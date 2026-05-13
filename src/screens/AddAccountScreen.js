import React, { useContext, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch, Animated } from 'react-native';
import Text from '../components/ThemeText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';

const ACCOUNT_TYPES = [
  { id: 'cash', name: 'Tunai / Cash', icon: 'payments', color: '#10B981' },
  { id: 'bank', name: 'Rekening Bank', icon: 'account-balance', color: '#3B82F6' },
  { id: 'wallet', name: 'E-Wallet', icon: 'account-balance-wallet', color: '#F59E0B' },
  { id: 'crypto', name: 'Crypto', icon: 'currency-bitcoin', color: '#F43F5E' },
  { id: 'stock', name: 'Saham / Reksadana', icon: 'show-chart', color: '#8B5CF6' },
  { id: 'gold', name: 'Emas', icon: 'stars', color: '#EAB308' },
  { id: 'other', name: 'Lainnya', icon: 'category', color: '#6B7280' },
];

const AddAccountScreen = ({ route }) => {
  const navigation = useNavigation();
  const { theme } = useContext(ThemeContext);
  const { addAccount, updateAccount } = useContext(DataContext);

  const editingAccount = route.params?.account;
  const isEditing = !!editingAccount;

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [name, setName] = useState(editingAccount?.name || '');
  const [type, setType] = useState(editingAccount?.type || 'cash');
  const [balance, setBalance] = useState(editingAccount?.balance ? formatInput(editingAccount.balance.toString()) : '');
  const selectionRef = useRef({ start: 0, end: 0 });
  const [selectionState, setSelectionState] = useState({ start: 0, end: 0 });
  const balanceRef = useRef(editingAccount?.balance ? formatInput(editingAccount.balance.toString()) : '');
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

  React.useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnims[0], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[0], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[1], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[1], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[2], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[2], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[3], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[3], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(fadeAnims[0], { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnims[1], { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnims[2], { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnims[3], { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnims[0], { toValue: -20, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnims[1], { toValue: -20, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnims[2], { toValue: -20, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnims[3], { toValue: -20, duration: 300, useNativeDriver: true })
    ]).start(() => navigation.goBack());
  };

  const handleBalanceChange = (val) => {
    const oldText = balanceRef.current || '';
    const oldSel = selectionRef.current.start;
    
    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');

    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = oldText.slice(0, oldSel - 2) + oldText.slice(oldSel);
    }

    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setBalance(formatted);
    balanceRef.current = formatted;

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

  const handleSave = async () => {
    if (!name.trim() || !balance.trim()) {
      Alert.alert('Error', 'Nama dan Saldo awal harus diisi!');
      return;
    }

    setLoading(true);
    const selectedType = ACCOUNT_TYPES.find(t => t.id === type);

    try {
      const rawBalance = balance.replace(/\./g, '');
      const accountData = {
        name: name.trim(),
        type: type,
        balance: Number(rawBalance),
        icon: selectedType.icon,
        color: selectedType.color,
      };

      if (isEditing) {
        await updateAccount(editingAccount.id, accountData);
      } else {
        await addAccount(accountData);
      }
      handleBack();
    } catch (e) {
      if (e.message === 'DUPLICATE_NAME') {
        Alert.alert('Nama Sudah Ada', 'Nama sumber dana sudah ada! Gunakan nama lain agar tidak bingung.');
      } else {
        Alert.alert('Error', `Gagal ${isEditing ? 'memperbarui' : 'menyimpan'} akun`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Animated.View style={[styles.header, { backgroundColor: theme.surface, opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
        <TouchableOpacity onPress={handleBack}>
          <MaterialIcons name="close" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.onSurface }]}>
          {isEditing ? 'Edit Sumber Dana' : 'Tambah Sumber Dana'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[styles.saveBtn, { color: theme.primary }]}>Simpan</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>NAMA SUMBER (Contoh: BCA, GoPay, Dompet)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface }]}
            placeholder="Nama Dompet / Akun"
            placeholderTextColor={theme.onSurfaceVariant}
            value={name}
            onChangeText={setName}
          />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>SALDO SAAT INI (RP)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, fontSize: 24, fontWeight: 'bold' }]}
            placeholder="0"
            placeholderTextColor={theme.onSurfaceVariant}
            keyboardType="numeric"
            value={balance}
            onChangeText={handleBalanceChange}
            selection={selectionState}
            onSelectionChange={(e) => {
              const sel = e.nativeEvent.selection;
              setSelectionState(sel);
              selectionRef.current = sel;
            }}
          />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>JENIS SUMBER</Text>
          <View style={styles.typeGrid}>
            {ACCOUNT_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setType(item.id)}
                style={[
                  styles.typeItem,
                  { backgroundColor: theme.surfaceContainerLow },
                  type === item.id && { borderColor: theme.primary, borderWidth: 2 }
                ]}
              >
                <MaterialIcons name={item.icon} size={24} color={type === item.id ? theme.primary : theme.onSurfaceVariant} />
                <Text style={[styles.typeText, { color: type === item.id ? theme.onSurface : theme.onSurfaceVariant }]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  saveBtn: { fontSize: 16, fontWeight: 'bold' },
  content: { padding: 20 },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginTop: 16 },
  input: { padding: 16, borderRadius: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  typeItem: { width: '48%', padding: 16, borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: 'transparent' },
  typeText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, marginTop: 24, marginBottom: 40 },
  switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  switchTitle: { fontSize: 14, fontWeight: 'bold' },
  switchSubtitle: { fontSize: 11 },
});

export default AddAccountScreen;
