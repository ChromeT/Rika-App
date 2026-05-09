import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';

const formatMoney = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v || 0);

export const EditGoalScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { goalId } = route.params;
  const { theme } = useContext(ThemeContext);
  const { goals, updateGoal, transactions } = useContext(DataContext);
  
  const goal = goals.find(g => g.id === goalId);
  const isAchieved = goal?.achieved;
  
  const [name, setName] = useState(goal?.name || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [targetAmount, setTargetAmount] = useState(String(goal?.targetAmount || 0));
  const [mediaList, setMediaList] = useState(goal?.media ? [...goal.media] : []);
  const [memoryCaption, setMemoryCaption] = useState(goal?.memoryCaption || '');
  const [actualAmount, setActualAmount] = useState(String(goal?.actualAmount || 0));
  const [relatedTxIds, setRelatedTxIds] = useState(goal?.relatedTransactionIds || []);
  
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama goal tidak boleh kosong');
      return;
    }
    
    try {
      const updateData = {
        name: name.trim(),
        targetAmount: Number(targetAmount) || 0,
      };

      if (isAchieved) {
        updateData.memoryCaption = memoryCaption;
        updateData.actualAmount = Number(actualAmount) || 0;
        updateData.relatedTransactionIds = relatedTxIds;
        updateData.media = mediaList;
        if (mediaList.length > 0) {
          updateData.previewImage = mediaList[0].type === 'image' ? mediaList[0].uri : goal.previewImage;
          updateData.mediaCount = mediaList.length;
        }
      } else {
        updateData.description = description;
        updateData.media = mediaList;
        if (mediaList.length > 0) {
          updateData.previewImage = mediaList[0].type === 'image' ? mediaList[0].uri : null;
        }
      }

      await updateGoal(goalId, updateData);
      Alert.alert('Berhasil', 'Goal diperbarui', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Save error:', e);
      Alert.alert('Gagal', 'Tidak dapat memperbarui goal');
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
            <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <TextInput 
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="numeric"
                style={{ color: theme.onSurface, fontSize: 16, fontWeight: 'bold' }}
              />
            </View>
          </>
        )}

        {/* Actual Amount - hanya untuk tercapai */}
        {isAchieved && (
          <>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>PENGELUARAN RIIL (RP)</Text>
            <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <TextInput 
                value={actualAmount}
                onChangeText={setActualAmount}
                keyboardType="numeric"
                style={{ color: theme.onSurface, fontSize: 16, fontWeight: 'bold' }}
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default EditGoalScreen;