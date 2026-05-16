import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput, ActivityIndicator, Animated, Platform } from 'react-native';
import Text from '../components/ThemeText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { formatMoney as formatMoneyUtil } from '../utils/formatUtils';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';

const formatMoney = (v) => formatMoneyUtil(v || 0);

const VideoPreview = ({ uri, theme }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
    p.muted = true; // Preview usually muted
  });

  return (
    <View style={{ width: '100%', height: 120, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: 120 }}
        contentMode="cover"
      />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}>
        <MaterialIcons name="play-circle-filled" size={48} color="rgba(255,255,255,0.7)" />
      </View>
    </View>
  );
};

export const AchieveGoalScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { goalId } = route.params;
  const { theme } = useContext(ThemeContext);
  const { goals, transactions, updateGoal } = useContext(DataContext);
  const { user } = useContext(AuthContext);

  const goal = goals.find(g => g.id === goalId);
  
  const [mediaList, setMediaList] = useState([]);
  const [caption, setCaption] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [selectionActual, setSelectionActual] = useState({ start: 0, end: 0 });
  const selectionActualRef = useRef({ start: 0, end: 0 });
  const actualAmountRef = useRef('');

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleActualAmountChange = (val) => {
    const oldText = actualAmountRef.current || '';
    const oldSel = selectionActualRef.current.start;
    
    let processedVal = val;
    // Deteksi jika user menghapus karakter titik (backspace tepat di depan titik)
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');
    
    // Jika panjang string berkurang tapi jumlah digit sama, berarti user menghapus titik
    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      // Hapus karakter angka di depan titik tersebut
      processedVal = oldText.slice(0, oldSel - 2) + oldText.slice(oldSel);
    }

    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    
    setActualAmount(formatted);
    actualAmountRef.current = formatted;

    // Cari posisi baru kursor berdasarkan jumlah digit di belakang (tetap konsisten)
    let newPos = formatted.length;
    let count = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (count >= digitsAfter) break;
      if (formatted[i] !== '.') {
        count++;
      }
      newPos = i;
    }

    setSelectionActual({ start: newPos, end: newPos }); 
    selectionActualRef.current = { start: newPos, end: newPos };
  };
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  
  // Animations
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

  useEffect(() => {
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
  }, []);

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

  const toggleTx = (id) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.5,
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
      Alert.alert('Error', 'Tidak dapat memilih media. Coba masukkan URL di bawah.');
    }
  };

  const updateCaption = (index, text) => {
    setMediaList(prev => prev.map((m, i) => i === index ? { ...m, caption: text } : m));
  };

  const removeMedia = (index) => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
  };

  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
      setMediaList(prev => [...prev, { uri: imageUrl.trim(), type: 'image', caption: '' }]);
      setImageUrl('');
    }
  };

  const handleSave = async () => {
    if (!goal) return;

    // VALIDASI SAKTI
    const numericAmount = Number(actualAmount.replace(/\./g, '')) || 0;
    if (numericAmount <= 0) {
      Alert.alert('Nominal Tidak Valid', 'Masukkan nominal riil yang kamu keluarkan untuk goal ini.');
      return;
    }

    if (mediaList.length === 0) {
      Alert.alert('Media Kosong', 'Kenangan manis butuh setidaknya satu foto atau video untuk diabadikan!');
      return;
    }

    setUploading(true);
    let finalMediaList = mediaList;

    // Upload media to Cloudinary if any
    if (mediaList.length > 0) {
      try {
        const uploaded = await uploadMultipleToCloudinary(mediaList, (idx, percent) => {
          setCurrentUploadIndex(idx);
          setUploadProgress(percent);
        });
        
        if (uploaded.length === 0) {
          setUploading(false);
          Alert.alert('Upload gagal', 'Tidak ada media yang berhasil diupload. Cek koneksi internet kamu.');
          return;
        }
        finalMediaList = uploaded;
      } catch (e) {
        setUploading(false);
        console.error('Upload error:', e);
        Alert.alert('Upload gagal', 'Terjadi kesalahan saat mengupload media: ' + e.message);
        return;
      }
    }

    const updateData = {
      achieved: true,
      achievedAt: new Date().toISOString(),
      memoryCaption: caption,
      actualAmount: Number(actualAmount.replace(/\./g, '')) || 0,
      relatedTransactionIds: selectedTxIds,
      media: finalMediaList,
    };

    try {
      await updateGoal(goal.id, updateData);
      setUploading(false);
      
      // Pop to MainTabs and switch to 'achieved' tab in Goals
      navigation.navigate('MainTabs', { 
        screen: 'Goals', 
        params: { activeTab: 'achieved' } 
      });
    } catch (e) {
      setUploading(false);
      console.error('Save goal error:', e);
      Alert.alert('Gagal', 'Tidak dapat menyimpan perubahan goal');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '22', opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
        <TouchableOpacity onPress={handleBack} style={{ marginRight: 16 }}>
          <MaterialIcons name="close" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.onSurface, flex: 1 }}>Tandai Tercapai</Text>
        <TouchableOpacity onPress={handleSave} style={{ backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
          <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Simpan</Text>
        </TouchableOpacity>
      </Animated.View>

      {uploading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <View style={{ width: '80%', alignItems: 'center' }}>
            {/* Aesthetic Progress Circle/Heart */}
            <View style={{ marginBottom: 32 }}>
              <MaterialIcons name="cloud-upload" size={64} color={theme.primary} />
              <View style={{ position: 'absolute', bottom: -10, right: -10, backgroundColor: theme.primary, borderRadius: 20, padding: 4, borderWidth: 3, borderColor: '#000' }}>
                <MaterialIcons name="favorite" size={20} color={theme.onPrimary} />
              </View>
            </View>

            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 }}>Menyimpan Kenangan...</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 32 }}>Media {currentUploadIndex + 1} dari {mediaList.length}</Text>
            
            {/* Progress Bar Container */}
            <View style={{ width: '100%', height: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
              <LinearGradient
                colors={[theme.primary, theme.primary + '88']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={{ height: '100%', width: `${uploadProgress}%`, borderRadius: 10 }}
              />
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 12 }}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold' }}>{uploadProgress}% Selesai</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Sedang mengabadikan momen kita...</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 150 }}
      >
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 4 }}>🎉 {goal.name}</Text>
          <Text style={{ color: theme.onSurfaceVariant, marginBottom: 20 }}>Pilih media dan transaksi terkait</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
          {/* Media List with Captions */}
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 12 }}>FOTO / VIDEO KENANGAN</Text>
          {mediaList.map((m, i) => (
            <View key={i} style={{ marginBottom: 12, backgroundColor: theme.surfaceContainerLow, borderRadius: 16, overflow: 'hidden' }}>
              {m.type === 'video' ? (
                <VideoPreview uri={m.uri} theme={theme} />
              ) : (
                <Image source={{ uri: m.uri }} style={{ width: '100%', height: 120 }} />
              )}
              <TouchableOpacity onPress={() => removeMedia(i)} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 4 }}>
                <MaterialIcons name="close" size={16} color="#ffffff" />
              </TouchableOpacity>
              <TextInput
                style={{ padding: 10, color: theme.onSurface, fontSize: 13 }}
                placeholder={m.type === 'video' ? "Keterangan video ini... (opsional)" : "Keterangan gambar ini... (opsional)"}
                placeholderTextColor={theme.onSurfaceVariant}
                value={m.caption}
                onChangeText={(t) => updateCaption(i, t)}
              />
            </View>
          ))}

          <TouchableOpacity onPress={pickMedia} style={{ height: 56, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.primary + '66', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <MaterialIcons name="add-photo-alternate" size={20} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>+ Tambah Foto/Video ({mediaList.length})</Text>
          </TouchableOpacity>

          {/* URL Input */}
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>ATAU MASUKKAN LINK GAMBAR</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: theme.surfaceContainerLow, borderRadius: 12, padding: 12, marginRight: 8 }}>
              <TextInput 
                nativeID="image-url-input"
                placeholder="https://..."
                placeholderTextColor={theme.onSurfaceVariant}
                value={imageUrl}
                onChangeText={setImageUrl}
                style={{ color: theme.onSurface, fontSize: 14 }}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            <TouchableOpacity onPress={handleUrlSubmit} style={{ backgroundColor: theme.primaryContainer, padding: 12, borderRadius: 12 }}>
              <MaterialIcons name="check" size={20} color={theme.onPrimaryContainer} />
            </TouchableOpacity>
          </View>

          {/* Caption */}
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>CERITA (OPSIONAL)</Text>
          <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 16, marginBottom: 20, height: 80 }}>
            <TextInput 
              placeholder="Ceritakan momen ini..."
              placeholderTextColor={theme.onSurfaceVariant}
              value={caption}
              onChangeText={setCaption}
              multiline
              style={{ color: theme.onSurface, fontSize: 14, height: '100%' }}
            />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          {/* Actual Amount */}
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>NOMINAL RIIL (RP)</Text>
          <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <TextInput 
              placeholder="0"
              placeholderTextColor={theme.onSurfaceVariant}
              value={actualAmount}
              onChangeText={handleActualAmountChange}
              selection={selectionActual}
              onSelectionChange={(e) => {
                const sel = e.nativeEvent.selection;
                setSelectionActual(sel);
                selectionActualRef.current = sel;
              }}
              keyboardType="numeric"
              style={{ color: theme.onSurface, fontSize: 18, fontWeight: 'bold' }}
            />
          </View>

        {/* Transaction Picker */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 }}>TRANSAKSI TERKAIT (OPSIONAL)</Text>
        <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, marginBottom: 12 }}>Pilih transaksi yang relevan dengan goal ini</Text>
        
        {transactions.slice(0, 30).map(tx => {
          const isSelected = selectedTxIds.includes(tx.id);
          const total = (tx.myContrib || 0) + (tx.partnerContrib || 0);
          return (
            <TouchableOpacity key={tx.id} onPress={() => toggleTx(tx.id)}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, borderRadius: 12,
                backgroundColor: isSelected ? theme.primary + '1A' : theme.surfaceContainerLow,
                borderWidth: 1.5, borderColor: isSelected ? theme.primary : theme.outlineVariant + '22' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: (tx.type === 'income' ? theme.primary : theme.error) + '1A', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'add' : 'remove')} size={16} color={tx.type === 'income' ? theme.primary : theme.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.onSurface }}>{tx.name}</Text>
                <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>{tx.category} • {new Date(tx.date).toLocaleDateString('id-ID')}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '900', color: tx.type === 'income' ? theme.primary : theme.error }}>
                {tx.type === 'income' ? '+' : '-'}Rp {formatMoney(total)}
              </Text>
            </TouchableOpacity>
          );
        })}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AchieveGoalScreen;