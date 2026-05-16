import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import TextInput from '../components/ThemeTextInput';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Modal, Alert, Animated, Platform, ActivityIndicator } from 'react-native';
import Text from '../components/ThemeText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { db } from '../config/firebase';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

import { formatMoney } from '../utils/formatUtils';

dayjs.extend(relativeTime);

const HEADER_HEIGHT = 300;

// --- Add Funding Modal ---
const AddFundingModal = ({ visible, onClose, onSave, theme: providedTheme }) => {
  const theme = providedTheme || {
    surface: '#0b0f10',
    onSurface: '#dde7eb',
    onSurfaceVariant: '#a3adb1',
    primary: '#b2cad3',
    surfaceContainerLow: '#141b1d',
    outlineVariant: '#40494d',
    onPrimary: '#1a1a1a',
  };
  const [amount, setAmount] = useState('');
  const selectionRef = useRef({ start: 0, end: 0 });
  const [selectionState, setSelectionState] = useState({ start: 0, end: 0 });
  const amountRef = useRef('');

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

  const handleSave = () => {
    const numAmount = Number(amount.replace(/\./g, ''));
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Error', 'Masukkan nominal yang valid');
      return;
    }
    onSave(numAmount);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: Platform.OS === 'ios' ? 48 : 32 }}>
          <View style={{ width: 40, height: 4, backgroundColor: theme.outlineVariant + '44', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />
          
          <Text style={{ fontSize: 24, fontWeight: '900', color: theme.onSurface, marginBottom: 8, letterSpacing: -0.5 }}>Tambah Dana</Text>
          <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, marginBottom: 32 }}>Langkah kecil menuju impian besar.</Text>
        
          <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: theme.outlineVariant + '22' }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary, marginBottom: 12, letterSpacing: 1 }}>NOMINAL SETORAN</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.primary, marginRight: 8 }}>Rp</Text>
              <TextInput
                style={{ flex: 1, color: theme.onSurface, fontSize: 36, fontWeight: '900', letterSpacing: -1 }}
                placeholder="0"
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="numeric"
                autoFocus
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
          </View>

          <TouchableOpacity onPress={handleSave} style={{ backgroundColor: theme.primary, padding: 20, borderRadius: 24, alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
            <Text style={{ color: theme.onPrimary, fontWeight: 'bold', fontSize: 16 }}>Simpan Dana</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// --- Main Screen ---
const GoalDetailScreen = ({ route }) => {
  const { goalId } = route.params;
  const navigation = useNavigation();
  const { theme } = useContext(ThemeContext);
  const safeTheme = theme || {
    background: '#0b0f10',
    surface: '#0b0f10',
    surfaceContainerLow: '#141b1d',
    surfaceContainer: '#141b1d',
    surfaceContainerHighest: '#1a1a1a',
    onSurface: '#dde7eb',
    onSurfaceVariant: '#a3adb1',
    primary: '#b2cad3',
    onPrimary: '#1a1a1a',
    outlineVariant: '#40494d',
    error: '#f2b8b5'
  };
  const { goals, updateGoal, addNotification } = useContext(DataContext);
  const { user, householdUsers } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const normalize = (s) => (s || '').toLowerCase().trim();
  const myNameNorm = normalize(user?.name);
  const partnerUser = (householdUsers || []).find(u => {
    const uName = normalize(typeof u === 'string' ? u : u.name);
    return uName !== myNameNorm && !uName.includes(myNameNorm) && !myNameNorm.includes(uName);
  });
  const partnerName = (typeof partnerUser === 'string' ? partnerUser : partnerUser?.name) || 'Rika';
  const hasPartner = !!partnerUser;

  const goal = goals.find(g => g.id === goalId);
  const [fundingModalVisible, setFundingModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

  useEffect(() => {
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

  const progress = goal?.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = Math.max((goal?.targetAmount || 0) - (goal?.currentAmount || 0), 0);

  const targetDate = goal?.targetDate ? dayjs(goal.targetDate) : null;
  const daysLeft = targetDate ? targetDate.diff(dayjs(), 'day') : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-HEADER_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  const handleAddFunding = async (amount) => {
    if (!goal || loading) return;
    setLoading(true);
    try {
      const newAmount = (goal.currentAmount || 0) + amount;
      const now = new Date().toISOString();
      const newEntry = {
        amount,
        user: user?.name || 'Ayip',
        date: now,
      };
      
      const history = Array.isArray(goal.history) ? [...goal.history, newEntry] : [newEntry];
      
      await updateGoal(goal.id, { 
        currentAmount: newAmount,
        history: history,
        lastContributionAt: now
      });

      await addNotification({
        title: 'Dana Ditambahkan!',
        body: `${user?.name || 'Ayip'} baru saja menambah Rp ${formatMoney(amount)} untuk goal "${goal.name}".`,
        icon: 'favorite',
        color: 'primary',
        sender: user?.name || 'Ayip',
        targetType: 'goal',
        targetId: goal.id,
      });
    } catch (e) {
      Alert.alert('Gagal', 'Tidak dapat menambahkan dana');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAchieved = () => {
    navigation.navigate('AchieveGoal', { goalId: goal.id });
  };

  const handleDeleteConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      setDeleteModalVisible(false);
      await deleteDoc(doc(db, 'households', user.householdId, 'goals', goal.id));
      if (hasPartner) {
        await addNotification({
          title: 'Goal dihapus',
          body: `${user?.name || 'Ayip'} telah menghapus goal "${goal.name}".`,
          icon: 'delete',
          targetType: 'goal',
          targetId: goal.id,
          sender: user?.name || 'Ayip',
          createdAt: new Date().toISOString(),
        });
      }
      handleBack();
    } catch (e) {
      console.error('Delete error', e);
      setDeleteModalVisible(true); // reopen if failed
    } finally {
      setLoading(false);
    }
  };

  if (!goal) {
    return (
      <View style={{ flex: 1, backgroundColor: safeTheme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={safeTheme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: safeTheme.background }}>
      {/* Dynamic Header */}
      <Animated.View style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, 
        height: Math.max(insets.top + 56, 90), 
        backgroundColor: safeTheme.surface, 
        zIndex: 100, 
        opacity: headerOpacity,
        justifyContent: 'flex-end',
        paddingBottom: 150,
        paddingHorizontal: 20
      }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: safeTheme.onSurface }} numberOfLines={1}>{goal.name}</Text>
      </Animated.View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Image Section */}
        <Animated.View style={{ height: HEADER_HEIGHT, backgroundColor: '#000', overflow: 'hidden', opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
          <Animated.View style={{ flex: 1, transform: [{ scale: imageScale }] }}>
            {goal.previewImage ? (
              <ExpoImage 
                source={{ uri: goal.previewImage }} 
                style={StyleSheet.absoluteFill} 
                contentFit="cover" 
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: safeTheme.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialIcons name="landscape" size={80} color={safeTheme.primary + '22'} />
              </View>
            )}
            <LinearGradient 
              colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.9)']} 
              style={StyleSheet.absoluteFill} 
            />
          </Animated.View>

          {/* Moved below for better z-index */}
          <View style={{ height: 0 }} />

          {/* Title Info */}
          <View style={{ position: 'absolute', bottom: 30, left: 24, right: 24 }}>
            <View>
              <Text style={{ color: '#ffffff', fontSize: 34, fontWeight: '900', letterSpacing: -1 }} numberOfLines={2} adjustsFontSizeToFit>{goal.name}</Text>
              {targetDate && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                   <View style={{ backgroundColor: isOverdue ? 'rgba(244, 67, 54, 0.3)' : 'rgba(178, 202, 211, 0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: isOverdue ? '#ffada5' : '#b2cad3', fontSize: 11, fontWeight: 'bold' }}>
                      {isOverdue ? 'Terlewat' : 'Target'} {targetDate.format('MMM YYYY')}
                    </Text>
                  </View>
                  {daysLeft !== null && !isOverdue && (
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold' }}>•  {daysLeft} hari lagi</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Content Section */}
        <View style={{ 
          padding: 24, 
          paddingTop: 32, 
          backgroundColor: safeTheme.background, 
          borderTopLeftRadius: 40, 
          borderTopRightRadius: 40, 
          marginTop: -30,
          minHeight: 600
        }}>
          {/* Description */}
          <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
            {!!goal.description && (
              <Text style={{ color: safeTheme.onSurfaceVariant, fontSize: 15, lineHeight: 24, marginBottom: 32 }}>{goal.description}</Text>
            )}
          </Animated.View>

          {/* Premium Progress Card */}
          <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
            <LinearGradient 
              colors={[safeTheme.surfaceContainer, safeTheme.surfaceContainerLow]}
              style={{ borderRadius: 32, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: safeTheme.outlineVariant + '22', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 6 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: safeTheme.primary, marginBottom: 6, letterSpacing: 1 }}>SALDO SAAT INI</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: safeTheme.primary, marginRight: 4 }}>Rp</Text>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: safeTheme.onSurface, letterSpacing: -1 }}>{formatMoney(goal.currentAmount)}</Text>
                  </View>
                </View>
                <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: safeTheme.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="auto-graph" size={28} color={safeTheme.primary} />
                </View>
              </View>
              
              <View style={{ height: 14, backgroundColor: safeTheme.surfaceContainerHighest, borderRadius: 7, marginBottom: 20, overflow: 'hidden' }}>
                <LinearGradient 
                  colors={[safeTheme.primary, safeTheme.primary + 'CC']} 
                  start={{x:0, y:0}} 
                  end={{x:1, y:0}} 
                  style={{ height: '100%', width: `${progress}%`, borderRadius: 7 }} 
                />
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: safeTheme.onSurface }}>{progress.toFixed(0)}%</Text>
                  <Text style={{ fontSize: 10, color: safeTheme.onSurfaceVariant, fontWeight: 'bold' }}>DARI RP {formatMoney(goal.targetAmount)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: remaining > 0 ? safeTheme.error : '#81C784' }}>
                    {remaining > 0 ? `Rp ${formatMoney(remaining)}` : 'TERCAPAI!'}
                  </Text>
                  <Text style={{ fontSize: 10, color: safeTheme.onSurfaceVariant, fontWeight: 'bold' }}>{remaining > 0 ? 'KEKURANGAN' : 'GOAL TERCAPAI!'}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Primary Actions */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 48 }}>
              <TouchableOpacity 
                onPress={() => setFundingModalVisible(true)}
                style={{ flex: 1, backgroundColor: safeTheme.primary, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: safeTheme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="add" size={24} color={safeTheme.onPrimary} />
                  <Text style={{ color: safeTheme.onPrimary, fontWeight: 'bold', fontSize: 16 }}>Tambah Dana</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleMarkAchieved}
                style={{ width: 64, height: 64, backgroundColor: safeTheme.surfaceContainerHighest, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: safeTheme.outlineVariant + '33' }}
              >
                <MaterialIcons name="task-alt" size={32} color={safeTheme.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Journey Timeline Header */}
          <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: safeTheme.onSurface, letterSpacing: -0.5 }}>Langkah Perjuangan</Text>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: safeTheme.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialIcons name="history" size={20} color={safeTheme.onSurfaceVariant} />
              </View>
            </View>
          </Animated.View>

            <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
            {(() => {
              const displayHistory = Array.isArray(goal.history) ? [...goal.history] : [];
              if (displayHistory.length === 0 && (goal.currentAmount || 0) > 0) {
                displayHistory.push({
                  amount: goal.currentAmount,
                  user: 'Awal Perjalanan',
                  date: goal.createdAt || new Date().toISOString(),
                  isVirtual: true
                });
              }

              if (displayHistory.length > 0) {
                return (
                  <View style={{ paddingLeft: 4 }}>
                    {displayHistory.slice().reverse().map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', marginBottom: 12 }}>
                        {/* Vertical Line */}
                        <View style={{ alignItems: 'center', width: 24 }}>
                           <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.isVirtual ? safeTheme.onSurfaceVariant : safeTheme.primary, zIndex: 10, marginTop: 24 }} />
                           {idx !== displayHistory.length - 1 && (
                             <View style={{ width: 2, flex: 1, backgroundColor: safeTheme.outlineVariant + '33', marginTop: 4, marginBottom: -16 }} />
                           )}
                        </View>
                        
                        {/* Card Content */}
                        <View style={{ flex: 1, backgroundColor: safeTheme.surfaceContainerLow, padding: 20, borderRadius: 24, marginLeft: 12, borderWidth: 1, borderColor: safeTheme.outlineVariant + '11' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                              <Text style={{ fontSize: 16, fontWeight: '900', color: safeTheme.onSurface }}>
                                {item.isVirtual ? 'Saldo Pembuka' : `+ Rp ${formatMoney(item.amount)}`}
                              </Text>
                              <Text style={{ fontSize: 12, color: safeTheme.onSurfaceVariant, marginTop: 4 }}>
                                {item.isVirtual ? 'Tercatat sebagai saldo awal' : `Disetor oleh `}
                                {!item.isVirtual && <Text style={{ fontWeight: 'bold', color: safeTheme.primary }}>{item.user}</Text>}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, textTransform: 'uppercase' }}>
                              {dayjs(item.date).format('DD MMM')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }

              return (
                <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 32, padding: 40, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: safeTheme.outlineVariant + '44' }}>
                  <MaterialIcons name="flag" size={40} color={safeTheme.primary + '33'} />
                  <Text style={{ color: safeTheme.onSurfaceVariant, fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
                    Belum ada riwayat setoran.{"\n"}Setoran pertamamu akan muncul di sini!
                  </Text>
                </View>
              );
            })()}
          </Animated.View>
        </View>
        <View style={{ height: 150 }} />
      </Animated.ScrollView>

      <AddFundingModal
        visible={fundingModalVisible}
        onClose={() => setFundingModalVisible(false)}
        onSave={handleAddFunding}
        theme={safeTheme}
      />

      {/* Custom Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: safeTheme.surface, borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#FF525215', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <MaterialIcons name="delete-sweep" size={40} color="#FF5252" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: safeTheme.onSurface, marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 }}>Hapus Goal?</Text>
            <Text style={{ fontSize: 14, color: safeTheme.onSurfaceVariant, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
              Goal "{goal?.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, height: 56, borderRadius: 20, backgroundColor: safeTheme.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: safeTheme.onSurface, fontWeight: 'bold', fontSize: 16 }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteConfirm} style={{ flex: 1, height: 56, borderRadius: 20, backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Fixed Navigation Buttons - Moved here to be on top */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 1000 }}>
        <TouchableOpacity onPress={handleBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.navigate('EditGoal', { goalId: goal.id })} style={styles.iconBtn}>
            <MaterialIcons name="edit" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeleteModalVisible(true)} style={[styles.iconBtn, { backgroundColor: 'rgba(244, 67, 54, 0.5)' }]}>
            <MaterialIcons name="delete" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default GoalDetailScreen;