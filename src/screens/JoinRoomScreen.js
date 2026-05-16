import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, Platform } from 'react-native';
import Text from '../components/ThemeText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const JoinRoomScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { joinHousehold } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleJoin = async () => {
    if (!name.trim() || !code.trim()) return Alert.alert('Error', 'Nama dan Kode harus diisi');
    setLoading(true);
    const result = await joinHousehold(name, code);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Gagal', result.message);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceContainer, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.onSurface },
    content: { padding: 24 },
    label: { fontSize: 14, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 8 },
    input: { backgroundColor: theme.surfaceContainerLow, borderRadius: 16, padding: 16, fontSize: 16, color: theme.onSurface, borderWidth: 1, borderColor: theme.outlineVariant + '33', marginBottom: 24 },
    codeInput: { fontSize: 24, fontWeight: 'bold', letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase' },
    
    btnPrimary: { width: '100%', borderRadius: 24, overflow: 'hidden', marginTop: 16 },
    gradientPrimary: { paddingVertical: 20, alignItems: 'center' },
    btnPrimaryText: { color: theme.onPrimary, fontSize: 16, fontWeight: 'bold' }
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={20} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gabung / Masuk Ruang</Text>
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <Text style={styles.label}>Panggilan Kamu (Sama jika masuk kembali)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Masukkan nama kamu" 
            placeholderTextColor={theme.onSurfaceVariant}
            value={name}
            onChangeText={setName}
          />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
          <Text style={styles.label}>Kode Pasangan</Text>
          <TextInput 
            style={[styles.input, styles.codeInput]} 
            placeholder="X8P2K9" 
            placeholderTextColor={theme.onSurfaceVariant}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            maxLength={6}
          />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8} onPress={handleJoin} disabled={loading}>
            <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.gradientPrimary} start={{x:0, y:0}} end={{x:1, y:1}}>
              {loading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.btnPrimaryText}>Gabung Sekarang</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default JoinRoomScreen;
