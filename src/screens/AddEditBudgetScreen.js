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

const PRESET_CATEGORIES = [
  { label: 'Makanan',      icon: 'restaurant' },
  { label: 'Transport',    icon: 'directions-car' },
  { label: 'Belanja',      icon: 'shopping-bag' },
  { label: 'Hiburan',      icon: 'movie' },
  { label: 'Tagihan',      icon: 'receipt' },
  { label: 'Kesehatan',    icon: 'medical-services' },
  { label: 'Tabungan',     icon: 'savings' },
  { label: 'Lainnya',      icon: 'more-horiz' },
];

const TYPES = [
  { key: 'daily',   label: 'Harian' },
  { key: 'monthly', label: 'Bulanan' },
  { key: 'once',    label: 'Sekali' },
];

export default function AddEditBudgetScreen({ navigation, route }) {
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { budgets, addBudget, updateBudget } = useContext(DataContext);

  const budgetId = route?.params?.budgetId;
  const isEdit = !!budgetId;
  const existing = isEdit ? budgets.find(b => b.id === budgetId) : null;
  const partnerName = route?.params?.partnerName || 'Pasangan';

  // Normalise existing icon — kalau emoji, map ke MaterialIcons default
  const resolveExistingIcon = () => {
    if (!existing?.icon) return 'more-horiz';
    const isEmojiIcon = /[^\x00-\x7F]/.test(existing.icon);
    if (isEmojiIcon) {
      const match = PRESET_CATEGORIES.find(p => p.label === existing.category);
      return match?.icon || 'more-horiz';
    }
    return existing.icon;
  };

  const resolveExistingCat = () => {
    if (!existing?.category) return null;
    return PRESET_CATEGORIES.find(p => p.label === existing.category) || { label: existing.category, icon: resolveExistingIcon() };
  };

  const currentMonthDays = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }, []);

  const [categoryObj, setCategoryObj] = useState(resolveExistingCat());
  const [type, setType] = useState(existing?.type || 'daily');
  const [amount, setAmount] = useState(existing?.estimatedAmount ? existing.estimatedAmount.toString() : '');
  const [days, setDays] = useState(existing?.daysPerMonth ? existing.daysPerMonth.toString() : currentMonthDays.toString());
  const [owner, setOwner] = useState(existing?.owner || 'Kita');
  const [saving, setSaving] = useState(false);

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const rawAmount = (amount || '').replace(/\./g, '');

  const monthlyEstimate = useMemo(() => {
    const num = parseInt(rawAmount) || 0;
    if (type === 'daily') return num * (parseInt(days) || currentMonthDays);
    if (type === 'monthly') return num;
    return num;
  }, [rawAmount, type, days, currentMonthDays]);

  // Stagger animations
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
    Animated.parallel(
      fadeAnims.map(f => Animated.timing(f, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }))
    ).start(() => navigation.goBack());
  };

  const handleSave = async () => {
    if (!categoryObj) { Alert.alert('Ups!', 'Pilih kategori dulu ya 😊'); return; }
    if (!rawAmount || parseInt(rawAmount) <= 0) { Alert.alert('Ups!', 'Nominal harus lebih dari 0 dong 💸'); return; }

    setSaving(true);
    try {
      const payload = {
        category: categoryObj.label,
        icon: categoryObj.icon,
        type,
        estimatedAmount: parseInt(rawAmount) || 0,
        daysPerMonth: parseInt(days) || currentMonthDays,
        owner,
      };
      if (isEdit) await updateBudget(budgetId, payload);
      else await addBudget(payload);
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
          <TouchableOpacity onPress={handleBack} style={[s.headerBtn, { backgroundColor: theme.surfaceContainerLow }]}>
            <MaterialIcons name="arrow-back-ios-new" size={20} color={theme.onSurface} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isEdit ? 'Edit Budget' : 'Tambah Budget'}</Text>
          <View style={{ width: 44 }} />
        </Animated.View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* FORM CARD */}
          <Animated.View style={[s.formCard, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
            {/* TIPE */}
            <Text style={s.label}>Tipe Budget</Text>
            <View style={s.typeToggleWrap}>
              {TYPES.map(t => (
                <TouchableOpacity key={t.key} style={type === t.key ? s.typeBtnAct : s.typeBtnIna} onPress={() => setType(t.key)}>
                  <Text style={type === t.key ? s.typeTextAct : s.typeTextIna}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* KATEGORI */}
            <Text style={s.label}>Pilih Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              {PRESET_CATEGORIES.map(cat => {
                const isActive = categoryObj?.label === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[s.catBtn, isActive && s.catBtnAct]}
                    onPress={() => setCategoryObj(cat)}
                  >
                    <MaterialIcons name={cat.icon} size={16} color={isActive ? theme.onPrimary : theme.onSurfaceVariant} style={{ marginRight: 6 }} />
                    <Text style={isActive ? s.catTextAct : s.catText}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* NOMINAL */}
            <Text style={s.label}>
              Nominal {type === 'daily' ? 'per Hari' : type === 'monthly' ? 'per Bulan' : '(Sekali)'}
            </Text>
            <View style={s.nominalWrapper}>
              <Text style={s.nominalCurrency}>IDR</Text>
              <TextInput
                style={s.nominalInput}
                value={amount}
                onChangeText={v => setAmount(formatInput(v))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.onSurfaceVariant}
              />
            </View>

            {/* HARI PER BULAN */}
            {type === 'daily' && (
              <>
                <Text style={s.label}>Hari per Bulan</Text>
                <TextInput
                  style={s.nameInput}
                  value={days}
                  onChangeText={v => setDays(v.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={theme.onSurfaceVariant}
                />
              </>
            )}

            {/* PREVIEW */}
            {parseInt(rawAmount) > 0 && (
              <View style={s.previewRow}>
                <MaterialIcons name="calculate" size={16} color={theme.primary} />
                <Text style={s.previewText}>
                  {type === 'daily'
                    ? `Rp ${formatMoney(parseInt(rawAmount))}/hari × ${parseInt(days)||30} hari = `
                    : 'Estimasi bulanan: '}
                  <Text style={{ color: theme.primary, fontWeight: '900' }}>
                    Rp {formatMoney(monthlyEstimate)}/bln
                  </Text>
                </Text>
              </View>
            )}
          </Animated.View>

          {/* OWNER CARD */}
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

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* SAVE */}
        <Animated.View style={[s.saveContainer, { opacity: fadeAnims[3] }]}>
          <TouchableOpacity style={[s.submitBtn, { opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            <LinearGradient colors={[theme.primary, theme.primaryContainer || theme.primary + 'CC']} style={s.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {saving
                ? <><ActivityIndicator color={theme.onPrimary} size="small" /><Text style={s.submitText}>Menyimpan...</Text></>
                : <Text style={s.submitText}>{isEdit ? 'Simpan Perubahan' : 'Tambah Budget'}</Text>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  formCard: { backgroundColor: t.surfaceContainerLow || t.surface, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: (t.outlineVariant || '#888') + '1A', marginBottom: 16, overflow: 'hidden' },
  label: { fontSize: 10, fontWeight: 'bold', color: t.onSurfaceVariant, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  typeToggleWrap: { flexDirection: 'row', backgroundColor: t.surfaceContainerLowest || t.background, borderRadius: 16, padding: 4, marginBottom: 24 },
  typeBtnAct: { flex: 1, backgroundColor: t.primary, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  typeBtnIna: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  typeTextAct: { fontWeight: 'bold', color: t.onPrimary || '#fff', fontSize: 12 },
  typeTextIna: { fontWeight: 'bold', color: t.onSurfaceVariant, fontSize: 12 },
  catScroll: { marginBottom: 20 },
  catBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: t.surfaceContainerLowest || t.background, borderWidth: 1, borderColor: (t.outlineVariant || '#888') + '1A', marginRight: 8 },
  catBtnAct: { backgroundColor: t.primary, borderColor: t.primary },
  catText: { fontSize: 12, color: t.onSurfaceVariant, fontWeight: 'bold' },
  catTextAct: { fontSize: 12, color: t.onPrimary || '#fff', fontWeight: 'bold' },
  nameInput: { backgroundColor: t.surfaceContainerLowest || t.background, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, fontWeight: 'bold', color: t.onSurface, marginBottom: 20 },
  nominalWrapper: { position: 'relative', justifyContent: 'center', marginBottom: 20 },
  nominalCurrency: { position: 'absolute', left: 20, zIndex: 10, color: t.primary, fontWeight: 'bold', fontSize: 18 },
  nominalInput: { backgroundColor: t.surfaceContainerLowest || t.background, borderRadius: 24, paddingVertical: 18, paddingLeft: 60, paddingRight: 24, fontSize: 28, fontWeight: 'bold', color: t.onSurface },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.primary + '0D', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: t.primary + '22' },
  previewText: { flex: 1, fontSize: 13, color: t.onSurface, lineHeight: 20 },
  saveContainer: { padding: 20, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: (t.outlineVariant || '#888') + '22' },
  submitBtn: { borderRadius: 28, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  submitText: { color: t.onPrimary || '#fff', fontWeight: 'bold', fontSize: 17 },
});
