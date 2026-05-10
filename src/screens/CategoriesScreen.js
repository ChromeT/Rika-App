import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';

const iconOptions = [
  // General & Misc
  'star', 'pets', 'child-friendly', 'cake', 'favorite', 'emoji-events',
  // Income / Finance
  'payments', 'account-balance-wallet', 'savings', 'paid', 'monetization-on', 'trending-up', 'work', 'volunteer-activism', 'card-giftcard',
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
  const { categories, addCategory } = useContext(DataContext);

  const [type, setType] = useState('expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('shopping-bag');

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Oops', 'Nama kategori nggak boleh kosong bro.');
      return;
    }
    addCategory(type, { name: name.trim(), icon });
    setName('');
    Alert.alert('Mantap!', `Kategori "${name}" udah ditambah.`);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.catItem, { backgroundColor: theme.surfaceContainer }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primaryContainer + '33' }]}>
        <MaterialIcons name={item.icon} size={20} color={theme.primary} />
      </View>
      <Text style={[styles.catName, { color: theme.onSurface }]}>{item.name}</Text>
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
    catItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 8, gap: 12 },
    iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    catName: { fontSize: 14, fontWeight: '600' },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kategori Transaksi</Text>
        </View>

        {/* Form Tambah */}
        <View style={styles.form}>
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

          <TouchableOpacity style={styles.btnAdd} onPress={handleAdd}>
            <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.btnGradient}>
              <Text style={styles.btnText}>+ Tambah Kategori</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* List Kategori */}
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
      </View>
    </KeyboardAvoidingView>
  );
};

export default CategoriesScreen;
