import React, { useContext, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={20} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gabung / Masuk Ruang</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Panggilan Anda (Sama jika masuk kembali)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Masukkan nama Anda" 
          placeholderTextColor={theme.onSurfaceVariant + '80'}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Kode Pasangan</Text>
        <TextInput 
          style={[styles.input, styles.codeInput]} 
          placeholder="X8P2K9" 
          placeholderTextColor={theme.onSurfaceVariant + '40'}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          maxLength={6}
        />

        <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8} onPress={handleJoin} disabled={loading}>
          <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.gradientPrimary} start={{x:0, y:0}} end={{x:1, y:1}}>
            {loading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.btnPrimaryText}>Gabung Sekarang</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default JoinRoomScreen;
