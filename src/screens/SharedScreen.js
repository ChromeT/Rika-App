import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, TextInput, Alert, FlatList, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';
import { uploadMultipleToFirebaseStorage } from '../utils/firebaseStorageUpload';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

// ─── Add Goal Modal ───────────────────────────────────────────────────────
const AddGoalModal = ({ visible, onClose, onSave, theme }) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [priority, setPriority] = useState('2');
  const [previewImage, setPreviewImage] = useState(null);
  const [capsuleMessage, setCapsuleMessage] = useState('');
  const [capsuleUnlockDate, setCapsuleUnlockDate] = useState(dayjs().add(6, 'month'));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.15, base64: true });
    if (!result.canceled) setPreviewImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Ups!', 'Nama goal tidak boleh kosong.'); return; }
    
    const goalData = { 
      name: name.trim(), 
      targetAmount: Number(target) || 0, 
      priority: Number(priority) || 2, 
      previewImage 
    };

    // Add time capsule data if provided
    if (capsuleMessage.trim()) {
      goalData.capsuleMessage = capsuleMessage.trim();
      goalData.capsuleUnlockDate = capsuleUnlockDate.toISOString();
    }

    onSave(goalData);
    setName(''); setTarget(''); setPriority('2'); setPreviewImage(null);
    setCapsuleMessage('');
    setCapsuleUnlockDate(dayjs().add(6, 'month'));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 48 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 20, letterSpacing: -0.5 }}>Goal baru</Text>

          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Nama goal</Text>
          <TextInput style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 14, padding: 14, color: theme.onSurface, marginBottom: 14, borderWidth: 1, borderColor: theme.outlineVariant + '33' }} placeholder="Misal: Liburan ke Jepang" placeholderTextColor={theme.onSurfaceVariant + '80'} value={name} onChangeText={setName} />

          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Target nominal (Rp) — Opsional</Text>
          <TextInput style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 14, padding: 14, color: theme.onSurface, marginBottom: 14, borderWidth: 1, borderColor: theme.outlineVariant + '33' }} placeholder="0" keyboardType="numeric" placeholderTextColor={theme.onSurfaceVariant + '80'} value={target} onChangeText={setTarget} />

          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Prioritas</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[{ v: '1', label: '🔥 Utama' }, { v: '2', label: '⭐ Normal' }, { v: '3', label: '💤 Nanti' }].map(p => (
              <TouchableOpacity key={p.v} onPress={() => setPriority(p.v)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: priority === p.v ? theme.primaryContainer : theme.surfaceContainerLow, borderWidth: 1, borderColor: priority === p.v ? theme.primary : theme.outlineVariant + '33' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: priority === p.v ? theme.onPrimaryContainer : theme.onSurfaceVariant }}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Foto preview — Opsional</Text>
          <TouchableOpacity onPress={pickImage} style={{ height: 100, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.surfaceContainerLow, borderWidth: 1, borderColor: theme.outlineVariant + '33', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            {previewImage ? <Image source={{ uri: previewImage }} style={{ width: '100%', height: '100%' }} /> : <><MaterialIcons name="add-photo-alternate" size={24} color={theme.onSurfaceVariant} /><Text style={{ color: theme.onSurfaceVariant, fontSize: 11, marginTop: 4 }}>Pilih foto impian</Text></>}
          </TouchableOpacity>

          <View style={{ marginBottom: 16, backgroundColor: theme.surfaceContainerLow + '60', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.primary + '22' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialIcons name="lock-clock" size={18} color={theme.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>TIME CAPSULE</Text>
            </View>
            <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, marginBottom: 8 }}>Tulis pesan untuk dibuka saat goal tercapai</Text>
            <TextInput 
              style={{ backgroundColor: theme.surfaceContainerLowest, borderRadius: 12, padding: 12, color: theme.onSurface, fontSize: 13, marginBottom: 8, height: 60, textAlignVertical: 'top' }} 
              placeholder="Contoh: Selamat! Kamu berhasil menabung untuk..."
              placeholderTextColor={theme.onSurfaceVariant}
              multiline
              value={capsuleMessage}
              onChangeText={setCapsuleMessage}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="event" size={16} color={theme.onSurfaceVariant} />
              <Text style={{ fontSize: 11, color: theme.onSurfaceVariant }}>Buka pada: {capsuleUnlockDate.format('DD MMM YYYY')}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={{ flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: theme.surfaceContainerHighest }} onPress={onClose}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: theme.primary }} onPress={handleSave}>
              <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Achieve Modal (Multi-Media + Transaction Picker) ─────────────────────
const AchieveModal = ({ visible, goal, onClose, onSave, theme, transactions = [], uploading = false }) => {
  const [mediaList, setMediaList] = useState([]);
  const [caption, setCaption] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState([]);

  const toggleTx = (id) => setSelectedTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const recentTx = transactions.slice(0, 20);
  const formatMoney = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v || 0);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: false,
      quality: 0.1,
      base64: false,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      setMediaList(prev => [...prev, {
        uri: asset.uri,
        type: isVideo ? 'video' : 'image',
        caption: '',
      }]);
    }
  };

  const updateCaption = (index, text) => {
    setMediaList(prev => prev.map((m, i) => i === index ? { ...m, caption: text } : m));
  };

  const removeMedia = (index) => setMediaList(prev => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    onSave({ media: mediaList, memoryCaption: caption, actualAmount: Number(actualAmount) || 0, relatedTransactionIds: selectedTxIds });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <ScrollView style={{ backgroundColor: theme.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%' }} contentContainerStyle={{ padding: 28, paddingBottom: 48 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: theme.onSurface, marginBottom: 4, letterSpacing: -0.5 }}>🎉 Goal Tercapai!</Text>
          <Text style={{ fontSize: 13, color: theme.onSurfaceVariant, marginBottom: 20 }}>"{goal?.name}"</Text>

          {/* Media list */}
          {mediaList.map((m, i) => (
            <View key={i} style={{ marginBottom: 12, backgroundColor: theme.surfaceContainerLow, borderRadius: 16, overflow: 'hidden' }}>
              {m.type === 'video'
                ? <View style={{ width: '100%', height: 130, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialIcons name="play-circle-filled" size={48} color="rgba(255,255,255,0.8)" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>Video</Text>
                  </View>
                : <Image source={{ uri: m.uri }} style={{ width: '100%', height: 130 }} />
              }
              <TouchableOpacity onPress={() => removeMedia(i)} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 4 }}>
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={{ padding: 10, color: theme.onSurface, fontSize: 13 }}
                placeholder="Keterangan media ini... (opsional)"
                placeholderTextColor={theme.onSurfaceVariant + '80'}
                value={m.caption}
                onChangeText={(t) => updateCaption(i, t)}
              />
            </View>
          ))}

          <TouchableOpacity onPress={pickMedia} style={{ height: 56, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.primary + '66', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            <MaterialIcons name="add-photo-alternate" size={20} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>+ Foto / Video ({mediaList.length})</Text>
          </TouchableOpacity>

          {/* ── Pilih Transaksi Terkait ── */}
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Transaksi Saat Ini</Text>
          <Text style={{ fontSize: 11, color: theme.onSurfaceVariant + '99', marginBottom: 10 }}>Pilih pengeluaran yang kamu buat saat mencapai goal ini</Text>
          {recentTx.map(tx => {
            const isSelected = selectedTxIds.includes(tx.id);
            const total = (tx.myContrib || 0) + (tx.partnerContrib || 0);
            return (
              <TouchableOpacity key={tx.id} onPress={() => toggleTx(tx.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 8, borderRadius: 14,
                  backgroundColor: isSelected ? theme.primary + '1A' : theme.surfaceContainerLow,
                  borderWidth: 1.5, borderColor: isSelected ? theme.primary : theme.outlineVariant + '22' }}>
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: tx.type === 'income' ? theme.primary + '1A' : theme.error + '1A', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'payments' : 'shopping-bag')} size={16} color={tx.type === 'income' ? theme.primary : theme.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurface }}>{tx.name}</Text>
                  <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>{tx.category} • {new Date(tx.date).toLocaleDateString('id-ID')}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '900', color: tx.type === 'income' ? theme.primary : theme.error }}>{tx.type === 'income' ? '+' : '-'}Rp {formatMoney(total)}</Text>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isSelected ? theme.primary : theme.outlineVariant, backgroundColor: isSelected ? theme.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                  {isSelected && <MaterialIcons name="check" size={12} color={theme.onPrimary} />}
                </View>
              </TouchableOpacity>
            );
          })}
          {selectedTxIds.length > 0 && <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>✓ {selectedTxIds.length} transaksi dipilih</Text>}

          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Cerita kenangan — Opsional</Text>
          <TextInput style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 14, padding: 14, color: theme.onSurface, height: 80, textAlignVertical: 'top', marginBottom: 14, borderWidth: 1, borderColor: theme.outlineVariant + '33' }} placeholder="Tulis momen spesial saat ini tercapai..." placeholderTextColor={theme.onSurfaceVariant + '80'} value={caption} onChangeText={setCaption} multiline />

          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Nominal riil yang dikeluarkan (Rp)</Text>
          <TextInput style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 14, padding: 14, color: theme.onSurface, marginBottom: 20, borderWidth: 1, borderColor: theme.outlineVariant + '33' }} placeholder="0" keyboardType="numeric" placeholderTextColor={theme.onSurfaceVariant + '80'} value={actualAmount} onChangeText={setActualAmount} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={{ flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: theme.surfaceContainerHighest }} onPress={onClose} disabled={uploading}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Nanti saja</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: uploading ? theme.surfaceContainerHighest : theme.primary }} onPress={handleSave} disabled={uploading}>
              {uploading 
                ? <ActivityIndicator size="small" color={theme.onSurfaceVariant} />
                : <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Simpan kenangan</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────
const SharedScreen = () => {
  const { theme } = useContext(ThemeContext);
  const { goals, addGoal, updateGoal, addNotification, transactions } = useContext(DataContext);
  const { user, householdUsers, avatar } = useContext(AuthContext);
  const navigation = useNavigation();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [achieveModalVisible, setAchieveModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const myName = user?.name || 'Saya';
  const formatMoney = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v || 0);

  const activeGoals = useMemo(() => goals.filter(g => !g.achieved).sort((a, b) => (a.priority || 2) - (b.priority || 2)), [goals]);
  const achievedGoals = useMemo(() => goals.filter(g => g.achieved).sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt)), [goals]);

  const handleAddGoal = async (data) => {
    const { capsuleMessage, capsuleUnlockDate, ...goalData } = data;
    
    // Include capsule message in goal data if present
    const finalGoalData = {
      ...goalData,
      achieved: false,
      ...(capsuleMessage && { initialCapsule: capsuleMessage, initialCapsuleUnlock: capsuleUnlockDate })
    };
    
    await addGoal(finalGoalData);
    addNotification({ title: 'Goal Baru', body: `${myName} menambahkan goal baru: "${data.name}".`, icon: 'star', color: 'primary', sender: myName });
  };

  const handleMarkAchieved = (goal) => { setSelectedGoal(goal); setAchieveModalVisible(true); };
  const [uploading, setUploading] = useState(false);

  const handleSaveAchievement = async ({ media, memoryCaption, actualAmount, relatedTransactionIds }) => {
    if (!selectedGoal) return;
    setUploading(true);
    
    try {
      let mediaUrls = [];
      
      if (media && media.length > 0) {
        console.log('=== STARTING UPLOAD ===');
        console.log('Platform:', Platform.OS);
        
        try {
          if (Platform.OS === 'web') {
            // Web: Coba Cloudinary
            console.log('Trying Cloudinary...');
            mediaUrls = await uploadMultipleToCloudinary(media);
          } else {
            // Native: Firebase Storage
            console.log('Trying Firebase Storage...');
            const userId = user?.uid || user?.id || 'anonymous';
            mediaUrls = await uploadMultipleToFirebaseStorage(media, userId);
          }
          console.log('=== UPLOAD RESULT ===');
          console.log('mediaUrls:', JSON.stringify(mediaUrls));
        } catch (uploadError) {
          console.error('=== UPLOAD FAILED ===');
          console.error('Error:', uploadError);
          Alert.alert(
            'Upload Gagal', 
            `Gagal upload gambar: ${uploadError.message}\n\nWeb: Pastikan preset Cloudinary sudah "unsigned".\nMobile: Coba di perangkat Android/iOS.`
          );
        }
      }
      
      const updateData = {
        achieved: true,
        achievedAt: new Date().toISOString(),
        memoryCaption,
        actualAmount,
        relatedTransactionIds: relatedTransactionIds || [],
        media: mediaUrls,
        mediaCount: mediaUrls?.length || 0,
      };
      
      await updateGoal(selectedGoal.id, updateData);
      console.log('Firestore save success!');
      
      addNotification({ title: '🎉 Goal Tercapai!', body: `${myName} mencapai goal: "${selectedGoal.name}"!`, icon: 'emoji-events', color: 'primary', sender: myName });
      setAchieveModalVisible(false);
    } catch (error) {
      console.error('=== SAVE ERROR ===');
      console.error(error);
      Alert.alert('Gagal', `Gagal menyimpan: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setSelectedGoal(null);
    }
  };

  const priorityInfo = (p) => {
    if (p === 1) return { label: 'Utama', color: '#F43F5E', icon: 'local-fire-department' };
    if (p === 3) return { label: 'Nanti', color: theme.onSurfaceVariant, icon: 'snooze' };
    return { label: 'Normal', color: '#F59E0B', icon: 'star' };
  };

  const s = getStyles(theme);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.avatarWrapper}>
            {avatar?.startsWith('file://') || avatar?.startsWith('data:image')
              ? <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
              : <MaterialIcons name={avatar || 'person'} size={22} color={theme.primary} />}
          </View>
          <Text style={s.headerTitle}>Goals</Text>
        </View>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={s.addBtn} activeOpacity={0.8}>
          <MaterialIcons name="add" size={22} color={theme.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Active Goals */}
        <Text style={s.sectionTitle}>Sedang Dikejar</Text>
        {activeGoals.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>🎯</Text>
            <Text style={s.emptyTitle}>Belum ada goal aktif</Text>
            <Text style={s.emptyDesc}>Tekan + untuk menambahkan goal pertama kalian!</Text>
          </View>
        ) : activeGoals.map(goal => {
          const pri = priorityInfo(goal.priority);
          const pct = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
          return (
            <View key={goal.id} style={s.activeCard}>
              {goal.previewImage
                ? <Image source={{ uri: goal.previewImage }} style={s.previewImage} />
                : <View style={s.previewPlaceholder}><MaterialIcons name="landscape" size={32} color={theme.onSurfaceVariant + '44'} /></View>}
              <View style={[s.priBadge, { backgroundColor: pri.color + '22', borderColor: pri.color + '55' }]}>
                <MaterialIcons name={pri.icon} size={11} color={pri.color} />
                <Text style={[s.priBadgeText, { color: pri.color }]}>{pri.label}</Text>
              </View>
              <View style={s.activeCardBody}>
                <Text style={s.goalName}>{goal.name}</Text>
                {goal.targetAmount > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: theme.onSurfaceVariant }}>Rp {formatMoney(goal.currentAmount)} / Rp {formatMoney(goal.targetAmount)}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary }}>{Math.round(pct)}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: theme.surfaceContainerHighest, borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.primary, borderRadius: 3 }} />
                    </View>
                  </>
                )}
                <TouchableOpacity style={s.achieveBtn} onPress={() => handleMarkAchieved(goal)} activeOpacity={0.8}>
                  <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={s.achieveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <MaterialIcons name="check-circle" size={16} color={theme.onPrimary} />
                    <Text style={{ color: theme.onPrimary, fontWeight: 'bold', fontSize: 13 }}>Tandai Tercapai</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Memory Album */}
        {achievedGoals.length > 0 && (
          <>
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerLabel}>✨ Kenangan</Text>
              <View style={s.dividerLine} />
            </View>
            {achievedGoals.map(goal => {
              const heroUri = (goal.media && goal.media.length > 0) 
                ? (goal.media[0].url || goal.media[0].uri) 
                : goal.previewImage;
              return (
                <TouchableOpacity key={goal.id} style={s.memoryCard} activeOpacity={0.88}
                  onPress={() => navigation.navigate('MemoryDetail', { goalId: goal.id })}>
                  {heroUri
                    ? <Image source={{ uri: heroUri }} style={s.memoryImage} />
                    : <View style={s.memoryImagePlaceholder}><MaterialIcons name="emoji-events" size={40} color={theme.primary + '88'} /></View>}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                  {/* Media count badge */}
                  {goal.media && goal.media.length > 1 && (
                    <View style={s.mediaBadge}>
                      <MaterialIcons name="photo-library" size={10} color="#fff" />
                      <Text style={s.mediaBadgeText}>{goal.media.length}</Text>
                    </View>
                  )}
                  <View style={s.memoryContent}>
                    <View style={s.achievedBadge}>
                      <MaterialIcons name="emoji-events" size={10} color="#F59E0B" />
                      <Text style={s.achievedBadgeText}>TERCAPAI</Text>
                    </View>
                    <Text style={s.memoryTitle}>{goal.name}</Text>
                    {goal.memoryCaption ? <Text style={s.memoryCaption} numberOfLines={2}>"{goal.memoryCaption}"</Text> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      {goal.actualAmount > 0 && <Text style={s.memoryAmount}>Rp {formatMoney(goal.actualAmount)}</Text>}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={s.memoryDate}>{new Date(goal.achievedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                        <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.5)" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <AddGoalModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onSave={handleAddGoal} theme={theme} />
      <AchieveModal visible={achieveModalVisible} goal={selectedGoal} onClose={() => { setAchieveModalVisible(false); setSelectedGoal(null); }} onSave={handleSaveAchievement} theme={theme} transactions={transactions} uploading={uploading} />
    </View>
  );
};

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: t.surface },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoText: { fontSize: 22, fontWeight: '900', color: t.primary, letterSpacing: -1, marginRight: 4 },
  avatarWrapper: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: t.surfaceContainer, borderWidth: 1, borderColor: t.outlineVariant + '33', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: t.primary, letterSpacing: -0.5 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: t.onSurfaceVariant, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  emptyCard: { backgroundColor: t.surfaceContainerLow, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: t.outlineVariant + '1A', borderStyle: 'dashed', marginBottom: 24 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: t.onSurface, marginBottom: 4 },
  emptyDesc: { fontSize: 12, color: t.onSurfaceVariant, textAlign: 'center' },
  activeCard: { backgroundColor: t.surfaceContainerLow, borderRadius: 24, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: t.outlineVariant + '1A' },
  previewImage: { width: '100%', height: 150 },
  previewPlaceholder: { width: '100%', height: 100, backgroundColor: t.surfaceContainer, justifyContent: 'center', alignItems: 'center' },
  priBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  priBadgeText: { fontSize: 10, fontWeight: '800' },
  activeCardBody: { padding: 16 },
  goalName: { fontSize: 18, fontWeight: '900', color: t.onSurface, letterSpacing: -0.5, marginBottom: 10 },
  achieveBtn: { borderRadius: 14, overflow: 'hidden' },
  achieveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.outlineVariant + '44' },
  dividerLabel: { fontSize: 12, fontWeight: '800', color: t.onSurfaceVariant, letterSpacing: 1 },
  memoryCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 16, height: 240, position: 'relative', backgroundColor: t.surfaceContainerLow },
  memoryImage: { width: '100%', height: '100%', position: 'absolute' },
  memoryImagePlaceholder: { width: '100%', height: '100%', backgroundColor: t.surfaceContainer, justifyContent: 'center', alignItems: 'center' },
  mediaBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  mediaBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  memoryContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  achievedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B22', borderColor: '#F59E0B55', borderWidth: 1, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginBottom: 6 },
  achievedBadgeText: { fontSize: 9, fontWeight: '800', color: '#F59E0B', letterSpacing: 1 },
  memoryTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 2 },
  memoryCaption: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginBottom: 6 },
  memoryAmount: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  memoryDate: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
});

export default SharedScreen;
