import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import Text from '../components/ThemeText';

const iconOptions = [
  // General & Misc
  'star', 'pets', 'child-friendly', 'cake', 'favorite', 'emoji-events',
  // Income / Finance
  'payments', 'account-balance-wallet', 'favorite', 'paid', 'monetization-on', 'trending-up', 'work', 'volunteer-activism', 'card-giftcard',
  // Food & Groceries
  'restaurant', 'local-cafe', 'fastfood', 'local-grocery-store', 'local-pizza',
  // Transport & Utilities
  'commute', 'directions-car', 'local-gas-station', 'flight', 'water-drop', 'bolt', 'wifi', 'phone-iphone',
  // Lifestyle & Entertainment
  'shopping-cart', 'checkroom', 'movie', 'sports-esports', 'fitness-center', 'spa', 'palette',
  // Health & Education
  'medical-services', 'healing', 'school', 'menu-book',
  // Home & Repair
  'home', 'home-repair-service', 'build', 'laptop-mac', 'chair'
];

const CategoriesScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { categories, addCategory, updateCategory, deleteCategory } = useContext(DataContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOldName, setEditingOldName] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [catToDelete, setCatToDelete] = useState('');
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState('expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('shopping-bag');

  // Animations
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnims[0], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[0], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[1], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[1], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[2], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[2], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(fadeAnims[0], { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnims[1], { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnims[2], { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnims[0], { toValue: -20, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnims[1], { toValue: -20, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnims[2], { toValue: -20, duration: 300, useNativeDriver: true })
    ]).start(() => navigation.goBack());
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Oops', 'Nama kategori nggak boleh kosong bro.');
      return;
    }
    
    setLoading(true);
    try {
      if (isEditing) {
        await updateCategory(type, editingOldName, { name: name.trim(), icon });
        setIsEditing(false);
        setEditingOldName('');
        Alert.alert('Selesai', `Kategori diperbarui!`);
      } else {
        await addCategory(type, { name: name.trim(), icon });
        Alert.alert('Mantap!', `Kategori "${name}" udah ditambah.`);
      }
      setName('');
      setIcon('shopping-bag');
    } catch (e) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat memproses kategori.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat) => {
    setName(cat.name);
    setIcon(cat.icon);
    setEditingOldName(cat.name);
    setIsEditing(true);
  };

  const handleDelete = (catName) => {
    setCatToDelete(catName);
    setDeleteModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.catItem, { backgroundColor: theme.surfaceContainerLow }]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primaryContainer + '33' }]}>
          <MaterialIcons name={item.icon} size={20} color={theme.primary} />
        </View>
        <Text style={[styles.catName, { color: theme.onSurface }]}>{item.name}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity 
          style={{ padding: 10, backgroundColor: theme.surfaceContainerHighest, borderRadius: 12, opacity: loading ? 0.5 : 1 }}
          onPress={() => handleEdit(item)}
          disabled={loading}
        >
          <MaterialIcons name="edit" size={18} color={theme.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ padding: 10, backgroundColor: theme.error + '1A', borderRadius: 12, opacity: loading ? 0.5 : 1 }}
          onPress={() => handleDelete(item.name)}
          disabled={loading}
        >
          <MaterialIcons name="delete" size={18} color={theme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: theme.surface },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.onSurface },
    form: { padding: 16, gap: 12 },
    label: { fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginBottom: 4 },
    input: { backgroundColor: theme.surfaceContainer, borderRadius: 12, padding: 12, color: theme.onSurface },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
    toggleActive: { backgroundColor: theme.primaryContainer },
    toggleText: { fontWeight: 'bold', fontSize: 13 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    iconOpt: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    iconSelected: { borderWidth: 2, borderColor: theme.primary },
    btnAdd: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
    btnGradient: { padding: 16, alignItems: 'center' },
    btnText: { color: theme.onPrimary, fontWeight: 'bold', fontSize: 16 },
    list: { padding: 16 },
    catItem: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: 14, 
      borderRadius: 20, 
      marginBottom: 10, 
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.outlineVariant + '10'
    },
    iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    catName: { fontSize: 14, fontWeight: '600' },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
          <TouchableOpacity onPress={handleBack}>
            <MaterialIcons name="close" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kategori Transaksi</Text>
        </Animated.View>

        {/* Form Tambah */}
        <Animated.View style={[styles.form, { opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
          <Text style={styles.label}>Tipe</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && styles.toggleActive]}
              onPress={() => setType('expense')}
            >
              <Text style={[styles.toggleText, { color: type === 'expense' ? theme.onPrimaryContainer : theme.onSurfaceVariant }]}>Pengeluaran</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && styles.toggleActive]}
              onPress={() => setType('income')}
            >
              <Text style={[styles.toggleText, { color: type === 'income' ? theme.onPrimaryContainer : theme.onSurfaceVariant }]}>Pemasukan</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Nama Kategori</Text>
          <TextInput
            style={styles.input}
            placeholder="Misal: Makan bareng"
            placeholderTextColor={theme.onSurfaceVariant}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Pilih Icon</Text>
          <ScrollView style={{ maxHeight: 150, marginBottom: 12 }} nestedScrollEnabled={true}>
            <View style={styles.iconGrid}>
              {iconOptions.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.iconOpt,
                    { backgroundColor: theme.surfaceContainer },
                    icon === opt && styles.iconSelected
                  ]}
                  onPress={() => setIcon(opt)}
                >
                  <MaterialIcons name={opt} size={20} color={icon === opt ? theme.primary : theme.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.btnAdd} onPress={handleSave}>
            <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.btnGradient}>
              <Text style={styles.btnText}>{isEditing ? 'Simpan Perubahan' : '+ Tambah Kategori'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity 
              style={{ marginTop: 8, padding: 8, alignItems: 'center' }} 
              onPress={() => {
                setIsEditing(false);
                setName('');
                setIcon('shopping-bag');
              }}
            >
              <Text style={{ color: theme.error, fontSize: 13, fontWeight: 'bold' }}>Batal Edit</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* List Kategori */}
        <Animated.View style={{ flex: 1, opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
          <FlatList
            style={styles.list}
            data={categories[type]}
            renderItem={renderItem}
            keyExtractor={(item, index) => item.name + index}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: theme.onSurfaceVariant, marginTop: 20 }}>
                Belum ada kategori buat {type === 'expense' ? 'pengeluaran' : 'pemasukan'}.
              </Text>
            }
          />
        </Animated.View>

        {/* Modal Konfirmasi Hapus */}
        <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ backgroundColor: theme.surface, borderRadius: 32, padding: 24, width: '100%' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.onSurface, marginBottom: 12, textAlign: 'center' }}>Hapus Kategori?</Text>
              <Text style={{ fontSize: 14, color: theme.onSurfaceVariant, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>
                Yakin ingin menghapus "{catToDelete}"? Transaksi lama tetap aman, tapi kategori ini tidak akan muncul lagi di pilihan.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: theme.surfaceContainerHighest, padding: 16, borderRadius: 16, alignItems: 'center' }} 
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: theme.error, padding: 16, borderRadius: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }} 
                  onPress={async () => {
                    setLoading(true);
                    try {
                      await deleteCategory(type, catToDelete);
                      setDeleteModalVisible(false);
                    } catch (e) {
                      Alert.alert('Gagal', 'Gagal menghapus kategori.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Hapus</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default CategoriesScreen;

