import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Modal, Alert, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../config/firebase';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const formatMoney = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v || 0);

// --- Add Funding Modal ---
const AddFundingModal = ({ visible, onClose, onSave, theme: providedTheme, currentAmount }) => {
  const theme = providedTheme || {
    surface: '#0b0f10',
    onSurface: '#dde7eb',
    onSurfaceVariant: '#a3adb1',
    primary: '#b2cad3',
    surfaceContainerLow: '#141b1d',
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
    setAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 48 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 20 }}>Tambah Dana</Text>
          
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>NOMINAL (RP)</Text>
          <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 24 }}>
            <Text style={{ position: 'absolute', left: 20, zIndex: 10, color: theme.primary, fontWeight: 'bold', fontSize: 20 }}>IDR</Text>
            <TextInput
              style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 24, paddingVertical: 20, paddingLeft: 64, paddingRight: 24, color: theme.onSurface, fontSize: 30, fontWeight: 'bold' }}
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

          <TouchableOpacity onPress={handleSave} style={{ backgroundColor: theme.primary, padding: 16, borderRadius: 16, alignItems: 'center' }}>
            <Text style={{ color: theme.onPrimary, fontWeight: 'bold', fontSize: 16 }}>Simpan</Text>
          </TouchableOpacity>
        </View>
        </TouchableOpacity>
      </TouchableOpacity>
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
  const { goals, updateGoal, deleteGoal, addNotification } = useContext(DataContext);
  const { user, householdUsers } = useContext(AuthContext);
  
  const partnerName = householdUsers?.find(u => u !== (user?.name || ''));
  const hasPartner = !!partnerName;

  const goal = goals.find(g => g.id === goalId);
  const [fundingModalVisible, setFundingModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Progress calculations
  const progress = goal?.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = Math.max((goal?.targetAmount || 0) - (goal?.currentAmount || 0), 0);

  const handleAddFunding = async (amount) => {
    if (!goal) return;
    try {
      const newAmount = (goal.currentAmount || 0) + amount;
      const now = new Date().toISOString();
      const newEntry = {
        amount,
        user: user?.name || 'Saya',
        date: now,
      };
      
      const history = Array.isArray(goal.history) ? [...goal.history, newEntry] : [newEntry];
      
      await updateGoal(goal.id, { 
        currentAmount: newAmount,
        history: history,
        lastContributionAt: now
      });

      addNotification({
        title: 'Dana Ditambahkan!',
        body: `${user?.name || 'Saya'} baru saja menambah Rp ${formatMoney(amount)} untuk goal "${goal.name}".`,
        icon: 'savings',
        color: 'primary',
        sender: user?.name || 'Sistem',
        targetType: 'goal',
        targetId: goal.id,
      });
    } catch (e) {
      Alert.alert('Gagal', 'Tidak dapat menambahkan dana');
    }
  };

  const handleMarkAchieved = () => {
    navigation.navigate('AchieveGoal', { goalId: goal.id });
  };

  const handleDeleteConfirm = async () => {
    setDeleteModalVisible(false);
    try {
      await deleteDoc(doc(db, 'households', user.householdId, 'goals', goal.id));
      if (hasPartner) {
        addNotification({
          title: 'Goal dihapus',
          body: `${user?.name || 'Pasanganmu'} telah menghapus goal "${goal.name}".`,
          icon: 'delete',
          targetType: 'goal',
          targetId: goal.id,
          sender: user?.name || 'Sistem',
          createdAt: new Date().toISOString(),
        });
      }
      navigation.goBack();
    } catch (e) {
      console.error('Delete error', e);
    }
  };

  if (!goal) {
    return (
      <View style={{ flex: 1, backgroundColor: safeTheme.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: safeTheme.onSurfaceVariant }}>Goal tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: safeTheme.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={{ height: 200, position: 'relative' }}>
          <ExpoImage 
            source={{ uri: goal.previewImage }} 
            style={{ width: '100%', height: '100%' }} 
            contentFit="cover" 
          />
          <View style={{ position: 'absolute', top: 48, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 20 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => navigation.navigate('EditGoal', { goalId: goal.id })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <MaterialIcons name="edit" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteModalVisible(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <MaterialIcons name="delete" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }} />
          <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>{goal.name}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={{ padding: 20, paddingBottom: 100 }}>
          {/* Status Badge */}
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ backgroundColor: safeTheme.primary + '22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderSize: 1, borderColor: safeTheme.primary + '44' }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: safeTheme.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                {progress >= 100 ? 'Siap Dicapai' : 'Dalam Perjalanan'}
              </Text>
            </View>
          </View>

          {/* Description */}
          {goal.description ? (
            <Text style={{ color: safeTheme.onSurfaceVariant, fontSize: 14, lineHeight: 22, marginBottom: 24 }}>{goal.description}</Text>
          ) : null}

          {/* Premium Progress Card */}
          <View style={{ backgroundColor: safeTheme.surfaceContainer, borderRadius: 32, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: safeTheme.outlineVariant + '33', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 4, letterSpacing: 0.5 }}>TERKUMPUL</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: safeTheme.primary }}>Rp</Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: safeTheme.onSurface, letterSpacing: -1 }}>{formatMoney(goal.currentAmount)}</Text>
                </View>
              </View>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: safeTheme.primary + '1A', justifyContent: 'center', alignItems: 'center' }}>
                <MaterialIcons name="auto-graph" size={24} color={safeTheme.primary} />
              </View>
            </View>
            
            <View style={{ position: 'relative', height: 12, backgroundColor: safeTheme.surfaceContainerHighest, borderRadius: 6, marginBottom: 16, overflow: 'hidden' }}>
              <LinearGradient 
                colors={[safeTheme.primary, safeTheme.primary + 'AA']} 
                start={{x:0, y:0}} 
                end={{x:1, y:0}} 
                style={{ height: '100%', width: `${progress}%`, borderRadius: 6 }} 
              />
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: safeTheme.onSurface }}>{progress.toFixed(0)}%</Text>
                <Text style={{ fontSize: 10, color: safeTheme.onSurfaceVariant }}>DARI RP {formatMoney(goal.targetAmount)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: safeTheme.error }}>Rp {formatMoney(remaining)}</Text>
                <Text style={{ fontSize: 10, color: safeTheme.onSurfaceVariant }}>KEKURANGAN</Text>
              </View>
            </View>
          </View>

          {/* Action Row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
            <TouchableOpacity 
              onPress={() => setFundingModalVisible(true)}
              style={{ flex: 1.5, backgroundColor: safeTheme.primary, paddingVertical: 16, borderRadius: 20, alignItems: 'center', shadowColor: safeTheme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
            >
              <Text style={{ color: safeTheme.onPrimary, fontWeight: 'bold', fontSize: 15 }}>Tambah Dana</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleMarkAchieved}
              style={{ flex: 1, backgroundColor: safeTheme.surfaceContainerHighest, paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: safeTheme.outlineVariant + '33' }}
            >
              <MaterialIcons name="check" size={24} color={safeTheme.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Savings Journey Timeline */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: safeTheme.onSurface }}>Perjalanan Menabung</Text>
              <MaterialIcons name="timeline" size={20} color={safeTheme.primary} />
            </View>

            {goal.history && goal.history.length > 0 ? (
              <View style={{ paddingLeft: 8 }}>
                {goal.history.slice().reverse().map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', marginBottom: 24 }}>
                    {/* Line & Dot */}
                    <View style={{ alignItems: 'center', marginRight: 16 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: safeTheme.primary, zIndex: 10, borderWidth: 3, borderColor: safeTheme.background }} />
                      {idx !== goal.history.length - 1 && (
                        <View style={{ width: 2, flex: 1, backgroundColor: safeTheme.outlineVariant + '44', marginVertical: -4 }} />
                      )}
                    </View>
                    
                    {/* Content */}
                    <View style={{ flex: 1, backgroundColor: safeTheme.surfaceContainerLow, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: safeTheme.outlineVariant + '11' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: safeTheme.onSurface }}>+ Rp {formatMoney(item.amount)}</Text>
                        <Text style={{ fontSize: 10, color: safeTheme.onSurfaceVariant }}>
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: safeTheme.onSurfaceVariant }}>Oleh <Text style={{ fontWeight: 'bold', color: safeTheme.primary }}>{item.user}</Text></Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 24, padding: 32, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: safeTheme.outlineVariant }}>
                <MaterialIcons name="flag" size={32} color={safeTheme.onSurfaceVariant + '44'} />
                <Text style={{ color: safeTheme.onSurfaceVariant, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                  Belum ada riwayat menabung.{"\n"}Yuk mulai langkah pertamamu!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <AddFundingModal
        visible={fundingModalVisible}
        onClose={() => setFundingModalVisible(false)}
        onSave={handleAddFunding}
        theme={safeTheme}
      />

      {/* Custom Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: safeTheme.surface, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: safeTheme.error + '1A', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <MaterialIcons name="delete-outline" size={32} color={safeTheme.error} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: safeTheme.onSurface, marginBottom: 8, textAlign: 'center' }}>Hapus Goal</Text>
            <Text style={{ fontSize: 14, color: safeTheme.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
              Apakah kamu yakin ingin menghapus goal "{goal?.name}"? Tindakan ini tidak dapat dibatalkan.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: safeTheme.surfaceContainerHighest, alignItems: 'center' }}>
                <Text style={{ color: safeTheme.onSurface, fontWeight: 'bold', fontSize: 16 }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteConfirm} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: safeTheme.error, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GoalDetailScreen;