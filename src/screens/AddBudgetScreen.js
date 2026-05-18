import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import Text from '../components/ThemeText';
import TextInput from '../components/ThemeTextInput';
import { formatMoney } from '../utils/formatUtils';
import { useNavigation } from '@react-navigation/native';

const AddBudgetScreen = () => {
  const { theme } = useContext(ThemeContext);
  const { addBudget } = useContext(DataContext);
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('daily'); // 'daily' | 'monthly' | 'fixed'
  const [icon, setIcon] = useState('restaurant');
  const [isSaving, setIsSaving] = useState(false);

  const amountRef = useRef('');
  const selectionTargetRef = useRef({ start: 0, end: 0 });
  const [selectionTarget, setSelectionTarget] = useState({ start: 0, end: 0 });

  // Animation values
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' })
    ]).start();
  }, []);

  const safeTheme = theme || {
    background: '#0b0f10',
    surface: '#0b0f10',
    surfaceContainerLow: '#141b1d',
    onSurface: '#dde7eb',
    onSurfaceVariant: '#a3adb1',
    primary: '#b2cad3',
    onPrimary: '#1a1a1a',
    outlineVariant: '#40494d'
  };

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (val) => {
    const oldText = amountRef.current || '';
    const oldSel = selectionTargetRef.current.start;
    
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
      if (formatted[i] !== '.') count++;
      newPos = i;
    }

    setSelectionTarget({ start: newPos, end: newPos }); 
    selectionTargetRef.current = { start: newPos, end: newPos };
  };

  const numericAmount = Number(amount.replace(/\./g, '')) || 0;
  const monthlyEstimate = type === 'daily' ? numericAmount * 30 : numericAmount;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nama Kosong', 'Berikan nama untuk rencana ini, ya.');
      return;
    }
    if (numericAmount <= 0) {
      Alert.alert('Nominal Tidak Valid', 'Masukkan nominal perkiraan yang akan dihabiskan.');
      return;
    }

    setIsSaving(true);
    try {
      await addBudget({
        name: name.trim(),
        amount: numericAmount,
        type,
        monthlyTotal: monthlyEstimate,
        icon,
        color: safeTheme.primary
      });
      navigation.goBack();
    } catch (e) {
      setIsSaving(false);
      Alert.alert('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data.');
    }
  };

  const icons = ['restaurant', 'directions-car', 'shopping-bag', 'receipt', 'home', 'local-hospital', 'flash-on', 'wifi'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: safeTheme.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: safeTheme.outlineVariant + '22' }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color={safeTheme.onSurface} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: safeTheme.onSurface }}>Tambah Rencana</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isSaving}
          style={{ backgroundColor: safeTheme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
        >
          <Text style={{ color: safeTheme.onPrimary, fontWeight: 'bold' }}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* TIPE RENCANA */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 12 }}>TIPE RENCANA</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <TouchableOpacity 
                onPress={() => setType('daily')}
                style={{ flex: 1, backgroundColor: type === 'daily' ? safeTheme.primary : safeTheme.surfaceContainerLow, paddingVertical: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: type === 'daily' ? safeTheme.primary : safeTheme.outlineVariant + '22' }}
              >
                <Text style={{ color: type === 'daily' ? safeTheme.onPrimary : safeTheme.onSurfaceVariant, fontWeight: 'bold' }}>Harian</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setType('monthly')}
                style={{ flex: 1, backgroundColor: type === 'monthly' ? safeTheme.primary : safeTheme.surfaceContainerLow, paddingVertical: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: type === 'monthly' ? safeTheme.primary : safeTheme.outlineVariant + '22' }}
              >
                <Text style={{ color: type === 'monthly' ? safeTheme.onPrimary : safeTheme.onSurfaceVariant, fontWeight: 'bold' }}>Bulanan</Text>
              </TouchableOpacity>
            </View>

            {/* NAMA */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>NAMA KEBUTUHAN</Text>
            <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 16, padding: 16, marginBottom: 24 }}>
              <TextInput 
                placeholder="Contoh: Makan Siang, Kuota, Cicilan Motor" 
                placeholderTextColor={safeTheme.onSurfaceVariant}
                value={name}
                onChangeText={setName}
                style={{ color: safeTheme.onSurface, fontSize: 16 }}
              />
            </View>

            {/* NOMINAL */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>PERKIRAAN BIAYA (RP)</Text>
            <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 16, padding: 16, marginBottom: 24 }}>
              <TextInput 
                placeholder="0" 
                placeholderTextColor={safeTheme.onSurfaceVariant}
                value={amount}
                onChangeText={handleAmountChange}
                selection={selectionTarget}
                onSelectionChange={(e) => {
                  const sel = e.nativeEvent.selection;
                  setSelectionTarget(sel);
                  selectionTargetRef.current = sel;
                }}
                keyboardType="numeric"
                style={{ color: safeTheme.onSurface, fontSize: 24, fontWeight: '900', letterSpacing: 1 }}
              />
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: safeTheme.outlineVariant + '22' }}>
                <Text style={{ color: safeTheme.primary, fontSize: 13, fontWeight: 'bold' }}>
                  💡 Est. Sebulan: Rp {formatMoney(monthlyEstimate)}
                </Text>
              </View>
            </View>

            {/* ICON SELECTION */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 12 }}>PILIH IKON</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {icons.map(ico => (
                <TouchableOpacity 
                  key={ico} 
                  onPress={() => setIcon(ico)}
                  style={{ 
                    width: 50, height: 50, borderRadius: 16, 
                    backgroundColor: icon === ico ? safeTheme.primary : safeTheme.surfaceContainerLow,
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: 2, borderColor: icon === ico ? safeTheme.primary : 'transparent'
                  }}
                >
                  <MaterialIcons name={ico} size={24} color={icon === ico ? safeTheme.onPrimary : safeTheme.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddBudgetScreen;
