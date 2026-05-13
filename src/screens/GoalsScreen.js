import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, TextInput, Alert, Modal, Animated, Platform } from 'react-native';
import { ScrollView, FlatList } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const VideoPreview = ({ uri, theme }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
    p.muted = true;
  });

  return (
    <View style={{ width: '100%', height: 120, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
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

const ActiveGoalItem = React.memo(({ item, index, navigation, safeTheme, formatMoney }) => {
  const itemAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 350,
      delay: index * 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  const progress = item.targetAmount > 0 ? Math.min((item.currentAmount / item.targetAmount) * 100, 100) : 0;

  return (
    <Animated.View style={{ 
      opacity: itemAnim, 
      transform: [{ scale: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
      marginBottom: 20, 
      backgroundColor: safeTheme.surface, 
      borderRadius: 32, 
      overflow: 'hidden', 
      borderWidth: 1, 
      borderColor: safeTheme.outlineVariant + '15',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 5
    }}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })}
        activeOpacity={0.9}
      >
        <View style={{ height: 260, backgroundColor: safeTheme.surfaceContainerLow }}>
          {item.previewImage ? (
            <Image source={{ uri: item.previewImage }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialIcons name="auto-awesome" size={50} color={safeTheme.primary + '22'} />
            </View>
          )}
          
          {/* Cinematic Overlays */}
          <LinearGradient 
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.85)']} 
            style={StyleSheet.absoluteFill} 
          />
          
          {/* Top Info Badges */}
          <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
             <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>{Math.round(progress)}%</Text>
             </View>
             {item.targetDate && (
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="calendar-today" size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{dayjs(item.targetDate).format('MMM YYYY')}</Text>
               </View>
             )}
          </View>

          {/* Bottom Info Floating Section */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
            <Text style={{ 
              color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 12,
              ...Platform.select({
                ios: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width:0, height:2}, textShadowRadius: 4 },
                android: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width:0, height:2}, textShadowRadius: 4 },
                web: { textShadow: '0 2px 4px rgba(0,0,0,0.3)' }
              })
            }}>{item.name}</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
               <View>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>TERKUMPUL</Text>
                  <Text style={{ color: safeTheme.primary, fontSize: 18, fontWeight: '900' }}>Rp {formatMoney(item.currentAmount)}</Text>
               </View>
               <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>TARGET</Text>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Rp {formatMoney(item.targetAmount)}</Text>
               </View>
            </View>

            {/* Minimalist Slim Progress Bar */}
            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
              <LinearGradient 
                colors={[safeTheme.primary, safeTheme.primary + '88']} 
                start={{x:0, y:0}} end={{x:1, y:0}}
                style={{ height: '100%', width: `${progress}%` }} 
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const AchievedGoalItem = React.memo(({ item, index, navigation, safeTheme, formatMoney }) => {
  const itemAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 350,
      delay: index * 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  return (
    <Animated.View style={{ 
      flex: 1, 
      opacity: itemAnim,
      transform: [{ scale: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
      margin: 8, 
      height: 240, 
      borderRadius: 28, 
      overflow: 'hidden',
      backgroundColor: safeTheme.surface,
    }}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('MemoryDetail', { goalId: item.id })}
        style={{ flex: 1 }}
        activeOpacity={0.9}
      >
        <View style={{ flex: 1 }}>
          {item.previewImage ? (
            <Image source={{ uri: item.previewImage }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: safeTheme.surfaceContainerLow }}>
              <MaterialIcons name="auto-awesome" size={40} color={safeTheme.primary + '33'} />
            </View>
          )}
          
          <LinearGradient 
            colors={['rgba(0,0,0,0.1)', 'transparent', 'rgba(0,0,0,0.9)']} 
            style={StyleSheet.absoluteFill} 
          />

          <View style={{ position: 'absolute', top: 12, right: 12 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 12 }}>
               <MaterialIcons name="emoji-events" size={16} color="#fff" />
            </View>
          </View>

          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.3, marginBottom: 2 }} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
               <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: safeTheme.primary }} />
               <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }}>Rp {formatMoney(item.targetAmount)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// --- Add Goal Screen (Modal Style) ---
export const AddGoalScreen = () => {
  const { user, householdUsers } = useContext(AuthContext);
  const partnerName = householdUsers?.find(u => u !== (user?.name || ''));
  const hasPartner = !!partnerName;
  const sendGoalNotification = async ({ title, body, goalId }) => {
    if (!hasPartner) return;
    await addNotification({
      title,
      body,
      icon: 'stars',
      targetType: 'goal',
      targetId: goalId,
      sender: user?.name || 'Saya',
      createdAt: new Date().toISOString(),
    });
  };

  const navigation = useNavigation();
  const { theme } = useContext(ThemeContext);
  const { addGoal, addNotification, updateGoal } = useContext(DataContext);
  
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

  // Fallback theme if not loaded yet
  const safeTheme = theme || {
    background: '#0b0f10',
    surface: '#0b0f10',
    surfaceContainerLow: '#141b1d',
    surfaceContainer: '#141b1d',
    onSurface: '#dde7eb',
    onSurfaceVariant: '#a3adb1',
    primary: '#b2cad3',
    onPrimary: '#1a1a1a',
    outlineVariant: '#40494d'
  };
  
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const selectionTargetRef = useRef({ start: 0, end: 0 });
  const [selectionTarget, setSelectionTarget] = useState({ start: 0, end: 0 });
  const targetRef = useRef('');
  const [customIcon, setCustomIcon] = useState('favorite');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState(''); // YYYY-MM-DD

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleTargetChange = (val) => {
    const oldText = targetRef.current || '';
    const oldSel = selectionTargetRef.current.start;
    
    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');

    // Jika panjang berkurang tapi digit sama, berarti user hapus titik.
    // Kita paksa hapus 1 digit di depan posisi titik tadi.
    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = oldText.slice(0, oldSel - 2) + oldText.slice(oldSel);
    }

    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setTarget(formatted);
    targetRef.current = formatted;

    let newPos = formatted.length;
    let count = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (count >= digitsAfter) break;
      if (formatted[i] !== '.') {
        count++;
      }
      newPos = i;
    }

    setSelectionTarget({ start: newPos, end: newPos }); 
    selectionTargetRef.current = { start: newPos, end: newPos };
  };
  const [mediaList, setMediaList] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

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
      // When user inputs a direct image URL, we must mark it as an image type
      // so that downstream upload logic and Firestore storage have a defined `type`.
      setMediaList(prev => [...prev, { uri: imageUrl.trim(), caption: '', type: 'image' }]);
      setImageUrl('');
    }
  };

  const handleSave = async () => {
    if (!name.trim() || uploading) return;
    
    console.log('--- HandleSave Start ---');
    setUploading(true);
    setLoadingMsg(mediaList.length > 0 ? 'Mengupload media...' : 'Menyimpan goal...');
    
    try {
      let finalMediaList = mediaList;
      
      // Upload media to Cloudinary if any
      if (mediaList.length > 0) {
        console.log('Mulai upload', mediaList.length, 'media');
        const uploaded = await uploadMultipleToCloudinary(mediaList);
        console.log('Upload selesai, berhasil', uploaded.length, 'item');
        if (uploaded.length === 0 && mediaList.length > 0) {
          setUploading(false);
          Alert.alert('Upload gagal', 'Tidak ada media yang berhasil diupload. Cek koneksi internet Anda.');
          return;
        }
        finalMediaList = uploaded;
      }
      
      setLoadingMsg('Menyimpan goal...');
      console.log('Menyimpan ke Firestore...');
      
      const firstMedia = finalMediaList.length > 0 ? finalMediaList[0] : null;
      const previewImage = firstMedia?.type === 'image' ? (firstMedia.url || firstMedia.uri) : null;
      
      const newGoalId = await addGoal({
        name: name.trim(),
        description: description.trim(),
        targetAmount: Number(target.replace(/\./g, '')) || 0,
        targetDate: targetDate || null,
        previewImage,
        media: finalMediaList,
        icon: customIcon || 'favorite',
        status: 'active',
        currentAmount: 0,
        achieved: false
      });
      
      console.log('Goal tersimpan, ID:', newGoalId);
      
      if (newGoalId) {
        setLoadingMsg('Mengirim notifikasi...');
        await sendGoalNotification({
          title: 'Goal baru',
          body: `${user?.name || 'Saya'} menambahkan goal “${name.trim()}”.`,
          goalId: newGoalId,
        });
      }
      
      console.log('Selesai, menutup layar');
      setUploading(false);
      handleBack();
    } catch (e) {
      setUploading(false);
      console.error('Save goal error:', e);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan goal: ' + e.message);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: safeTheme.background }} edges={['top']}>
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: safeTheme.outlineVariant + '22', opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
        <TouchableOpacity onPress={handleBack}>
          <MaterialIcons name="close" size={24} color={safeTheme.onSurface} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: safeTheme.onSurface }}>Goal Baru</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={uploading} 
          style={{ backgroundColor: uploading ? safeTheme.outlineVariant : safeTheme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, minWidth: 80, alignItems: 'center' }}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={safeTheme.onPrimary} />
          ) : (
            <Text style={{ color: safeTheme.onPrimary, fontWeight: 'bold' }}>Simpan</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {uploading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 12, fontSize: 14 }}>{loadingMsg}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Media Section */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          {mediaList.map((m, i) => (
            <View key={i} style={{ marginBottom: 12, backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 16, overflow: 'hidden' }}>
              {m.type === 'video' ? (
                <VideoPreview uri={m.uri} theme={safeTheme} />
              ) : (
                <Image source={{ uri: m.uri }} style={{ width: '100%', height: 120 }} />
              )}
              <TouchableOpacity onPress={() => removeMedia(i)} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 4 }}>
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={{ padding: 10, color: safeTheme.onSurface, fontSize: 13 }}
                placeholder={m.type === 'video' ? "Keterangan video ini... (opsional)" : "Keterangan gambar ini... (opsional)"}
                placeholderTextColor={safeTheme.onSurfaceVariant + '80'}
                value={m.caption}
                onChangeText={(t) => updateCaption(i, t)}
              />
            </View>
          ))}

          <TouchableOpacity onPress={pickMedia} style={{ height: 56, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: safeTheme.primary + '66', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <MaterialIcons name="add-photo-alternate" size={20} color={safeTheme.primary} />
            <Text style={{ color: safeTheme.primary, fontWeight: '700', fontSize: 13 }}>+ Tambah Foto/Video ({mediaList.length})</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>LINK GAMBAR (PASTI BERFUNGSI)</Text>
          <Text style={{ fontSize: 10, color: safeTheme.onSurfaceVariant, marginBottom: 12 }}>Copy link gambar dari Google Images, Unsplash, dll.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, padding: 12, marginRight: 8 }}>
              <TextInput 
                placeholder="https://contoh.com/gambar.jpg"
                placeholderTextColor={safeTheme.onSurfaceVariant}
                value={imageUrl}
                onChangeText={setImageUrl}
                style={{ color: safeTheme.onSurface, fontSize: 14 }}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            <TouchableOpacity onPress={handleUrlSubmit} style={{ backgroundColor: safeTheme.primaryContainer, padding: 12, borderRadius: 12 }}>
              <MaterialIcons name="check" size={20} color={safeTheme.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Nama & Deskripsi */}
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>NAMA GOAL</Text>
          <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <TextInput 
              placeholder="Contoh: Liburan ke Jepang" 
              placeholderTextColor={safeTheme.onSurfaceVariant}
              value={name}
              onChangeText={setName}
              style={{ color: safeTheme.onSurface, fontSize: 16 }}
            />
          </View>

          <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>DESKRIPSI (OPSIONAL)</Text>
          <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16, height: 80 }}>
            <TextInput 
              placeholder="Ceritakan tentang goal ini..." 
              placeholderTextColor={safeTheme.onSurfaceVariant}
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ color: safeTheme.onSurface, fontSize: 14 }}
            />
          </View>
        </Animated.View>

        {/* Target & Roadmap */}
        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>TARGET NOMINAL (RP)</Text>
          <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, padding: 16 }}>
            <TextInput 
              placeholder="0" 
              placeholderTextColor={safeTheme.onSurfaceVariant}
              value={target}
              onChangeText={handleTargetChange}
              selection={selectionTarget}
              onSelectionChange={(e) => {
                const sel = e.nativeEvent.selection;
                setSelectionTarget(sel);
                selectionTargetRef.current = sel;
              }}
              keyboardType="numeric"
              style={{ color: safeTheme.onSurface, fontSize: 16, fontWeight: 'bold' }}
            />
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>TARGET TANGGAL DICAPAI (ROADMAP)</Text>
            <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="explore" size={20} color={safeTheme.primary} />
              <TextInput 
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={safeTheme.onSurfaceVariant}
                style={{ 
                  color: safeTheme.onSurface, 
                  fontSize: 16, 
                  flex: 1
                }}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>

  );
};

// --- Main Goals Screen ---
const GoalsScreen = ({ navigation, route }) => {
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
  const { goals, addGoal, updateGoal, deleteGoal, addNotification, transactions } = useContext(DataContext);
  const { user } = useContext(AuthContext);

  const initialTab = route.params?.initialTab || 'active';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);
  
  // Animations
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

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
      ])
    ]).start();
  }, []);

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(fadeAnims[0], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[1], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[2], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[0], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[1], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[2], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' })
    ]).start(() => navigation.goBack());
  };

  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveTab(route.params.activeTab);
      // Reset params so it doesn't trigger again on subsequent focuses
      navigation.setParams({ activeTab: undefined });
    }
  }, [route.params?.activeTab]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editMediaList, setEditMediaList] = useState([]);
  const [editMemoryCaption, setEditMemoryCaption] = useState('');
  const [editRelatedTxIds, setEditRelatedTxIds] = useState([]);
  const [editUploading, setEditUploading] = useState(false);
  const [selectionEditTarget, setSelectionEditTarget] = useState({ start: 0, end: 0 });
  const selectionEditTargetRef = useRef({ start: 0, end: 0 });
  const editTargetRef = useRef('');

  const formatInput = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleEditTargetChange = (val) => {
    const oldText = editTargetRef.current || '';
    const oldSel = selectionEditTargetRef.current.start;
    
    let processedVal = val;
    const oldDigits = oldText.replace(/\D/g, '');
    const newDigits = val.replace(/\D/g, '');

    if (val.length < oldText.length && oldDigits === newDigits && oldSel > 0) {
      processedVal = oldText.slice(0, oldSel - 2) + oldText.slice(oldSel);
    }

    const digitsAfter = oldText.slice(oldSel).replace(/\D/g, '').length;
    const formatted = formatInput(processedVal);
    setEditTarget(formatted);
    editTargetRef.current = formatted;

    let newPos = formatted.length;
    let count = 0;
    for (let i = formatted.length - 1; i >= 0; i--) {
      if (count >= digitsAfter) break;
      if (formatted[i] !== '.') {
        count++;
      }
      newPos = i;
    }

    setSelectionEditTarget({ start: newPos, end: newPos }); 
    selectionEditTargetRef.current = { start: newPos, end: newPos };
  };

  const formatMoney = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v || 0);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' })
    ]).start(() => setToastVisible(false));
  };

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal);
    setEditName(goal.name || '');
    setEditDescription(goal.description || '');
    const formatted = formatInput(String(goal.targetAmount || 0));
    setEditTarget(formatted);
    editTargetRef.current = formatted;
    setEditMediaList(goal.media ? [...goal.media] : []);
    setEditMemoryCaption(goal.memoryCaption || '');
    setEditRelatedTxIds(goal.relatedTransactionIds || []);
    setEditModalVisible(true);
  };

  const handlePickEditMedia = async () => {
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
        setEditMediaList(prev => [...prev, ...newMedia]);
      }
    } catch (e) {
      console.log('Image picker error:', e);
    }
  };

  const handleUpdateEditMediaCaption = (index, text) => {
    setEditMediaList(prev => prev.map((m, i) => i === index ? { ...m, caption: text } : m));
  };

  const handleRemoveEditMedia = (index) => {
    setEditMediaList(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleEditTx = (txId) => {
    setEditRelatedTxIds(prev => 
      prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]
    );
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal || !editName.trim()) return;
    
    let finalMediaList = editMediaList;
    
    // Upload media lokal ke Cloudinary
    const hasLocalMedia = editMediaList.some(m => !m.url || m.uri?.startsWith('file://') || m.uri?.startsWith('content://'));
    if (hasLocalMedia) {
      setEditUploading(true);
      try {
        const localMedia = editMediaList.filter(m => !m.url || m.uri?.startsWith('file://') || m.uri?.startsWith('content://'));
        const uploaded = await uploadMultipleToCloudinary(localMedia);
        let uploadedIdx = 0;
        finalMediaList = editMediaList.map(m => {
          if (!m.url || m.uri?.startsWith('file://') || m.uri?.startsWith('content://')) {
            return uploaded[uploadedIdx++] || m;
          }
          return m;
        });
      } catch (e) {
        setEditUploading(false);
        console.error('Upload error:', e);
        Alert.alert('Upload gagal', 'Gagal mengupload media: ' + e.message);
        return;
      }
      setEditUploading(false);
    }
    
    try {
      const isAchieved = selectedGoal.achieved;
      
      const updateData = {
        name: editName.trim(),
        description: isAchieved ? editMemoryCaption : editDescription.trim(),
        targetAmount: Number(editTarget.replace(/\./g, '')) || 0,
      };

      if (isAchieved) {
        updateData.memoryCaption = editMemoryCaption;
        updateData.relatedTransactionIds = editRelatedTxIds;
        updateData.media = finalMediaList;
        if (finalMediaList.length > 0) {
          updateData.previewImage = finalMediaList[0].type === 'image' ? (finalMediaList[0].url || finalMediaList[0].uri) : selectedGoal.previewImage;
          updateData.mediaCount = finalMediaList.length;
        } else {
          updateData.previewImage = null;
          updateData.mediaCount = 0;
        }
      } else {
        updateData.media = finalMediaList;
        if (finalMediaList.length > 0) {
          updateData.previewImage = finalMediaList[0].type === 'image' ? (finalMediaList[0].url || finalMediaList[0].uri) : null;
        } else {
          updateData.previewImage = null;
        }
      }

      await updateGoal(selectedGoal.id, updateData);
      setEditModalVisible(false);
      setSelectedGoal(null);
      Alert.alert('Berhasil', 'Goal diperbarui');
    } catch (e) {
      console.error('Save edit error:', e);
      Alert.alert('Gagal', 'Tidak dapat memperbarui goal');
    }
  };

  const handleDeleteGoal = (goal) => {
    setGoalToDelete(goal);
    setDeleteModalVisible(true);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      await deleteGoal(goalToDelete.id);
      setDeleteModalVisible(false);
      setGoalToDelete(null);
      showToast('Goal berhasil dihapus');
    } catch (e) {
      Alert.alert('Gagal', 'Tidak dapat menghapus goal');
    }
  };

  // Safe goals array
  const safeGoals = Array.isArray(goals) ? goals : [];
  
  // Filter goals based on status
  const activeGoals = useMemo(() => {
    return safeGoals.filter(g => g && g.achieved !== true).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [safeGoals]);
  
  const achievedGoals = useMemo(() => {
    return safeGoals.filter(g => g && g.achieved === true).sort((a, b) => new Date(b.achievedAt || 0) - new Date(a.achievedAt || 0));
  }, [safeGoals]);

  const handleAddGoal = () => {
    navigation.navigate('AddGoal');
  };

  const renderActiveGoalCard = ({ item, index }) => (
    <ActiveGoalItem item={item} index={index} navigation={navigation} safeTheme={safeTheme} formatMoney={formatMoney} />
  );

  const renderAchievedGoalItem = ({ item, index }) => (
    <AchievedGoalItem item={item} index={index} navigation={navigation} safeTheme={safeTheme} formatMoney={formatMoney} />
  );




  // Edit Goal Modal
  const isEditAchieved = selectedGoal?.achieved;
  const recentTxs = Array.isArray(transactions) ? transactions.slice(0, 30) : [];

  const EditModal = () => (
    <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>

          {editUploading && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={{ color: "#fff", marginTop: 12, fontSize: 14 }}>Mengupload media...</Text>
            </View>
          )}

        <ScrollView style={{ flex: 1, marginTop: 100 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ backgroundColor: safeTheme.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, marginHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: safeTheme.onSurface }}>
                {isEditAchieved ? 'Edit Kenangan' : 'Edit Goal'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={safeTheme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Nama Goal */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>NAMA GOAL</Text>
            <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <TextInput 
                value={editName}
                onChangeText={setEditName}
                style={{ color: safeTheme.onSurface, fontSize: 16 }}
              />
            </View>

            {/* Deskripsi / Keterangan */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>
              {isEditAchieved ? 'KETERANGAN' : 'DESKRIPSI'}
            </Text>
            <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16, height: 80 }}>
              <TextInput 
                value={isEditAchieved ? editMemoryCaption : editDescription}
                onChangeText={isEditAchieved ? setEditMemoryCaption : setEditDescription}
                multiline
                placeholder={isEditAchieved ? "Ceritakan momen ini..." : "Ceritakan tentang goal ini..."}
                placeholderTextColor={safeTheme.onSurfaceVariant}
                style={{ color: safeTheme.onSurface, fontSize: 14 }}
              />
            </View>

            {/* Target Nominal (h untuk aktif) */}
            {!isEditAchieved && (
              <>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>TARGET NOMINAL (RP)</Text>
                <View style={{ backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <TextInput 
                    value={editTarget}
                    onChangeText={handleEditTargetChange}
                    selection={selectionEditTarget}
                    onSelectionChange={(e) => {
                      const sel = e.nativeEvent.selection;
                      setSelectionEditTarget(sel);
                      selectionEditTargetRef.current = sel;
                    }}
                    keyboardType="numeric"
                    style={{ color: safeTheme.onSurface, fontSize: 16, fontWeight: 'bold' }}
                  />
                </View>
              </>
            )}

            {/* Media List - Both active and achieved can edit */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 12 }}>FOTO / VIDEO</Text>
            {editMediaList.map((m, i) => (
              <View key={i} style={{ marginBottom: 10, backgroundColor: safeTheme.surfaceContainerLow, borderRadius: 12, overflow: 'hidden' }}>
                {m.type === 'video' ? (
                  <View style={{ width: '100%', height: 100, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialIcons name="play-circle-filled" size={40} color="rgba(255,255,255,0.8)" />
                  </View>
                ) : (
                  <Image source={{ uri: m.url || m.uri }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
                )}
                <TouchableOpacity onPress={() => handleRemoveEditMedia(i)} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 }}>
                  <MaterialIcons name="close" size={14} color="#fff" />
                </TouchableOpacity>
                <TextInput
                  style={{ padding: 8, color: safeTheme.onSurface, fontSize: 12 }}
                  placeholder="Keterangan..."
                  placeholderTextColor={safeTheme.onSurfaceVariant}
                  value={m.caption}
                  onChangeText={(t) => handleUpdateEditMediaCaption(i, t)}
                />
              </View>
            ))}
            <TouchableOpacity onPress={handlePickEditMedia} style={{ height: 40, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: safeTheme.primary + '66', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: safeTheme.primary, fontSize: 12, fontWeight: '600' }}>+ Tambah Media</Text>
            </TouchableOpacity>

            {/* Related Transactions - Only for achieved */}
            {isEditAchieved && (
              <>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurfaceVariant, marginBottom: 8 }}>TRANSAKSI TERKAIT</Text>
                <Text style={{ fontSize: 10, color: safeTheme.onSurfaceVariant, marginBottom: 12 }}>Pilih transaksi yang relevan</Text>
                {recentTxs.map(tx => {
                  const isSelected = editRelatedTxIds.includes(tx.id);
                  const total = (tx.myContrib || 0) + (tx.partnerContrib || 0);
                  return (
                    <TouchableOpacity key={tx.id} onPress={() => handleToggleEditTx(tx.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 6, borderRadius: 10,
                        backgroundColor: isSelected ? safeTheme.primary + '1A' : safeTheme.surfaceContainerLow,
                        borderWidth: 1.5, borderColor: isSelected ? safeTheme.primary : safeTheme.outlineVariant + '22' }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: tx.type === 'income' ? safeTheme.primary + '1A' : safeTheme.error + '1A', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                        <MaterialIcons name={tx.icon || 'receipt'} size={14} color={tx.type === 'income' ? safeTheme.primary : safeTheme.error} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: safeTheme.onSurface }} numberOfLines={1}>{tx.name}</Text>
                        <Text style={{ fontSize: 9, color: safeTheme.onSurfaceVariant }}>{new Date(tx.date).toString() !== 'Invalid Date' ? new Date(tx.date).toLocaleDateString('id-ID') : '-'}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: tx.type === 'income' ? safeTheme.primary : safeTheme.error }}>
                        {tx.type === 'income' ? '+' : '-'}Rp {formatMoney(total)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <TouchableOpacity onPress={handleSaveEdit} style={{ backgroundColor: safeTheme.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: safeTheme.onPrimary, fontWeight: 'bold' }}>Simpan Perubahan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: safeTheme.background }} edges={['top']}>
      {/* Header */}
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: safeTheme.surface, opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: safeTheme.primary }}>Goals</Text>
        <TouchableOpacity onPress={handleAddGoal} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: safeTheme.primary, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialIcons name="add" size={24} color={safeTheme.onPrimary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Tabs */}
      <Animated.View style={{ flexDirection: 'row', backgroundColor: safeTheme.surface, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: safeTheme.outlineVariant + '22', opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
        <TouchableOpacity 
          onPress={() => setActiveTab('active')}
          style={{ paddingVertical: 12, marginRight: 24, borderBottomWidth: activeTab === 'active' ? 2 : 0, borderBottomColor: safeTheme.primary }}
        >
          <Text style={{ fontSize: 14, fontWeight: activeTab === 'active' ? 'bold' : '500', color: activeTab === 'active' ? safeTheme.primary : safeTheme.onSurfaceVariant }}>Ingin dicapai</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('achieved')}
          style={{ paddingVertical: 12, borderBottomWidth: activeTab === 'achieved' ? 2 : 0, borderBottomColor: safeTheme.primary }}
        >
          <Text style={{ fontSize: 14, fontWeight: activeTab === 'achieved' ? 'bold' : '500', color: activeTab === 'achieved' ? safeTheme.primary : safeTheme.onSurfaceVariant }}>Telah tercapai</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Content Section */}
      <Animated.View style={{ flex: 1, opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
        {/* Content - Active Tab */}
        {activeTab === 'active' && (
          <FlatList
            data={activeGoals || []}
            renderItem={renderActiveGoalCard}
            keyExtractor={(item, index) => item?.id || `active-${index}`}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <MaterialIcons name="flag" size={60} color={safeTheme.onSurfaceVariant + '44'} />
                <Text style={{ color: safeTheme.onSurfaceVariant, marginTop: 16, fontSize: 16 }}>Belum ada goal aktif</Text>
                <Text style={{ color: safeTheme.onSurfaceVariant + '88', marginTop: 4, fontSize: 12 }}>Tekan + untuk membuat goal baru</Text>
              </View>
            }
          />
        )}

        {/* Content - Achieved Tab */}
        {activeTab === 'achieved' && (
          <FlatList
            data={achievedGoals || []}
            renderItem={renderAchievedGoalItem}
            keyExtractor={(item, index) => item?.id || `achieved-${index}`}
            numColumns={2}
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <MaterialIcons name="emoji-events" size={60} color={safeTheme.onSurfaceVariant + '44'} />
                <Text style={{ color: safeTheme.onSurfaceVariant, marginTop: 16, fontSize: 16 }}>Belum ada goal tercapai</Text>
              </View>
            }
          />
        )}
      </Animated.View>
      <EditModal />

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: safeTheme.surface, borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: safeTheme.error + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <MaterialIcons name="delete-outline" size={40} color={safeTheme.error} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: safeTheme.onSurface, marginBottom: 8, textAlign: 'center' }}>Hapus Goal?</Text>
            <Text style={{ fontSize: 14, color: safeTheme.onSurfaceVariant, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
              Mimpi "{goalToDelete?.name}" akan dihapus. Tindakan ini tidak bisa dibatalkan.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={{ flex: 1, height: 56, borderRadius: 20, backgroundColor: safeTheme.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: safeTheme.onSurface, fontWeight: 'bold' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteGoal} style={{ flex: 1, height: 56, borderRadius: 20, backgroundColor: safeTheme.error, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View style={{ position: 'absolute', bottom: 100, left: 24, right: 24, opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], zIndex: 1000 }}>
          <View style={{ backgroundColor: '#1E293B', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 }}>
            <MaterialIcons name="check-circle" size={20} color={safeTheme.primary} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{toastMsg}</Text>
          </View>
        </Animated.View>
      )}

    </SafeAreaView>
  );
};

export default GoalsScreen;