import React, { useState, useMemo, useContext, useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import TextInput from '../components/ThemeTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { formatMoney } from '../utils/formatUtils';
import Text from '../components/ThemeText';

const PRESET_ICONS = [
  { key: 'two-wheeler',     label: 'Motor' },
  { key: 'directions-car',  label: 'Mobil' },
  { key: 'home',            label: 'Rumah' },
  { key: 'credit-card',     label: 'Kartu' },
  { key: 'phone-iphone',    label: 'HP' },
  { key: 'school',          label: 'Pendidikan' },
  { key: 'medical-services',label: 'Kesehatan' },
  { key: 'flight',          label: 'Travel' },
  { key: 'work',            label: 'Kerja' },
  { key: 'shopping-bag',    label: 'Belanja' },
];

export default function AddEditInstallmentScreen({ navigation, route }) {
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { installments, addInstallment, updateInstallment } = useContext(DataContext);

  const installmentId = route?.params?.installmentId;
  const isEdit = !!installmentId;
  const existing = isEdit ? installments.find(i => i.id === installmentId) : null;
  const partnerName = route?.params?.partnerName || 'Pasangan';

  // Resolve existing icon ke MaterialIcons key
  const resolveIcon = () => {
    if (!existing?.icon) return 'credit-card';
    const isEmoji = /[^\x00-\x7F]/.test(existing.icon);
    if (isEmoji) return 'credit-card';
    return existing.icon;
  };

  const [iconKey, setIconKey] = useState(resolveIcon());
  const [name, setName] = useState(existing?.name || '');
  const [totalAmount, setTotalAmount] = useState(existing?.totalAmount ? String(existing.totalAmount) : '');
  const [monthlyAmount, setMonthlyAmount] = useState(existing?.monthlyAmount ? String(existing.monthlyAmount) : '');
  const [tenor, setTenor] = useState(existing?.totalMonths ? String(existing.totalMonths) : '');
  const [alreadyPaid, setAlreadyPaid] = useState(
    existing ? String(existing.totalMonths - existing.remainingMonths) : '0'
  );
  const [dueDate, setDueDate] = useState(existing?.dueDate ? String(existing.dueDate) : '');
  const [owner, setOwner] = useState(existing?.owner || 'Kita');
  const [saving, setSaving] = useState(false);

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  const rawTotal = (totalAmount || '').replace(/\./g, '');
  const rawMonthly = (monthlyAmount || '').replace(/\./g, '');

  const autoTenor = useMemo(() => {
    const t = parseInt(rawTotal);
    const m = parseInt(rawMonthly);
    return (t > 0 && m > 0) ? Math.ceil(t / m) : null;
  }, [rawTotal, rawMonthly]);

  const finalTenor = parseInt(tenor) || autoTenor || 0;
  const finalAlready = parseInt(alreadyPaid) || 0;
  const remainingMonths = Math.max(0, finalTenor - finalAlready);
  const remainingAmount = remainingMonths * (parseInt(rawMonthly) || 0);

  // Stagger anim
  const fadeAnims = useRef([0,0,0,0].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([0,0,0,0].map(() => new Animated.Value(20))).current;
  useEffect(() => {
    Animated.stagger(80, fadeAnims.map((f, i) =>
      Animated.parallel([
        Animated.timing(f, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(slideAnims[i], { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' }),
      ])
    )).start();
  }, []);

  const handleBack = () => {
    Animated.parallel(fadeAnims.map(f => Animated.timing(f, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' })))
      .start(() => navigation.goBack());
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Ups!', 'Nama cicilan harus diisi ya!'); return; }
    if (!rawMonthly || parseInt(rawMonthly) <= 0) { Alert.alert('Ups!', 'Cicilan per bulan harus diisi!'); return; }
    if (!dueDate || parseInt(dueDate) < 1 || parseInt(dueDate) > 31) {
      Alert.alert('Ups!', 'Tanggal jatuh tempo harus antara 1–31!'); return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        icon: iconKey,
        totalAmount: parseInt(rawTotal) || 0,
        monthlyAmount: parseInt(rawMonthly) || 0,
        totalMonths: finalTenor,
        remainingMonths,
        dueDate: parseInt(dueDate),
        owner,
        startDate: existing?.startDate || new Date().toISOString(),
      };
      if (isEdit) await updateInstallment(installmentId, payload);
      else await addInstallment(payload);
      handleBack();
    } catch { Alert.alert('Gagal', 'Terjadi kesalahan. Coba lagi ya!'); }
    finally { setSaving(false); }
  };

  const s = makeStyles(theme);
  const owners = ['Kita', user?.name || 'Saya', partnerName];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <Animated.View style={[s.header, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
          <TouchableOpacity onPress={handleBack} style={[s.headerBtn, { backgroundColor: theme.surfaceContainerLow || theme.surface }]}>
            <MaterialIcons name="arrow-back-ios-new" size={20} color={theme.onSurface} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isEdit ? 'Edit Cicilan' : 'Tambah Cicilan'}</Text>
          <View style={{ width: 44 }} />
        </Animated.View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* NAMA + ICON */}
          <Animated.View style={[s.formCard, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
            <Text style={s.label}>Nama Cicilan</Text>
            <TextInput
              style={s.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Contoh: Cicilan motor, KPR..."
              placeholderTextColor={theme.onSurfaceVariant}
            />

            <Text style={s.label}>Ikon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              {PRESET_ICONS.map(ic => {
                const isActive = iconKey === ic.key;
                return (
                  <TouchableOpacity
                    key={ic.key}
                    style={[s.catBtn, isActive && s.catBtnAct]}
                    onPress={() => setIconKey(ic.key)}
                  >
                    <MaterialIcons name={ic.key} size={16} color={isActive ? theme.onPrimary || '#fff' : theme.onSurfaceVariant} style={{ marginRight: 6 }} />
                    <Text style={isActive ? s.catTextAct : s.catText}>{ic.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* NOMINAL */}
          <Animated.View style={[s.formCard, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
            <Text style={s.label}>Total Nilai Cicilan</Text>
            <View style={s.nominalWrapper}>
              <Text style={s.nominalCurrency}>IDR</Text>
              <TextInput
                style={s.nominalInput}
                value={totalAmount}
                onChangeText={v => setTotalAmount(formatInput(v))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.onSurfaceVariant}
              />
            </View>

            <Text style={s.label}>Cicilan per Bulan</Text>
            <View style={s.nominalWrapper}>
              <Text style={s.nominalCurrency}>IDR</Text>
              <TextInput
                style={s.nominalInput}
                value={monthlyAmount}
                onChangeText={v => setMonthlyAmount(formatInput(v))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.onSurfaceVariant}
              />
            </View>
          </Animated.View>

          {/* TENOR */}
          <Animated.View style={[s.formCard, { opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[s.label, { marginBottom: 0 }]}>Tenor (Bulan)</Text>
              {autoTenor && !tenor && (
                <TouchableOpacity onPress={() => setTenor(String(autoTenor))}>
                  <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>Auto-isi: {autoTenor} bln ↗</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={s.nameInput}
              value={tenor}
              onChangeText={v => setTenor(v.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder={autoTenor ? String(autoTenor) : 'Jumlah bulan total...'}
              placeholderTextColor={theme.onSurfaceVariant}
            />

            <Text style={s.label}>Sudah Berjalan (Bulan)</Text>
            <TextInput
              style={s.nameInput}
              value={alreadyPaid}
              onChangeText={v => setAlreadyPaid(v.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.onSurfaceVariant}
            />

            <Text style={s.label}>Tanggal Jatuh Tempo (1–31)</Text>
            <TextInput
              style={s.nameInput}
              value={dueDate}
              onChangeText={v => setDueDate(v.replace(/\D/g, '').slice(0, 2))}
              keyboardType="numeric"
              placeholder="Misal: 15"
              placeholderTextColor={theme.onSurfaceVariant}
            />
          </Animated.View>

          {/* OWNER */}
          <Animated.View style={[s.formCard, { opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }]}>
            <Text style={s.label}>Milik Siapa</Text>
            <View style={s.typeToggleWrap}>
              {owners.map(o => (
                <TouchableOpacity key={o} style={owner === o ? s.typeBtnAct : s.typeBtnIna} onPress={() => setOwner(o)}>
                  <Text style={owner === o ? s.typeTextAct : s.typeTextIna}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* PREVIEW SUMMARY */}
          {finalTenor > 0 && parseInt(rawMonthly) > 0 && (
            <Animated.View style={[s.summaryCard, { opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }]}>
              <Text style={s.summaryTitle}>
                <MaterialIcons name="bar-chart" size={15} color={theme.primary} /> Ringkasan Cicilan
              </Text>
              <View style={s.summaryRow}>
                <Text style={s.summaryKey}>Sisa tenor</Text>
                <Text style={s.summaryVal}>{remainingMonths} bulan</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryKey}>Total sisa bayar</Text>
                <Text style={[s.summaryVal, { color: theme.primary, fontWeight: '900' }]}>
                  Rp {formatMoney(remainingAmount)}
                </Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryKey}>Jatuh tempo tiap tgl</Text>
                <Text style={s.summaryVal}>{dueDate || '?'}</Text>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* SAVE */}
        <Animated.View style={[s.saveContainer, { opacity: fadeAnims[3] }]}>
          <TouchableOpacity style={[s.submitBtn, { opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            <LinearGradient colors={[theme.primary, (theme.primaryContainer || theme.primary) + 'CC']} style={s.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {saving
                ? <><ActivityIndicator color={theme.onPrimary || '#fff'} size="small" /><Text style={s.submitText}>Menyimpan...</Text></>
                : <Text style={s.submitText}>{isEdit ? 'Simpan Perubahan' : 'Tambah Cicilan'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: t.surface, zIndex: 50 },
  headerBtn: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, color: t.onSurface },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 16 },
  formCard: { backgroundColor: t.surfaceContainerLow || t.surface, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: (t.outlineVariant || '#888') + '1A', overflow: 'hidden' },
  label: { fontSize: 10, fontWeight: 'bold', color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  nameInput: { backgroundColor: t.surfaceContainerLowest || t.background, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, fontWeight: 'bold', color: t.onSurface, marginBottom: 20 },
  catScroll: { marginBottom: 8 },
  catBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: t.surfaceContainerLowest || t.background, borderWidth: 1, borderColor: (t.outlineVariant || '#888') + '1A', marginRight: 8 },
  catBtnAct: { backgroundColor: t.primary, borderColor: t.primary },
  catText: { fontSize: 12, color: t.onSurfaceVariant, fontWeight: 'bold' },
  catTextAct: { fontSize: 12, color: t.onPrimary || '#fff', fontWeight: 'bold' },
  nominalWrapper: { position: 'relative', justifyContent: 'center', marginBottom: 20 },
  nominalCurrency: { position: 'absolute', left: 20, zIndex: 10, color: t.primary, fontWeight: 'bold', fontSize: 18 },
  nominalInput: { backgroundColor: t.surfaceContainerLowest || t.background, borderRadius: 24, paddingVertical: 18, paddingLeft: 60, paddingRight: 24, fontSize: 26, fontWeight: 'bold', color: t.onSurface },
  typeToggleWrap: { flexDirection: 'row', backgroundColor: t.surfaceContainerLowest || t.background, borderRadius: 16, padding: 4 },
  typeBtnAct: { flex: 1, backgroundColor: t.primary, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  typeBtnIna: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  typeTextAct: { fontWeight: 'bold', color: t.onPrimary || '#fff', fontSize: 12 },
  typeTextIna: { fontWeight: 'bold', color: t.onSurfaceVariant, fontSize: 12 },
  summaryCard: { backgroundColor: t.surfaceContainerLow || t.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: t.primary + '22', gap: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: t.onSurface, marginBottom: 4, letterSpacing: -0.3 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { fontSize: 13, color: t.onSurfaceVariant, fontWeight: '500' },
  summaryVal: { fontSize: 13, fontWeight: '700', color: t.onSurface },
  saveContainer: { padding: 20, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: (t.outlineVariant || '#888') + '22' },
  submitBtn: { borderRadius: 28, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  submitText: { color: t.onPrimary || '#fff', fontWeight: 'bold', fontSize: 17 },
});
