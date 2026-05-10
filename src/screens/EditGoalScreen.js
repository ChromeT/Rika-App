import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';

import { uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';

const formatMoney = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v || 0);

export const EditGoalScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { goalId } = route.params;
  const { theme } = useContext(ThemeContext);
  const { goals, updateGoal, deleteGoal, transactions, addNotification } = useContext(DataContext);
  const { user, householdUsers } = useContext(AuthContext);
  
  const partnerName = householdUsers?.find(u => u !== (user?.name || ''));
  const hasPartner = !!partnerName;
  
  const goal = goals.find(g => g.id === goalId);
  const isAchieved = goal?.achieved;
  
  const [name, setName] = useState(goal?.name || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [targetAmount, setTargetAmount] = useState(String(goal?.targetAmount || 0));
  const [mediaList, setMediaList] = useState(goal?.media ? [...goal.media] : []);
  const [memoryCaption, setMemoryCaption] = useState(goal?.memoryCaption || '');
  const [actualAmount, setActualAmount] = useState(String(goal?.actualAmount || 0));
  const [relatedTxIds, setRelatedTxIds] = useState(goal?.relatedTransactionIds || []);
  const [uploading, setUploading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Currency & Cursor Logic
  const targetRef = useRef(String(goal?.targetAmount || 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  const actualRef = useRef(String(goal?.actualAmount || 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  const selectionTargetRef = useRef({ start: 0, end: 0 });
  const selectionActualRef = useRef({ start: 0, end: 0 });
  const [selectionTarget, setSelectionTarget] = useState({ start: 0, end: 0 });
  const [selectionActual, setSelectionActual] = useState({ start: 0, end: 0 });

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '').toString();
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleTargetAmountChange = (val) => {
    const oldText = targetRef.current || '';
    const oldSel = selectionTargetRef.current.start;
    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');

    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = val.slice(0, oldSel - 2) + val.slice(oldSel - 1);
    }
    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setTargetAmount(formatted);
    targetRef.current = formatted;
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

  const handleActualAmountChange = (val) => {
    const oldText = actualRef.current || '';
    const oldSel = selectionActualRef.current.start;
    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');

    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = val.slice(0, oldSel - 2) + val.slice(oldSel - 1);
    }
    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setActualAmount(formatted);
    actualRef.current = formatted;
    let newPos = formatted.length;
    let count = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (count >= digitsAfter) break;
      if (formatted[i] !== '.') count++;
      newPos = i;
    }
    setSelectionActual({ start: newPos, end: newPos });
    selectionActualRef.current = { start: newPos, end: newPos };
  };

  // Format initial values
  useEffect(() => {
    if (goal) {
      const ft = formatInput(String(goal.targetAmount || 0));
      setTargetAmount(ft);
      targetRef.current = ft;
      const fa = formatInput(String(goal.actualAmount || 0));
      setActualAmount(fa);
      actualRef.current = fa;
    }
  }, [goal]);
  
  const recentTxs = Array.isArray(transactions) ? transactions.slice(0, 30) : [];

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result.assets) {
        const newMedia = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          caption: '',
        }));
        setMediaList(prev => [...prev, ...newMedia]);
      }
    } catch (e) {
      console.log('Image picker error:', e);
    }
  };

  const updateMediaCaption = (index, text) => {
    setMediaList(prev => prev.map((m, i) => i === index ? { ...m, caption: text } : m));
  };

  const removeMedia = (index) => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTx = (txId) => {
    setRelatedTxIds(prev => 
      prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama goal tidak boleh kosong');
      return;
    }
    
    // Tutup halaman langsung agar interaktif
    navigation.goBack();
    
    // Proses upload dan simpan di background
    (async () => {
      let finalMediaList = mediaList;
      
      const hasLocalMedia = mediaList.some(m => !m.url || m.uri?.startsWith('file://') || m.uri?.startsWith('content://'));
      if (hasLocalMedia) {
        try {
          const localMedia = mediaList.filter(m => !m.url || m.uri?.startsWith('file://') || m.uri?.startsWith('content://'));
          const uploaded = await uploadMultipleToCloudinary(localMedia);
          let uploadedIdx = 0;
          finalMediaList = mediaList.map(m => {
            if (!m.url || m.uri?.startsWith('file://') || m.uri?.startsWith('content://')) {
              return uploaded[uploadedIdx++] || m;
            }
            return m;
          });
        } catch (e) {
          console.error('Upload error:', e);
          return; // Batalkan update jika upload gagal
        }
      }

      try {
        const updateData = {
          name: name.trim(),
          targetAmount: Number(targetAmount.replace(/\./g, '')) || 0,
        };

        if (isAchieved) {
          updateData.memoryCaption = memoryCaption;
          updateData.actualAmount = Number(actualAmount.replace(/\./g, '')) || 0;
          updateData.relatedTransactionIds = relatedTxIds;
          updateData.media = finalMediaList;
          if (finalMediaList.length > 0) {
            updateData.previewImage = finalMediaList[0].type === 'image' ? (finalMediaList[0].url || finalMediaList[0].uri) : goal.previewImage;
            updateData.mediaCount = finalMediaList.length;
          } else {
            updateData.previewImage = null;
            updateData.mediaCount = 0;
          }
        } else {
          updateData.description = description;
          updateData.media = finalMediaList;
          if (finalMediaList.length > 0) {
            updateData.previewImage = finalMediaList[0].type === 'image' ? (finalMediaList[0].url || finalMediaList[0].uri) : null;
          } else {
            updateData.previewImage = null;
          }
        }

        await updateGoal(goalId, updateData);

        if (hasPartner) {
          addNotification({
            title: 'Goal diubah',
            body: `${user?.name || 'Pasanganmu'} telah mengubah detail goal "${goal.name}".`,
            icon: 'edit',
            targetType: 'goal',
            targetId: goalId,
            sender: user?.name || 'Sistem',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error('Save error:', e);
      }
    })();
  };

  const handleDeleteConfirm = async () => {
    setDeleteModalVisible(false);
    
    // Proses hapus di background agar interaktif
    deleteGoal(goalId)
      .then(() => {
        if (hasPartner) {
          addNotification({
            title: 'Goal dihapus',
            body: `${user?.name || 'Pasanganmu'} telah menghapus goal "${goal.name}".`,
            icon: 'delete',
            targetType: 'goal',
            targetId: goalId,
            sender: user?.name || 'Sistem',
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch(e => console.error('Delete error:', e));
    
    // Kembali ke tab Goals
    navigation.navigate('Goals');
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
      {uploading && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 12, fontSize: 14 }}>Mengupload media...</Text>
        </View>
      )}
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '22' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
          <MaterialIcons name="close" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.onSurface, flex: 1 }}>
          {isAchieved ? 'Edit Kenangan' : 'Edit Goal'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={{ backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
          <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Nama Goal */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>NAMA GOAL</Text>
        <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <TextInput 
            value={name}
            onChangeText={setName}
            style={{ color: theme.onSurface, fontSize: 16 }}
          />
        </View>

        {/* Deskripsi / Keterangan */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>
          {isAchieved ? 'KETERANGAN' : 'DESKRIPSI'}
        </Text>
        <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16, height: 80 }}>
          <TextInput 
            value={isAchieved ? memoryCaption : description}
            onChangeText={isAchieved ? setMemoryCaption : setDescription}
            multiline
            placeholder={isAchieved ? "Ceritakan momen ini..." : "Ceritakan tentang goal ini..."}
            placeholderTextColor={theme.onSurfaceVariant}
            style={{ color: theme.onSurface, fontSize: 14 }}
          />
        </View>

        {/* Target Nominal - hanya untuk aktif */}
        {!isAchieved && (
          <>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>TARGET NOMINAL (RP)</Text>
            <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.primary, fontWeight: 'bold', marginRight: 8 }}>IDR</Text>
              <TextInput 
                value={targetAmount}
                onChangeText={handleTargetAmountChange}
                selection={selectionTarget}
                onSelectionChange={(e) => {
                  const sel = e.nativeEvent.selection;
                  setSelectionTarget(sel);
                  selectionTargetRef.current = sel;
                }}
                keyboardType="numeric"
                style={{ color: theme.onSurface, fontSize: 16, fontWeight: 'bold', flex: 1 }}
              />
            </View>
          </>
        )}

        {/* Actual Amount - hanya untuk tercapai */}
        {isAchieved && (
          <>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>PENGELUARAN RIIL (RP)</Text>
            <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.primary, fontWeight: 'bold', marginRight: 8 }}>IDR</Text>
              <TextInput 
                value={actualAmount}
                onChangeText={handleActualAmountChange}
                selection={selectionActual}
                onSelectionChange={(e) => {
                  const sel = e.nativeEvent.selection;
                  setSelectionActual(sel);
                  selectionActualRef.current = sel;
                }}
                keyboardType="numeric"
                style={{ color: theme.onSurface, fontSize: 16, fontWeight: 'bold', flex: 1 }}
              />
            </View>
          </>
        )}

        {/* Media List */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12 }}>FOTO / VIDEO</Text>
        {mediaList.map((m, i) => (
          <View key={i} style={{ marginBottom: 10, backgroundColor: theme.surfaceContainerLow, borderRadius: 12, overflow: 'hidden' }}>
            {m.type === 'video' ? (
              <View style={{ width: '100%', height: 100, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <Video source={{ uri: m.uri }} style={{ width: '100%', height: 100 }} resizeMode={ResizeMode.COVER} shouldPlay={false} isLooping={false} />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <MaterialIcons name="play-circle-filled" size={40} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
            ) : (
              <Image source={{ uri: m.uri }} style={{ width: '100%', height: 100 }} />
            )}
            <TouchableOpacity onPress={() => removeMedia(i)} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 }}>
              <MaterialIcons name="close" size={14} color="#fff" />
            </TouchableOpacity>
            <TextInput
              style={{ padding: 8, color: theme.onSurface, fontSize: 12 }}
              placeholder="Keterangan..."
              placeholderTextColor={theme.onSurfaceVariant}
              value={m.caption}
              onChangeText={(t) => updateMediaCaption(i, t)}
            />
          </View>
        ))}
        <TouchableOpacity onPress={pickMedia} style={{ height: 40, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary + '66', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>+ Tambah Media</Text>
        </TouchableOpacity>

        {/* Related Transactions - hanya untuk tercapai */}
        {isAchieved && (
          <>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>TRANSAKSI TERKAIT</Text>
            <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, marginBottom: 12 }}>Pilih transaksi yang relevan</Text>
            {recentTxs.map(tx => {
              const isSelected = relatedTxIds.includes(tx.id);
              const total = (tx.myContrib || 0) + (tx.partnerContrib || 0);
              return (
                <TouchableOpacity key={tx.id} onPress={() => toggleTx(tx.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 6, borderRadius: 10,
                    backgroundColor: isSelected ? theme.primary + '1A' : theme.surfaceContainerLow,
                    borderWidth: 1.5, borderColor: isSelected ? theme.primary : theme.outlineVariant + '22' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: tx.type === 'income' ? theme.primary + '1A' : theme.error + '1A', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                    <MaterialIcons name={tx.icon || 'receipt'} size={14} color={tx.type === 'income' ? theme.primary : theme.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurface }} numberOfLines={1}>{tx.name}</Text>
                    <Text style={{ fontSize: 9, color: theme.onSurfaceVariant }}>{new Date(tx.date).toLocaleDateString('id-ID')}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: tx.type === 'income' ? theme.primary : theme.error }}>
                    {tx.type === 'income' ? '+' : '-'}Rp {formatMoney(total)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <TouchableOpacity onPress={() => setDeleteModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 16, backgroundColor: theme.error + '1A', borderRadius: 16, borderWidth: 1, borderColor: theme.error }}>
          <MaterialIcons name="delete" size={24} color={theme.error} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.error, fontWeight: 'bold', fontSize: 16 }}>Hapus Goal Ini</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Custom Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.error + '1A', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <MaterialIcons name="delete-outline" size={32} color={theme.error} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 8, textAlign: 'center' }}>Hapus Goal</Text>
            <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}>
              Apakah kamu yakin ingin menghapus goal "{goal.name}"? Tindakan ini tidak dapat dibatalkan.
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

export default EditGoalScreen;