import React, { useState, useEffect, useContext, useCallback } from 'react';
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
const AddFundingModal = ({ visible, onClose, onSave, theme, currentAmount }) => {
  const [amount, setAmount] = useState('');

  const handleSave = () => {
    const numAmount = Number(amount);
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
          <TextInput
            style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 16, color: theme.onSurface, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}
            placeholder="0"
            placeholderTextColor={theme.onSurfaceVariant}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

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
  const { goals, updateGoal, addNotification } = useContext(DataContext);
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
      await updateGoal(goal.id, { currentAmount: newAmount });
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
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.onSurfaceVariant }}>Goal tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
        <View style={{ padding: 20 }}>
          {/* Description */}
          {goal.description ? (
            <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <Text style={{ color: theme.onSurface, fontSize: 14, lineHeight: 22 }}>{goal.description}</Text>
            </View>
          ) : null}

          {/* Progress Card */}
          <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 24, padding: 20, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>TERKUMPUL</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: theme.primary }}>Rp {formatMoney(goal.currentAmount)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>TARGET</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.onSurface }}>Rp {formatMoney(goal.targetAmount)}</Text>
              </View>
            </View>
            
            <View style={{ height: 10, backgroundColor: theme.surfaceContainerHighest, borderRadius: 5, marginBottom: 12 }}>
              <View style={{ height: '100%', width: `${progress}%`, backgroundColor: theme.primary, borderRadius: 5 }} />
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>{progress.toFixed(0)}% tercapai</Text>
              <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Sisa Rp {formatMoney(remaining)}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity 
            onPress={() => setFundingModalVisible(true)}
            style={{ backgroundColor: theme.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12 }}
          >
            <Text style={{ color: theme.onPrimary, fontWeight: 'bold', fontSize: 16 }}>Tambah Dana</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleMarkAchieved}
            style={{ backgroundColor: theme.primaryContainer, padding: 16, borderRadius: 16, alignItems: 'center' }}
          >
            <Text style={{ color: theme.onPrimaryContainer, fontWeight: 'bold', fontSize: 16 }}>Tandai Tercapai</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddFundingModal 
        visible={fundingModalVisible}
        onClose={() => setFundingModalVisible(false)}
        onSave={handleAddFunding}
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