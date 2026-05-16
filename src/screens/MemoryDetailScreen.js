import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Modal, FlatList, TextInput, Platform, Linking, Alert, ActivityIndicator, Animated } from 'react-native';
import Text from '../components/ThemeText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { formatMoney as formatMoneyUtil } from '../utils/formatUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import AsyncStorage from '@react-native-async-storage/async-storage';

dayjs.extend(isSameOrAfter);

const { width, height } = Dimensions.get('window');

// Helper to format money
const formatMoney = (v) => formatMoneyUtil(v || 0);

const VideoPlayer = ({ uri, width, height, onClose }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentMode="contain"
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

// --- Media Modal ---
const MediaModal = ({ visible, mediaList, onClose, startIndex = 0 }) => {
  const insets = useSafeAreaInsets();
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const current = mediaList[currentIdx];
  
  if (!current) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: Math.max(insets.top, 16), right: 20, zIndex: 99, padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {current.type === 'video' ? (
            <VideoPlayer 
              uri={current.url || current.uri} 
              width={width} 
              height={height * 0.75} 
              onClose={onClose} 
            />
          ) : (
            <ExpoImage source={{ uri: current.url || current.uri }} style={{ width, height: height * 0.75 }} contentFit="contain" />
          )}
        </View>
        {current.caption ? (
          <View style={{ padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Text style={{ color: '#fff', fontSize: 14, fontStyle: 'italic', textAlign: 'center' }}>"{current.caption}"</Text>
          </View>
        ) : null}
        {mediaList.length > 1 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 150, paddingHorizontal: 20 }}>
            <TouchableOpacity disabled={currentIdx === 0} onPress={() => setCurrentIdx(c => c - 1)} style={{ opacity: currentIdx === 0 ? 0.3 : 1 }}>
              <MaterialIcons name="chevron-left" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontWeight: 'bold', alignSelf: 'center' }}>{currentIdx + 1} / {mediaList.length}</Text>
            <TouchableOpacity disabled={currentIdx === mediaList.length - 1} onPress={() => setCurrentIdx(c => c + 1)} style={{ opacity: currentIdx === mediaList.length - 1 ? 0.3 : 1 }}>
              <MaterialIcons name="chevron-right" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// --- Capsule Bottom Sheet ---
const CapsuleBottomSheet = ({ visible, onClose, onSave, theme }) => {
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState(dayjs().add(1, 'month'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef(null);

  const handleSave = () => {
    if (!message.trim()) return Alert.alert('Error', 'Pesan tidak boleh kosong');
    onSave({ message: message.trim(), unlockDate: unlockDate.toISOString() });
    setMessage('');
    setUnlockDate(dayjs().add(1, 'month'));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 160 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface }}>Tulis Pesan Capsule</Text>
            <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={24} color={theme.onSurfaceVariant} /></TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>PESAN UNTUK MASA DEPAN</Text>
          <TextInput
            style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 16, color: theme.onSurface, height: 100, textAlignVertical: 'top', marginBottom: 20 }}
            placeholder="Tulis sesuatu yang ingin kamu ingat..."
            placeholderTextColor={theme.onSurfaceVariant}
            multiline
            value={message}
            onChangeText={setMessage}
          />

          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>TANGGAL BUKA</Text>
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS === 'web') {
                dateInputRef.current?.showPicker?.() || dateInputRef.current?.click();
              } else {
                setShowDatePicker(true);
              }
            }} 
            style={{ backgroundColor: theme.surfaceContainerLow, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, position: 'relative', overflow: 'hidden' }}
          >
            <Text style={{ color: theme.onSurface, fontWeight: 'bold' }}>{unlockDate.format('DD MMMM YYYY')}</Text>
            <MaterialIcons name="calendar-today" size={20} color={theme.primary} />
            {Platform.OS === 'web' && (
              <input 
                ref={dateInputRef}
                type="date" 
                value={unlockDate.format('YYYY-MM-DD')}
                onChange={(e) => {
                  if (e.target.value) setUnlockDate(dayjs(e.target.value));
                }}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
            )}
          </TouchableOpacity>

          {showDatePicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={unlockDate.toDate()}
              mode="date"
              display="default"
              minimumDate={dayjs().add(1, 'day').toDate()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setUnlockDate(dayjs(selectedDate));
              }}
            />
          )}

          <TouchableOpacity onPress={handleSave} style={{ backgroundColor: theme.primary, padding: 16, borderRadius: 16, alignItems: 'center' }}>
            <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Simpan Capsule</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- Main Screen ---
const MemoryDetailScreen = ({ route }) => {
  console.log('MemoryDetailScreen params:', route?.params);
  const { goalId } = route?.params || {};
  const navigation = useNavigation();
  const { theme } = useContext(ThemeContext);
  const { user, householdUsers } = useContext(AuthContext);
  const { goals, addNotification } = useContext(DataContext);
  const insets = useSafeAreaInsets();
  const householdId = user?.householdId;
  
  const partnerName = householdUsers?.find(u => u !== (user?.name || ''));
  const hasPartner = !!partnerName;
  
  console.log('MemoryDetail: goalId:', goalId, 'householdId:', householdId, 'user:', user);

  const goal = goals.find(g => g.id === goalId);
  const [memories, setMemories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [capsules, setCapsules] = useState([]);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [capsuleSheetVisible, setCapsuleSheetVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(!goal);

  // Animations
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

  useEffect(() => {
    if (!loading && goal) {
      Animated.stagger(100, [
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
    }
  }, [loading, goal]);

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

  // Data fetching
  useEffect(() => {
    if (!householdId || !goalId) return;

    let unsubTx = () => {};
    let unsubCapsules = () => {};

    try {
      unsubTx = onSnapshot(
        collection(db, 'households', householdId, 'transactions'),
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setTransactions(data);
        }
      );

      unsubCapsules = onSnapshot(
        collection(db, 'households', householdId, 'goals', goalId, 'capsules'),
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCapsules(data);
        }
      );
    } catch (error) {
      console.error('Error in MemoryDetail subscriptions:', error);
    }

    return () => {
      unsubTx();
      unsubCapsules();
    };
  }, [goalId, householdId]);

  // Initial data load for goal media (handled primarily by context now)
  useEffect(() => {
    if (goal && goal.media) {
      setMemories(goal.media);
      setLoading(false);
    }
  }, [goal]);

  // Sync memories and loading state when goal changes
  useEffect(() => {
    if (goal) {
      setLoading(false);
      if (goal.media) {
        setMemories(goal.media);
      }
    }
  }, [goal]);

  // Render Helpers
  if (!householdId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (loading || !goal) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const firstMemory = memories && memories.length > 0 ? memories[0] : null;
  const isVideoMemory = firstMemory?.type === 'video';
  const heroUri = isVideoMemory ? (goal.previewImage || firstMemory?.uri) : (firstMemory?.url || firstMemory?.uri || goal.previewImage);
  
  const created = dayjs(goal.createdAt);
  const achieved = dayjs(goal.achievedAt);
  const duration = achieved.diff(created, 'day');

  // Filter transactions based on relatedTransactionIds from goal
  const relatedTxIds = goal?.relatedTransactionIds || [];
  const relatedTransactions = transactions.filter(tx => relatedTxIds.includes(tx.id));
  
  // Calculate summary from related transactions only
  const totalExpense = relatedTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.myContrib || 0) + (t.partnerContrib || 0), 0);
  const durationMonths = Math.floor(duration / 30) || 1;
  const durationDays = duration % 30;
  const avgSave = goal.targetAmount > 0 ? Math.round(goal.targetAmount / durationMonths) : 0;

  // Timeline data
  const monthDiff = achieved.diff(created, 'month');
  const timelineMonths = [];
  for (let i = 0; i <= monthDiff; i++) {
    timelineMonths.push(created.add(i, 'month').format('MMM'));
  }

  const handleDeleteConfirm = async () => {
    setDeleteModalVisible(false);
    try {
      await deleteDoc(doc(db, 'households', householdId, 'goals', goal.id));
      if (hasPartner) {
        addNotification({
          title: 'Goal dihapus',
          body: `${user?.name || 'Pasanganmu'} telah menghapus goal kenangan "${goal.name}".`,
          icon: 'delete',
          targetType: 'goal',
          targetId: goal.id,
          sender: user?.name || 'Sistem',
          createdAt: new Date().toISOString(),
        });
      }
      handleBack();
    } catch (e) {
      console.error('Delete error', e);
    }
  };

  // Render
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        
        {/* --- HERO SECTION --- */}
        <Animated.View style={{ height: 220, position: 'relative', opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
          <ExpoImage source={{ uri: heroUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          {isVideoMemory && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialIcons name="play-circle-filled" size={64} color="rgba(255,255,255,0.9)" />
            </View>
          )}
          <View style={{ position: 'absolute', top: insets.top + 12, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 }}>
            <TouchableOpacity onPress={handleBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => navigation.navigate('EditGoal', { goalId: goal.id })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceContainerHighest + '99', justifyContent: 'center', alignItems: 'center' }}>
                <MaterialIcons name="edit" size={20} color={theme.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteModalVisible(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.errorContainer + '99', justifyContent: 'center', alignItems: 'center' }}>
                <MaterialIcons name="delete" size={20} color={theme.onErrorContainer} />
              </TouchableOpacity>
            </View>
          </View>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          
          <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>GOAL TERCAPAI</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 }}>{goal.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
              {achieved.format('DD MMMM YYYY')}
              {duration > 0 && ` • ${duration} hari perjalanan`}
            </Text>
          </View>
        </Animated.View>

        {/* --- KETERANGAN & SUMMARY --- */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>KETERANGAN</Text>
            {goal.memoryCaption ? (
              <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: theme.primary }}>
                <Text style={{ color: theme.onSurface, fontStyle: 'italic', lineHeight: 22 }}>{goal.memoryCaption}</Text>
              </View>
            ) : null}
            
            {goal.location && (
              <TouchableOpacity 
                onPress={() => goal.latitude && goal.longitude ? Linking.openURL(`https://maps.google.com/?q=${goal.latitude},${goal.longitude}`) : Alert.alert('Lokasi tidak valid') }
                style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, alignSelf: 'flex-start' }}
              >
                <MaterialIcons name="place" size={16} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold' }}>{goal.location}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Moved Summary here for better flow in Block 1 */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>RINGKASAN</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: 'Total Pengeluaran', value: `Rp ${formatMoney(totalExpense)}`, icon: 'shopping-cart' },
                { label: 'Lama Menabung', value: `${durationMonths} bln ${durationDays} hr`, icon: 'date-range' },
                { label: 'Transaksi Terkait', value: `${relatedTransactions.length} buah`, icon: 'receipt' },
                { label: 'Rata-rata/Bulan', value: `Rp ${formatMoney(avgSave)}`, icon: 'favorite' },
              ].map((item, i) => (
                <View key={i} style={{ width: '48%', backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 16 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primaryContainer + '33', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                    <MaterialIcons name={item.icon} size={16} color={theme.primary} />
                  </View>
                  <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, marginBottom: 4 }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: theme.onSurface }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* --- KENANGAN (Masonry 2 Kolom) --- */}
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }], paddingHorizontal: 16, marginTop: 8 }}>
          {memories.length > 0 && (
            <View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>KENANGAN</Text>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* Kolom Kiri - Item index 0, 2, 4 */}
                <View style={{ flex: 1, gap: 8 }}>
                  {memories.filter((_, i) => i % 2 === 0).slice(0, 5).map((m, i) => {
                    const originalIndex = i * 2;
                    // Heights: 130px, 85px, 100px, 115px, 90px
                    const heights = [130, 85, 100, 115, 90];
                    const itemHeight = heights[i % 5];
                    
                    return (
                      <TouchableOpacity key={originalIndex} onPress={() => { setSelectedMediaIndex(originalIndex); setMediaModalVisible(true); }} activeOpacity={0.8}>
                        <View style={{ borderRadius: 16, overflow: 'hidden', height: itemHeight, position: 'relative', backgroundColor: theme.surfaceContainerLow }}>
                          <ExpoImage source={{ uri: m.url || m.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          {m.type === 'video' && (
                            <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <MaterialIcons name="play-circle-filled" size={12} color="#fff" />
                            </View>
                          )}
                          {(m.caption || m.caption === '') && (
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '500' }} numberOfLines={2}>{m.caption || ''}</Text>
                            </LinearGradient>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {/* Kolom Kanan - Item index 1, 3, 5 */}
                <View style={{ flex: 1, gap: 8 }}>
                  {memories.filter((_, i) => i % 2 !== 0).slice(0, 5).map((m, i) => {
                    const originalIndex = i * 2 + 1;
                    // Heights: 130px, 85px, 100px, 115px, 90px
                    const heights = [130, 85, 100, 115, 90];
                    const itemHeight = heights[i % 5];
                    
                    return (
                      <TouchableOpacity key={originalIndex} onPress={() => { setSelectedMediaIndex(originalIndex); setMediaModalVisible(true); }} activeOpacity={0.8}>
                        <View style={{ borderRadius: 16, overflow: 'hidden', height: itemHeight, position: 'relative', backgroundColor: theme.surfaceContainerLow }}>
                          <ExpoImage source={{ uri: m.url || m.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          {m.type === 'video' && (
                            <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <MaterialIcons name="play-circle-filled" size={12} color="#fff" />
                            </View>
                          )}
                          {(m.caption || m.caption === '') && (
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '500' }} numberOfLines={2}>{m.caption || ''}</Text>
                            </LinearGradient>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  
                  {/* +X lainnya tile */}
                  {memories.length > 5 && (
                    <TouchableOpacity onPress={() => { setSelectedMediaIndex(0); setMediaModalVisible(true); }} style={{ height: 90, backgroundColor: theme.surfaceContainerLow, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>+{memories.length - 5} lainnya</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </Animated.View>

        {/* --- DATA SECTIONS --- */}
        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          {/* --- ESTIMASI VS RIIL --- */}
          <View style={{ padding: 16, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase' }}>ESTIMASI VS RIIL</Text>
              <View style={{ backgroundColor: (goal.actualAmount || 0) <= goal.targetAmount ? theme.success + '22' : theme.error + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: (goal.actualAmount || 0) <= goal.targetAmount ? theme.success : theme.error }}>
                  {(goal.actualAmount || 0) <= goal.targetAmount ? 'DI BAWAH BUDGET' : 'MELEBIHI BUDGET'}
                </Text>
              </View>
            </View>
            
            <View style={{ backgroundColor: theme.surfaceContainer, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: theme.outlineVariant + '33' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 36, fontWeight: '900', color: theme.onSurface, letterSpacing: -1 }}>
                    {Math.round(((goal.actualAmount || 0) / (goal.targetAmount || 1)) * 100)}%
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.onSurfaceVariant, fontWeight: 'bold' }}>DARI TARGET AWAL</Text>
                </View>
                <View style={{ height: 50, width: 2, backgroundColor: theme.outlineVariant + '33', marginHorizontal: 20 }} />
                <View style={{ flex: 1.5 }}>
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>ESTIMASI</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>Rp {formatMoney(goal.targetAmount)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>RIIL (AKTUAL)</Text>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: (goal.actualAmount || 0) <= goal.targetAmount ? '#10B981' : theme.error }}>
                      Rp {formatMoney(goal.actualAmount || 0)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ height: 12, backgroundColor: theme.surfaceContainerHighest, borderRadius: 6, marginBottom: 12, overflow: 'hidden' }}>
                <View style={{ 
                  height: '100%', 
                  width: `${Math.min(((goal.actualAmount || 0) / (goal.targetAmount || 1)) * 100, 100)}%`, 
                  backgroundColor: (goal.actualAmount || 0) <= goal.targetAmount ? theme.primary : theme.error, 
                  borderRadius: 6 
                }} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                <MaterialIcons 
                  name={(goal.actualAmount || 0) <= goal.targetAmount ? "sentiment-very-satisfied" : "sentiment-neutral"} 
                  size={16} 
                  color={(goal.actualAmount || 0) <= goal.targetAmount ? theme.success : theme.onSurfaceVariant} 
                />
                <Text style={{ fontSize: 12, color: theme.onSurfaceVariant, textAlign: 'center', fontWeight: '500' }}>
                  {(goal.actualAmount || 0) <= goal.targetAmount ? 'Hemat ' : 'Selisih '} 
                  <Text style={{ fontWeight: 'bold', color: theme.onSurface }}>Rp {formatMoney(Math.abs((goal.actualAmount || 0) - goal.targetAmount))}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* --- TRANSAKSI TERKAIT --- */}
          <View style={{ padding: 16, marginTop: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>TRANSAKSI TERKAIT</Text>
            {relatedTransactions.length === 0 ? (
              <Text style={{ color: theme.onSurfaceVariant, textAlign: 'center', padding: 20 }}>Belum ada transaksi terkait goal ini</Text>
            ) : (
              relatedTransactions.map(tx => (
                <View key={tx.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '22' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryContainer + '33', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                     <MaterialIcons name={tx.icon || 'receipt'} size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.onSurface, fontWeight: 'bold', fontSize: 13 }}>{tx.name}</Text>
                    <Text style={{ color: theme.onSurfaceVariant, fontSize: 10 }}>{dayjs(tx.date).format('DD MMM YYYY')}</Text>
                  </View>
                  <Text style={{ color: tx.type === 'income' ? theme.primary : theme.error, fontWeight: '900', fontSize: 13 }}>
                    {tx.type === 'income' ? '+' : '-'}Rp {formatMoney((tx.myContrib || 0) + (tx.partnerContrib || 0))}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* --- PERJALANAN MENABUNG --- */}
          <View style={{ padding: 16, marginTop: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>PERJALANAN MENABUNG</Text>
            <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 20, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>{created.format('DD MMM')}</Text>
                <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>{achieved.format('DD MMM')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                 {timelineMonths.map((month, i) => (
                   <View key={i} style={{ alignItems: 'center' }}>
                      <View style={{ width: i === 0 || i === timelineMonths.length - 1 ? 12 : 8, height: i === 0 || i === timelineMonths.length - 1 ? 12 : 8, borderRadius: 6, backgroundColor: theme.primary }} />
                      {i < timelineMonths.length - 1 && <View style={{ position: 'absolute', left: '50%', top: 4, width: ((width - 100) / (timelineMonths.length - 1)) - 16, height: 2, backgroundColor: theme.primary, zIndex: -1 }} />}
                      <Text style={{ fontSize: 9, color: theme.onSurfaceVariant, marginTop: 6 }}>{month}</Text>
                   </View>
                 ))}
              </View>
            </View>
          </View>

        {/* --- CAPSULE TIME --- */}
        <View style={{ padding: 16, marginTop: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>CAPSULE TIME</Text>
          <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.primary + '33' }}>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
               <MaterialIcons name="lock-clock" size={20} color={theme.primary} />
               <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.onSurface }}>Pesan dari masa lalu</Text>
            </View>

            {/* Initial capsule from goal creation */}
            {goal.initialCapsule && (
              <View style={{ backgroundColor: theme.primaryContainer + '22', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.primary + '33' }}>
                 <Text style={{ fontSize: 10, color: theme.primary, fontWeight: 'bold', marginBottom: 4 }}> pesan pertama • {dayjs(goal.initialCapsuleUnlock).format('DD MMM YYYY')}</Text>
                 <Text style={{ color: theme.onSurface, fontStyle: 'italic' }}>"{goal.initialCapsule}"</Text>
              </View>
            )}

            {capsules.length === 0 && !goal.initialCapsule ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <MaterialIcons name="lock" size={32} color={theme.onSurfaceVariant} />
                <Text style={{ color: theme.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>Belum ada pesan capsule.</Text>
                <Text style={{ color: theme.onSurfaceVariant, fontSize: 10 }}>Tulis pesan untuk disimpan!</Text>
              </View>
            ) : (
              capsules.map(cap => {
                const unlockTime = dayjs(cap.unlockDate);
                const isUnlocked = dayjs().isSameOrAfter(unlockTime);
                return (
                  <View key={cap.id} style={{ backgroundColor: theme.surfaceContainerLowest, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                    {isUnlocked ? (
                      <>
                        <Text style={{ fontSize: 10, color: theme.primary, fontWeight: 'bold', marginBottom: 4 }}>{cap.sender || 'Kamu'} • {unlockTime.format('DD MMM YYYY')}</Text>
                        <Text style={{ color: theme.onSurface, fontStyle: 'italic' }}>"{cap.message}"</Text>
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                         <MaterialIcons name="lock" size={16} color={theme.onSurfaceVariant} />
                         <Text style={{ color: theme.onSurfaceVariant, fontSize: 12 }}>Terbuka pada {unlockTime.format('DD MMM YYYY')}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <TouchableOpacity onPress={() => setCapsuleSheetVisible(true)} style={{ backgroundColor: theme.primary, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 }}>
               <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Tulis Pesan Capsule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      </ScrollView>

      {/* Modals */}
      <MediaModal 
        visible={mediaModalVisible} 
        mediaList={memories} 
        onClose={() => setMediaModalVisible(false)} 
        startIndex={selectedMediaIndex}
      />
      
      <CapsuleBottomSheet 
        visible={capsuleSheetVisible} 
        onClose={() => setCapsuleSheetVisible(false)}
        onSave={async (data) => {
          // Save capsule to Firestore
          if (!householdId) return;
          try {
            await addDoc(collection(db, 'households', householdId, 'goals', goalId, 'capsules'), {
              ...data,
              sender: 'Saya',
              createdAt: new Date().toISOString()
            });
            Alert.alert('Berhasil', 'Pesan capsule tersimpan!');
          } catch(e) {
            Alert.alert('Gagal', 'Tidak dapat menyimpan capsule.');
          }
        }}
        theme={theme}
      />

      {/* Custom Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.error + '1A', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <MaterialIcons name="delete-outline" size={32} color={theme.error} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 8, textAlign: 'center' }}>Hapus Goal</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
              Apakah kamu yakin ingin menghapus goal "{goal?.name}"? Tindakan ini tidak dapat dibatalkan.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: theme.surfaceContainerHighest, alignItems: 'center' }}>
                <Text style={{ color: theme.onSurface, fontWeight: 'bold', fontSize: 16 }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteConfirm} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: theme.error, alignItems: 'center' }}>
                <Text style={{ color: theme.onError, fontWeight: 'bold', fontSize: 16 }}>Hapus</Text>

              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MemoryDetailScreen;