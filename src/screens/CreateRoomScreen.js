import React, { useContext, useState, useRef, useEffect } from 'react';
import TextInput from '../components/ThemeTextInput';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, Platform } from 'react-native';
import Text from '../components/ThemeText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const CreateRoomScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { createHousehold, loginWithData } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [userData, setUserData] = useState(null);

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

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Nama harus diisi');
    setLoading(true);
    const result = await createHousehold(name);
    setLoading(false);
    if (result.success) {
      setGeneratedCode(result.code);
      setUserData(result.userData);
    } else {
      Alert.alert('Gagal', result.message);
    }
  };

  const handleLogin = () => {
    if (userData) {
      loginWithData(userData);
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
    
    btnPrimary: { width: '100%', borderRadius: 24, overflow: 'hidden', marginTop: 16 },
    gradientPrimary: { paddingVertical: 20, alignItems: 'center' },
    btnPrimaryText: { color: theme.onPrimary, fontSize: 16, fontWeight: 'bold' },

    codeContainer: { alignItems: 'center', marginTop: 40, padding: 32, backgroundColor: theme.surfaceContainer, borderRadius: 32, borderWidth: 1, borderColor: theme.primary + '33' },
    codeLabel: { fontSize: 14, color: theme.onSurfaceVariant, marginBottom: 16, textAlign: 'center' },
    codeValue: { fontSize: 48, fontWeight: '900', color: theme.primary, letterSpacing: 4, marginBottom: 24 },
    codeDesc: { fontSize: 14, color: theme.onSurface, textAlign: 'center', lineHeight: 22 }
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
        {!generatedCode && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={20} color={theme.onSurface} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{generatedCode ? 'Ruang Dibuat!' : 'Buat Ruang Baru'}</Text>
      </Animated.View>

      <View style={styles.content}>
        {!generatedCode ? (
          <>
            <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
              <Text style={styles.label}>Nama Panggilan Kamu</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Masukkan nama kamu" 
                placeholderTextColor={theme.onSurfaceVariant}
                value={name}
                onChangeText={setName}
              />
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
              <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8} onPress={handleCreate} disabled={loading}>
                <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.gradientPrimary} start={{x:0, y:0}} end={{x:1, y:1}}>
                  {loading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.btnPrimaryText}>Buat & Dapatkan Kode</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <Animated.View style={[styles.codeContainer, { opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }]}>
            <Text style={styles.codeLabel}>KODE BUAT RIKA</Text>
            <Text style={styles.codeValue}>{generatedCode}</Text>
            <Text style={styles.codeDesc}>Berikan kode ini kepada Rika agar dia bisa bergabung ke dalam ruang finansial ini.</Text>
            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 32 }]} onPress={handleLogin}>
              <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.gradientPrimary} start={{x:0, y:0}} end={{x:1, y:1}}>
                <Text style={styles.btnPrimaryText}>Masuk ke Dashboard</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CreateRoomScreen;
