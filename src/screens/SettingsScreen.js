import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, Image, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext, availableFonts } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { exportToXLS, exportToPDF } from '../utils/exportUtils';

const SettingsScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleTheme, changeAccent, accentColor, fontFamily, changeFont } = useContext(ThemeContext);
  const { getBalance, transactions } = useContext(DataContext);
  const { user, householdUsers, householdAvatars, customColors, addCustomColor, logout, avatar, updateAvatar } = useContext(AuthContext);
  
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [customColorModalVisible, setCustomColorModalVisible] = useState(false);
  const [customHexInput, setCustomHexInput] = useState('');

  const myName = user?.name || 'Saya';
  const partnerName = householdUsers.find(u => u !== myName);
  const hasPartner = !!partnerName;

  const formatMoney = (val) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val);
  };

  const palettes = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#ffb74d'];
  const avatarOptions = ['person', 'face', 'pets', 'emoji-emotions', 'cruelty-free', 'mood', 'stars', 'rocket'];

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.1,
      base64: true
    });

    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      updateAvatar(base64Image);
      setAvatarModalVisible(false);
    }
  };

  const renderAvatar = (src, size) => {
    if (src?.startsWith('file://') || src?.startsWith('data:image')) {
      return <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} />;
    }
    return <MaterialIcons name={src || "person"} size={size} color={theme.primary} />;
  };

  
  const getStyles = (t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: t.surface,
      zIndex: 50,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logoText: { fontSize: 22, fontWeight: '900', color: t.primary, letterSpacing: -1, marginRight: 4 },
    avatarWrapper: {
      width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
      backgroundColor: t.surfaceContainer,
      borderWidth: 1, borderColor: t.outlineVariant + '33',
      justifyContent: 'center', alignItems: 'center'
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: t.primary, letterSpacing: -0.5, fontFamily: t.fontFamily },
    main: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },

    sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    sectionTitle: { fontSize: 24, fontWeight: 'bold', color: t.onSurface, letterSpacing: -0.5 },
    badge: { backgroundColor: t.surfaceContainerHigh, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: t.onSurfaceVariant, textTransform: 'uppercase' },

    accountCard: { backgroundColor: t.surfaceContainerLow, borderRadius: 32, padding: 24, marginBottom: 32 },
    acTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    acUser: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    acAvatarWrap: { position: 'relative' },
    acAvMain: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: t.primary + '33', backgroundColor: t.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
    acAvDotMain: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: t.primary, borderWidth: 4, borderColor: t.surfaceContainerLow },
    acNameDetail: { },
    acName: { fontSize: 16, fontWeight: 'bold', color: t.onSurface },
    acRole: { fontSize: 10, color: t.onSurfaceVariant, fontWeight: '500', marginBottom: 4 },
    acBalance: { fontSize: 12, fontWeight: '900', color: t.primary },
    
    acUserRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    acNameDetailRight: { alignItems: 'flex-end' },
    acNameRight: { fontSize: 16, fontWeight: 'bold', color: t.onSurface },
    acRoleRight: { fontSize: 10, color: t.onSurfaceVariant, fontWeight: '500', marginBottom: 4 },
    acBalanceRight: { fontSize: 12, fontWeight: '900', color: t.primaryContainer },
    acAvPrt: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: t.primaryContainer + '33', backgroundColor: t.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
    acAvDotPrt: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: t.primary + '66', borderWidth: 4, borderColor: t.surfaceContainerLow },

    acBottom: { backgroundColor: t.surfaceContainer, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    acBotLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    acDate: { fontSize: 12, fontWeight: '500', color: t.onSurfaceVariant },
    acBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    acBtnText: { color: t.primary, fontWeight: 'bold', fontSize: 12 },


    viewSection: { gap: 24, marginBottom: 32 },
    vCardRow: { backgroundColor: t.surfaceContainerLow, padding: 24, borderRadius: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    vCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    vIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: t.surfaceContainer, justifyContent: 'center', alignItems: 'center' },
    vTitle: { fontSize: 16, fontWeight: 'bold', color: t.onSurface, marginBottom: 4, fontFamily: t.fontFamily },
    vDesc: { fontSize: 12, color: t.onSurfaceVariant, fontFamily: t.fontFamily },
    
    vCardCol: { backgroundColor: t.surfaceContainerLow, padding: 24, borderRadius: 32 },
    palletteRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, flexWrap: 'wrap', gap: 12 },
    palleteDot: { width: 40, height: 40, borderRadius: 20 },
    palleteDotActive: { borderWidth: 4, borderColor: t.surfaceContainerLow, elevation: 5 },
    palleteDotAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.surfaceContainerHighest, justifyContent: 'center', alignItems: 'center' },

    fontGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
    fontBtnActive: { width: '48%', backgroundColor: t.primary, padding: 16, borderRadius: 16 },
    fontBtnInactive: { width: '48%', backgroundColor: t.surfaceContainer, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: t.outlineVariant + '1A' },
    fontTextActive: { color: t.onPrimary, fontWeight: 'bold', fontSize: 12 },
    fontTextInactive: { color: t.onSurfaceVariant, fontWeight: '500', fontSize: 12 },

    dangerBtn: { backgroundColor: t.error + '0D', borderWidth: 1, borderColor: t.error + '1A', padding: 20, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    dangerText: { color: t.error, fontWeight: 'bold', fontSize: 16 },
    versionText: { textAlign: 'center', fontSize: 10, color: t.onSurfaceVariant, fontWeight: 'bold', letterSpacing: 1, marginTop: 24 },

    waitingCard: { backgroundColor: t.surfaceContainerHighest, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
    waitingText: { fontSize: 12, fontWeight: 'bold', color: t.onSurfaceVariant, textAlign: 'center', marginBottom: 4 },
    waitingCode: { fontSize: 18, fontWeight: '900', color: t.primary, letterSpacing: 2 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: t.surface, borderRadius: 32, padding: 24, width: '100%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: t.onSurface, marginBottom: 24, textAlign: 'center' },
    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 24 },
    avatarOption: { width: 64, height: 64, borderRadius: 32, backgroundColor: t.surfaceContainer, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarOptionActive: { backgroundColor: t.primaryContainer, borderWidth: 2, borderColor: t.primary },
    btnGallery: { backgroundColor: t.primaryContainer, padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
    btnGalleryText: { color: t.onPrimaryContainer, fontWeight: 'bold' },
    btnCancel: { padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: t.surfaceContainerHighest },

    inputHex: { backgroundColor: t.surfaceContainerHighest, borderRadius: 16, padding: 16, marginBottom: 16, color: t.onSurface, fontSize: 16, textAlign: 'center', fontWeight: 'bold', letterSpacing: 2 },
    btnSave: { backgroundColor: t.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
  });

  const styles = getStyles(theme);

  const handleAddCustomColor = () => {
    let hex = customHexInput.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    
    if (!/^#[0-9A-F]{6}$/i.test(hex)) {
      Alert.alert('Format Salah', 'Kode Hex harus berupa 6 karakter (misal: #FF5733)');
      return;
    }

    addCustomColor(hex);
    changeAccent(hex);
    setCustomHexInput('');
    setCustomColorModalVisible(false);
  };

  const filterTransactionsByPeriod = (period) => {
    const now = new Date();
    let startDate;
    if (period === 'harian') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'mingguan') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'bulanan') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(0);
    }
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return !isNaN(txDate.getTime()) && txDate >= startDate && txDate <= now;
    });
  };

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('bulanan');
  const [exportFilters, setExportFilters] = useState({ user: 'Kita', type: 'Semua' });

  const startExport = (period) => {
    setExportPeriod(period);
    setExportModalVisible(true);
  };

  const confirmExport = (format) => {
    const filtered = filterTransactionsByPeriod(exportPeriod);
    if (format === 'PDF') {
      exportToPDF(filtered, exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1), user?.name || 'User', exportFilters);
    } else {
      exportToXLS(filtered, exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1), user?.name || 'User', exportFilters);
    }
    setExportModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setAvatarModalVisible(true)}>
            <View style={styles.avatarWrapper}>
              {renderAvatar(avatar, 24)}
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{myName}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Couple')}>
          <MaterialIcons name="group" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.main} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { marginBottom: 24 }]}>Akun Kita</Text>
        
        {hasPartner ? (
          <View style={styles.accountCard}>
            <View style={styles.acTop}>
              <View style={styles.acUser}>
                <TouchableOpacity onPress={() => setAvatarModalVisible(true)} style={styles.acAvatarWrap}>
                  <View style={styles.acAvMain}>{renderAvatar(avatar, 32)}</View>
                  <View style={styles.acAvDotMain} />
                </TouchableOpacity>
                <View style={styles.acNameDetail}>
                  <Text style={styles.acName}>{myName}</Text>
                  <Text style={styles.acRole}>Anda</Text>
                  <Text style={styles.acBalance}>Rp {formatMoney(getBalance(myName))}</Text>
                </View>
              </View>

              <View style={styles.acUserRight}>
                <View style={styles.acNameDetailRight}>
                  <Text style={styles.acNameRight}>{partnerName}</Text>
                  <Text style={styles.acRoleRight}>Pasangan</Text>
                  <Text style={styles.acBalanceRight}>Rp {formatMoney(getBalance(partnerName))}</Text>
                </View>
                <View style={styles.acAvatarWrap}>
                  <View style={styles.acAvPrt}>
                    {householdAvatars && householdAvatars[partnerName] 
                      ? renderAvatar(householdAvatars[partnerName], 32)
                      : <MaterialIcons name="favorite" size={32} color={theme.primaryContainer} />
                    }
                  </View>
                  <View style={styles.acAvDotPrt} />
                </View>
              </View>
            </View>

            <View style={styles.acBottom}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceContainerLowest, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, marginRight: 6 }}>KODE RUANG:</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: theme.primary, letterSpacing: 1 }}>{user?.householdId}</Text>
              </View>
              <TouchableOpacity style={styles.acBtn} onPress={() => setAvatarModalVisible(true)}>
                <Text style={styles.acBtnText}>Ubah Detail</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.accountCard}>
            <View style={styles.acTop}>
              <View style={styles.acUser}>
                <TouchableOpacity onPress={() => setAvatarModalVisible(true)} style={styles.acAvatarWrap}>
                  <View style={styles.acAvMain}>{renderAvatar(avatar, 32)}</View>
                </TouchableOpacity>
                <View style={styles.acNameDetail}>
                  <Text style={styles.acName}>{myName}</Text>
                  <Text style={styles.acRole}>Anda</Text>
                  <Text style={styles.acBalance}>Rp {formatMoney(getBalance(myName))}</Text>
                </View>
              </View>
            </View>
            <View style={styles.waitingCard}>
              <Text style={styles.waitingText}>Berikan kode ini ke pasangan Anda agar mereka bisa bergabung:</Text>
              <Text style={styles.waitingCode}>{user?.householdId}</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Laporan & Analisa</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>Periodik</Text></View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, height: 210, marginBottom: 32 }}>
          {/* Kartu Bulanan - Highlighted */}
          <TouchableOpacity 
            activeOpacity={0.9}
            style={{ flex: 1.2, backgroundColor: theme.primary, borderRadius: 28, padding: 20, justifyContent: 'space-between', overflow: 'hidden' }}
            onPress={() => startExport('bulanan')}
          >
            <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <MaterialIcons name="analytics" size={24} color="#FFF" />
              </View>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', fontFamily: theme.fontFamily }}>Bulanan</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4, fontFamily: theme.fontFamily }}>Analisa mendalam cashflow bulanan</Text>
            </View>
            <TouchableOpacity onPress={() => startExport('bulanan')} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Unduh Laporan</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Harian & Mingguan Side Column */}
          <View style={{ flex: 1, gap: 12 }}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={{ flex: 1, backgroundColor: theme.surfaceContainerLow, borderRadius: 24, padding: 16, justifyContent: 'center', borderWidth: 1, borderColor: theme.outlineVariant + '33' }}
              onPress={() => startExport('harian')}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primary + '1A', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons name="today" size={20} color={theme.primary} />
              </View>
              <Text style={{ color: theme.onSurface, fontSize: 14, fontWeight: 'bold', fontFamily: theme.fontFamily }}>Harian</Text>
              <Text style={{ color: theme.onSurfaceVariant, fontSize: 10, fontFamily: theme.fontFamily }}>Jajan hari ini</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={{ flex: 1, backgroundColor: theme.surfaceContainerLow, borderRadius: 24, padding: 16, justifyContent: 'center', borderWidth: 1, borderColor: theme.outlineVariant + '33' }}
              onPress={() => startExport('mingguan')}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primary + '1A', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons name="date-range" size={20} color={theme.primary} />
              </View>
              <Text style={{ color: theme.onSurface, fontSize: 14, fontWeight: 'bold', fontFamily: theme.fontFamily }}>Mingguan</Text>
              <Text style={{ color: theme.onSurfaceVariant, fontSize: 10, fontFamily: theme.fontFamily }}>Rekap seminggu</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Tampilan</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>Kustomisasi</Text></View>
        </View>

        <View style={styles.viewSection}>
          <TouchableOpacity style={styles.vCardRow} onPress={() => navigation.navigate("Categories")}>
            <View style={styles.vCardLeft}>
              <View style={styles.vIconBg}><MaterialIcons name="category" size={24} color={theme.primary} /></View>
              <View>
                <Text style={styles.vTitle}>Kelola Kategori</Text>
                <Text style={styles.vDesc}>Atur kategori transaksi kita</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={styles.vCardRow}>
            <View style={styles.vCardLeft}>
              <View style={styles.vIconBg}><MaterialIcons name="dark-mode" size={24} color={theme.primary} /></View>
              <View>
                <Text style={styles.vTitle}>Mode Gelap</Text>
                <Text style={styles.vDesc}>Nyaman untuk mata di malam hari</Text>
              </View>
            </View>
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme}
              trackColor={{ false: theme.surfaceContainerLowest, true: theme.primary }}
              thumbColor={theme.onPrimary}
            />
          </View>

          <View style={styles.vCardCol}>
            <View style={styles.vCardLeft}>
              <View style={[styles.vIconBg, { backgroundColor: theme.surfaceContainer }]}><MaterialIcons name="palette" size={24} color={theme.primary} /></View>
              <View>
                <Text style={styles.vTitle}>Warna Aksen</Text>
                <Text style={styles.vDesc}>Pilih warna kesukaan kita</Text>
              </View>
            </View>
            <View style={styles.palletteRow}>
              {palettes.slice(0, 5).map((hex, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.palleteDot, { backgroundColor: hex }, accentColor === hex && styles.palleteDotActive, (!accentColor && i === 0) && styles.palleteDotActive ]} 
                  onPress={() => changeAccent(hex)}
                />
              ))}
              {/* Jika accentColor tidak ada di palettes standar (warna kustom aktif) */}
              {accentColor && !palettes.slice(0, 5).includes(accentColor) && (
                <TouchableOpacity style={[styles.palleteDot, { backgroundColor: accentColor }, styles.palleteDotActive]} onPress={() => changeAccent(accentColor)} />
              )}
              <TouchableOpacity style={styles.palleteDotAdd} onPress={() => setCustomColorModalVisible(true)}>
                <MaterialIcons name="add" size={24} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.vCardCol}>
            <View style={styles.vCardLeft}>
              <View style={[styles.vIconBg, { backgroundColor: theme.surfaceContainer }]}><MaterialIcons name="format-size" size={24} color={theme.primary} /></View>
              <View>
                <Text style={styles.vTitle}>Pilihan Font</Text>
                <Text style={styles.vDesc}>Aktif: {fontFamily === 'System' ? 'System Default' : fontFamily}</Text>
              </View>
            </View>
            <View style={styles.fontGrid}>
              {availableFonts.map((font) => (
                <TouchableOpacity
                  key={font.name}
                  style={fontFamily === font.name ? styles.fontBtnActive : styles.fontBtnInactive}
                  onPress={() => changeFont(font.name)}
                >
                  <Text style={fontFamily === font.name ? styles.fontTextActive : styles.fontTextInactive}>{font.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.dangerBtn} onPress={logout}>
          <MaterialIcons name="logout" size={24} color={theme.error} />
          <Text style={styles.dangerText}>Keluar dari Rika</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>RIKA V2.4.0 • DIBUAT DENGAN CINTA</Text>
      </ScrollView>

      {/* Export Filter Modal */}
      <Modal visible={exportModalVisible} transparent animationType="slide" onRequestClose={() => setExportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { marginBottom: 8 }]}>Filter Laporan</Text>
            <Text style={{ textAlign: 'center', color: theme.onSurfaceVariant, fontSize: 12, marginBottom: 24, textTransform: 'capitalize' }}>Periode: {exportPeriod}</Text>
            
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface, marginBottom: 12 }}>Pilih Data Pengguna:</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: myName, value: 'Saya' },
                  { label: partnerName || 'Pasangan', value: 'Pasangan' },
                  { label: 'Kita', value: 'Kita' }
                ].map(opt => (
                  <TouchableOpacity 
                    key={opt.value} 
                    onPress={() => setExportFilters({ ...exportFilters, user: opt.value })}
                    style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, backgroundColor: exportFilters.user === opt.value ? theme.primary : theme.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text numberOfLines={1} style={{ color: exportFilters.user === opt.value ? theme.onPrimary : theme.onSurfaceVariant, fontSize: 11, fontWeight: 'bold' }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface, marginBottom: 12 }}>Pilih Tipe Transaksi:</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Semua', 'Pengeluaran', 'Pemasukan'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    onPress={() => setExportFilters({ ...exportFilters, type: t })}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: exportFilters.type === t ? theme.primary : theme.surfaceContainerHighest, alignItems: 'center' }}
                  >
                    <Text style={{ color: exportFilters.type === t ? theme.onPrimary : theme.onSurfaceVariant, fontSize: 12, fontWeight: 'bold' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: theme.surfaceContainerLow, borderWidth: 1, borderColor: '#F44336', padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }} onPress={() => confirmExport('PDF')}>
                <MaterialIcons name="picture-as-pdf" size={20} color="#F44336" />
                <Text style={{ color: '#F44336', fontWeight: 'bold' }}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: theme.surfaceContainerLow, borderWidth: 1, borderColor: '#4CAF50', padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }} onPress={() => confirmExport('XLS')}>
                <MaterialIcons name="table-view" size={20} color="#4CAF50" />
                <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>XLS</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.btnCancel, { marginTop: 12 }]} onPress={() => setExportModalVisible(false)}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Avatar Modal */}
      <Modal visible={avatarModalVisible} transparent animationType="slide" onRequestClose={() => setAvatarModalVisible(false)}>

        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Foto Profil</Text>
            
            <TouchableOpacity style={styles.btnGallery} onPress={pickImage}>
              <MaterialIcons name="photo-camera" size={24} color={theme.onPrimaryContainer} style={{ marginBottom: 4 }} />
              <Text style={styles.btnGalleryText}>Upload Foto Asli</Text>
            </TouchableOpacity>

            <View style={styles.avatarGrid}>
              {avatarOptions.map(iconName => (
                <TouchableOpacity 
                  key={iconName} 
                  style={[styles.avatarOption, avatar === iconName && styles.avatarOptionActive]}
                  onPress={() => {
                    updateAvatar(iconName);
                    setAvatarModalVisible(false);
                  }}
                >
                  <MaterialIcons name={iconName} size={32} color={avatar === iconName ? theme.primary : theme.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setAvatarModalVisible(false)}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Custom Color */}
      <Modal visible={customColorModalVisible} transparent animationType="slide" onRequestClose={() => setCustomColorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Warna Kustom (Hex)</Text>
            
            <TextInput 
              style={styles.inputHex} 
              placeholder="#FFFFFF" 
              placeholderTextColor={theme.onSurfaceVariant} 
              value={customHexInput} 
              onChangeText={setCustomHexInput}
              autoCapitalize="characters"
              maxLength={7}
            />

            <TouchableOpacity style={styles.btnSave} onPress={handleAddCustomColor}>
              <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Simpan & Terapkan</Text>
            </TouchableOpacity>

            {(customColors && customColors.length > 0) && (
              <>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurfaceVariant, marginTop: 24, marginBottom: 12, textAlign: 'center' }}>Warna Tersimpan</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                  {customColors.map((hex, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.palleteDot, { backgroundColor: hex }, accentColor === hex && styles.palleteDotActive]} 
                      onPress={() => {
                        changeAccent(hex);
                        setCustomColorModalVisible(false);
                      }}
                    />
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={[styles.btnCancel, { marginTop: 24 }]} onPress={() => setCustomColorModalVisible(false)}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default SettingsScreen;

