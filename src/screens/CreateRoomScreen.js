import React, { useContext, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
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
      <View style={styles.header}>
        {!generatedCode && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={20} color={theme.onSurface} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{generatedCode ? 'Ruang Dibuat!' : 'Buat Ruang Baru'}</Text>
      </View>

      <View style={styles.content}>
        {!generatedCode ? (
          <>
            <Text style={styles.label}>Nama Panggilan Anda</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Masukkan nama Anda" 
              placeholderTextColor={theme.onSurfaceVariant + '80'}
              value={name}
              onChangeText={setName}
            />

            <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8} onPress={handleCreate} disabled={loading}>
              <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.gradientPrimary} start={{x:0, y:0}} end={{x:1, y:1}}>
                {loading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.btnPrimaryText}>Buat & Dapatkan Kode</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>KODE PASANGAN ANDA</Text>
            <Text style={styles.codeValue}>{generatedCode}</Text>
            <Text style={styles.codeDesc}>Berikan kode ini kepada pasangan Anda agar mereka bisa bergabung ke dalam ruang finansial ini.</Text>
            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 32 }]} onPress={handleLogin}>
              <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.gradientPrimary} start={{x:0, y:0}} end={{x:1, y:1}}>
                <Text style={styles.btnPrimaryText}>Masuk ke Dashboard</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CreateRoomScreen;
