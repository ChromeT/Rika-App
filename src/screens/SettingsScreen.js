import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, Image, TextInput, Alert, Animated, Platform } from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext, availableFonts } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import { exportToXLS, exportToPDF } from '../utils/exportUtils';
import { LinearGradient } from 'expo-linear-gradient';

const SettingsScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleTheme, changeAccent, accentColor, fontFamily, changeFont } = useContext(ThemeContext);
  const { getBalance, transactions } = useContext(DataContext);
  const { user, householdUsers, householdAvatars, customColors, addCustomColor, logout, avatar, updateAvatar } = useContext(AuthContext);
  
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [customColorModalVisible, setCustomColorModalVisible] = useState(false);
  const [customHexInput, setCustomHexInput] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const myName = user?.name || 'Saya';
  const partnerName = householdUsers.find(u => u !== myName);
  const hasPartner = !!partnerName;

  const formatMoney = (val) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val);
  };

  const palettes = ['#F28B82', '#8AB4F8', '#81C995', '#FDD663', '#C58AF9', '#F88379'];
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

  const SectionHeader = ({ title, badge }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>{title}</Text>
      {badge && <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}><Text style={[styles.badgeText, { color: theme.primary }]}>{badge}</Text></View>}
    </View>
  );

  const SettingRow = ({ icon, title, desc, children, onPress }) => (
    <TouchableOpacity 
      style={[styles.settingRow, { backgroundColor: theme.surfaceContainerLow }]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingRowLeft}>
        <View style={[styles.settingIcon, { backgroundColor: theme.primary + '10' }]}>
          <MaterialIcons name={icon} size={22} color={theme.primary} />
        </View>
        <View>
          <Text style={[styles.settingTitle, { color: theme.onSurface }]}>{title}</Text>
          {desc && <Text style={[styles.settingDesc, { color: theme.onSurfaceVariant }]}>{desc}</Text>}
        </View>
      </View>
      {children || (onPress && <MaterialIcons name="chevron-right" size={20} color={theme.onSurfaceVariant} />)}
    </TouchableOpacity>
  );

  const handleAddCustomColor = () => {
    let hex = customHexInput.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (!/^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(hex)) {
      Alert.alert('Format Salah', 'Kode Hex harus berupa 3 atau 6 karakter (misal: #F53 atau #FF5733)');
      return;
    }
    addCustomColor(hex);
    changeAccent(hex);
    setCustomHexInput('');
    setCustomColorModalVisible(false);
  };

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('bulanan');
  const [exportFilters, setExportFilters] = useState({ user: 'Kita', type: 'Semua' });
  
  // Custom Date Range State
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [isCustomRange, setIsCustomRange] = useState(false);

  const startExport = (period) => {
    setExportPeriod(period);
    if (period === 'kustom') {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
    }
    setExportModalVisible(true);
  };

  const confirmExport = (format) => {
    const filtered = filterTransactionsByPeriod(exportPeriod);
    const periodLabel = exportPeriod === 'kustom' 
      ? `${dayjs(startDate).format('DD MMM')} - ${dayjs(endDate).format('DD MMM')}`
      : exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1);

    if (format === 'PDF') {
      exportToPDF(filtered, periodLabel, user?.name || 'User', exportFilters, []);
    } else {
      exportToXLS(filtered, periodLabel, user?.name || 'User', exportFilters, []);
    }
    setExportModalVisible(false);
  };

  const filterTransactionsByPeriod = (period) => {
    const now = dayjs();
    let start;
    let end = now;

    if (period === 'harian') start = now.startOf('day');
    else if (period === 'mingguan') start = now.startOf('week');
    else if (period === 'bulanan') start = now.startOf('month');
    else if (period === 'kustom') {
      start = dayjs(startDate).startOf('day');
      end = dayjs(endDate).endOf('day');
    } else start = dayjs(0);
    
    return transactions.filter(tx => {
      const txDate = dayjs(tx.date);
      return txDate.isAfter(start) && txDate.isBefore(end.add(1, 'second'));
    });
  };

  const getPeriodStats = () => {
    const filtered = filterTransactionsByPeriod(exportPeriod);
    let income = 0;
    let expense = 0;
    filtered.forEach(tx => {
      const amt = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      if (tx.type === 'income') income += amt;
      else if (tx.type === 'expense') expense += amt;
    });
    return { income, expense, count: filtered.length };
  };

  const stats = getPeriodStats();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerMainTitle, { color: theme.onSurface }]}>Pengaturan</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Couple')} style={[styles.headerBtn, { backgroundColor: theme.primary + '15' }]}>
           <MaterialIcons name="group" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView 
        contentContainerStyle={styles.main} 
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Profile Section */}
        <LinearGradient 
          colors={[theme.surfaceContainer, theme.surfaceContainerLow]}
          style={[styles.profileCard, { borderWidth: 1, borderColor: theme.outlineVariant + '22' }]}
        >
           <View style={styles.profileTop}>
              <View style={styles.userColumn}>
                 <TouchableOpacity onPress={() => setAvatarModalVisible(true)} style={styles.avatarLarge}>
                    <View style={[styles.avatarInner, { borderColor: theme.primary + '44' }]}>{renderAvatar(avatar, 40)}</View>
                    <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]} />
                 </TouchableOpacity>
                 <Text style={[styles.profileName, { color: theme.onSurface }]}>{myName}</Text>
                 <Text style={[styles.profileRole, { color: theme.primary }]}>Saldo: Rp {formatMoney(getBalance(myName))}</Text>
              </View>

              {hasPartner ? (
                <>
                  <View style={styles.vsContainer}>
                    <View style={[styles.vsLine, { backgroundColor: theme.outlineVariant + '22' }]} />
                    <MaterialIcons name="favorite" size={20} color={theme.error + 'AA'} />
                    <View style={[styles.vsLine, { backgroundColor: theme.outlineVariant + '22' }]} />
                  </View>
                  <View style={styles.userColumn}>
                    <View style={styles.avatarLarge}>
                       <View style={[styles.avatarInner, { borderColor: theme.primary + '22' }]}>
                          {householdAvatars && householdAvatars[partnerName] 
                            ? renderAvatar(householdAvatars[partnerName], 40)
                            : <MaterialIcons name="favorite" size={40} color={theme.primary + '33'} />
                          }
                       </View>
                    </View>
                    <Text style={[styles.profileName, { color: theme.onSurface }]}>{partnerName}</Text>
                    <Text style={[styles.profileRole, { color: theme.onSurfaceVariant }]}>Saldo: Rp {formatMoney(getBalance(partnerName))}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.inviteBox}>
                   <Text style={[styles.inviteText, { color: theme.onSurfaceVariant }]}>Ajak pasangan bergabung!</Text>
                   <View style={[styles.codeBadge, { backgroundColor: theme.primary + '15' }]}>
                      <Text style={[styles.codeText, { color: theme.primary }]}>{user?.householdId}</Text>
                   </View>
                </View>
              )}
           </View>
           
           <TouchableOpacity style={[styles.editProfileBtn, { backgroundColor: theme.primary }]} onPress={() => setAvatarModalVisible(true)}>
              <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Ubah Profil & Avatar</Text>
           </TouchableOpacity>
        </LinearGradient>

        <SectionHeader title="Laporan & Ekspor" badge="Analytics" />
        <View style={[styles.analyticsCard, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant + '22', borderWidth: 1 }]}>
           <View style={styles.analyticsHeader}>
              <View>
                 <Text style={[styles.analyticsTitle, { color: theme.onSurface }]}>Ikhtisar Keuangan</Text>
                 <Text style={[styles.analyticsSubtitle, { color: theme.onSurfaceVariant }]}>
                    {exportPeriod === 'bulanan' ? 'Bulan Ini' : exportPeriod === 'mingguan' ? 'Minggu Ini' : exportPeriod === 'harian' ? 'Hari Ini' : 'Rentang Kustom'}
                 </Text>
              </View>
              <View style={styles.periodPills}>
                 {['harian', 'mingguan', 'bulanan', 'kustom'].map(p => (
                   <TouchableOpacity 
                     key={p} 
                     onPress={() => setExportPeriod(p)}
                     style={[styles.periodPill, exportPeriod === p && { backgroundColor: theme.primary }]}
                   >
                      <Text style={[styles.periodPillText, { color: exportPeriod === p ? theme.onPrimary : theme.onSurfaceVariant }]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                   </TouchableOpacity>
                 ))}
              </View>
           </View>

           {exportPeriod === 'kustom' && (
             <View style={styles.customDateRow}>
                <View style={styles.dateInputGroup}>
                   <Text style={[styles.dateLabel, { color: theme.onSurfaceVariant }]}>Mulai</Text>
                   <TextInput 
                     style={[styles.dateInput, { backgroundColor: theme.surfaceContainerHigh, color: theme.onSurface }]}
                     value={startDate}
                     onChangeText={setStartDate}
                     placeholder="YYYY-MM-DD"
                   />
                </View>
                <View style={styles.dateInputGroup}>
                   <Text style={[styles.dateLabel, { color: theme.onSurfaceVariant }]}>Selesai</Text>
                   <TextInput 
                     style={[styles.dateInput, { backgroundColor: theme.surfaceContainerHigh, color: theme.onSurface }]}
                     value={endDate}
                     onChangeText={setEndDate}
                     placeholder="YYYY-MM-DD"
                   />
                </View>
             </View>
           )}

           <View style={styles.statsRow}>
              <View style={styles.statItem}>
                 <View style={[styles.statIcon, { backgroundColor: '#10B98115' }]}>
                    <MaterialIcons name="trending-up" size={18} color="#10B981" />
                 </View>
                 <View>
                    <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>Masuk</Text>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>Rp {formatMoney(stats.income)}</Text>
                 </View>
              </View>
              <View style={styles.statItem}>
                 <View style={[styles.statIcon, { backgroundColor: theme.error + '15' }]}>
                    <MaterialIcons name="trending-down" size={18} color={theme.error} />
                 </View>
                 <View>
                    <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>Keluar</Text>
                    <Text style={[styles.statValue, { color: theme.error }]}>Rp {formatMoney(stats.expense)}</Text>
                 </View>
              </View>
           </View>

           <TouchableOpacity 
             style={[styles.generateBtn, { backgroundColor: theme.primary }]} 
             onPress={() => setExportModalVisible(true)}
           >
              <MaterialIcons name="file-download" size={20} color={theme.onPrimary} />
              <Text style={[styles.generateBtnText, { color: theme.onPrimary }]}>Ekspor Laporan ({stats.count})</Text>
           </TouchableOpacity>
        </View>

        <SectionHeader title="Kustomisasi" />
        <View style={styles.settingGroup}>
          <SettingRow icon="category" title="Kelola Kategori" desc="Atur kategori transaksi Anda" onPress={() => navigation.navigate("Categories")} />
          <SettingRow icon="dark-mode" title="Mode Gelap" desc="Aktifkan tampilan mode malam">
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme}
              trackColor={{ false: theme.outlineVariant + '44', true: theme.primary }}
              thumbColor="#fff"
            />
          </SettingRow>
          
          <View style={[styles.paletteContainer, { backgroundColor: theme.surfaceContainerLow }]}>
            <View style={styles.paletteHeader}>
               <View style={[styles.paletteIconBg, { backgroundColor: theme.surfaceContainerHigh }]}>
                 <MaterialIcons name="palette" size={20} color={theme.primary} />
               </View>
               <View>
                 <Text style={[styles.paletteTitle, { color: theme.onSurface }]}>Warna Aksen</Text>
                 <Text style={[styles.paletteSubtitle, { color: theme.onSurfaceVariant }]}>Pilih warna kesukaan kita</Text>
               </View>
            </View>
            <View style={styles.paletteList}>
              {palettes.map((hex, i) => {
                const isActive = accentColor === hex;
                return (
                  <TouchableOpacity 
                    key={i} 
                    activeOpacity={0.8}
                    style={[
                      styles.paletteDot, 
                      { backgroundColor: hex, justifyContent: 'center', alignItems: 'center' }, 
                      isActive && styles.paletteDotActive
                    ]} 
                    onPress={() => changeAccent(hex)}
                  >
                    {isActive && <MaterialIcons name="check" size={20} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity 
                style={[styles.paletteDot, styles.plusBtn]} 
                onPress={() => setCustomColorModalVisible(true)}
              >
                <MaterialIcons name="add" size={24} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.paletteContainer, { backgroundColor: theme.surfaceContainerLow, marginTop: 12 }]}>
            <View style={styles.paletteHeader}>
               <MaterialIcons name="format-size" size={20} color={theme.primary} />
               <Text style={[styles.paletteTitle, { color: theme.onSurface }]}>Pilihan Font</Text>
            </View>
            <View style={styles.fontGrid}>
              {availableFonts.map((font) => (
                <TouchableOpacity
                  key={font.name}
                  style={[styles.fontItem, { backgroundColor: fontFamily === font.name ? theme.primary : theme.surfaceContainerHighest }]}
                  onPress={() => changeFont(font.name)}
                >
                  <Text style={[styles.fontItemText, { color: fontFamily === font.name ? theme.onPrimary : theme.onSurfaceVariant }]}>{font.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.error + '10' }]} onPress={logout}>
          <MaterialIcons name="logout" size={24} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Log Out</Text>
        </TouchableOpacity>
        

      </Animated.ScrollView>

      {/* Modals remain mostly similar but with premium touch */}
      {/* ... (Other modals from SettingsScreen) */}
      <Modal visible={avatarModalVisible} transparent animationType="fade" onRequestClose={() => setAvatarModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>Pilih Avatar</Text>
            <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: theme.primary }]} onPress={pickImage}>
               <MaterialIcons name="photo-camera" size={24} color={theme.onPrimary} />
               <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Upload Foto Gallery</Text>
            </TouchableOpacity>
            <View style={styles.avatarGrid}>
              {avatarOptions.map(icon => (
                <TouchableOpacity key={icon} style={[styles.avatarOption, { backgroundColor: theme.surfaceContainerLow }, avatar === icon && { borderColor: theme.primary, borderWidth: 2 }]} onPress={() => { updateAvatar(icon); setAvatarModalVisible(false); }}>
                  <MaterialIcons name={icon} size={32} color={avatar === icon ? theme.primary : theme.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAvatarModalVisible(false)}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Tutup</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Export Filter Modal */}
      <Modal visible={exportModalVisible} transparent animationType="slide" onRequestClose={() => setExportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>Format Laporan</Text>
            <View style={{ marginBottom: 24 }}>
               <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, marginBottom: 12 }}>Filter Data:</Text>
               <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['Saya', 'Pasangan', 'Kita'].map(f => (
                    <TouchableOpacity key={f} onPress={() => setExportFilters({...exportFilters, user: f})} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: exportFilters.user === f ? theme.primary : theme.surfaceContainerLow, alignItems: 'center' }}>
                       <Text style={{ color: exportFilters.user === f ? theme.onPrimary : theme.onSurface, fontWeight: 'bold', fontSize: 12 }}>{f}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
               <TouchableOpacity style={[styles.formatBtn, { borderColor: '#F44336' }]} onPress={() => confirmExport('PDF')}>
                  <MaterialIcons name="picture-as-pdf" size={24} color="#F44336" />
                  <Text style={{ color: '#F44336', fontWeight: 'bold' }}>PDF</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[styles.formatBtn, { borderColor: '#4CAF50' }]} onPress={() => confirmExport('XLS')}>
                  <MaterialIcons name="table-view" size={24} color="#4CAF50" />
                  <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Excel</Text>
               </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setExportModalVisible(false)}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Color Modal */}
      <Modal visible={customColorModalVisible} transparent animationType="slide" onRequestClose={() => setCustomColorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
             <Text style={[styles.modalTitle, { color: theme.onSurface, marginBottom: 8 }]}>Custom Warna</Text>
             <Text style={{ color: theme.onSurfaceVariant, textAlign: 'center', marginBottom: 24, fontSize: 13 }}>Input hex code atau pilih dari warna tersimpan</Text>
             
             <TextInput 
               style={[styles.hexInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant + '44', borderWidth: 1 }]} 
               placeholder="#HEXCODE" 
               placeholderTextColor={theme.onSurfaceVariant}
               autoCapitalize="characters"
               value={customHexInput}
               onChangeText={setCustomHexInput}
             />
             
             <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: theme.primary }]} onPress={handleAddCustomColor}>
                <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>Terapkan & Simpan</Text>
             </TouchableOpacity>

             {customColors && customColors.length > 0 && (
               <View style={{ width: '100%', marginTop: 8 }}>
                 <Text style={{ color: theme.onSurface, fontWeight: 'bold', fontSize: 14, marginBottom: 16 }}>Warna Tersimpan</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8, alignItems: 'center' }}>
                    {customColors.map((hex, i) => {
                      const isActive = accentColor === hex;
                      return (
                        <TouchableOpacity 
                          key={i} 
                          style={[
                            styles.savedColorDot, 
                            { backgroundColor: hex, justifyContent: 'center', alignItems: 'center' }, 
                            isActive && { width: 34, height: 34, borderRadius: 17 }
                          ]} 
                          onPress={() => { changeAccent(hex); setCustomColorModalVisible(false); }}
                        >
                          {isActive && <MaterialIcons name="check" size={18} color="#fff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
               </View>
             )}

             <TouchableOpacity style={[styles.modalCloseBtn, { marginTop: 16 }]} onPress={() => setCustomColorModalVisible(false)}>
              <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  headerMainTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  headerBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  main: { paddingHorizontal: 24, paddingBottom: 100 },
  
  profileCard: { borderRadius: 32, padding: 24, marginBottom: 32 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  userColumn: { alignItems: 'center', flex: 1 },
  avatarLarge: { width: 80, height: 80, marginBottom: 12 },
  avatarInner: { flex: 1, borderRadius: 28, overflow: 'hidden', borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff' },
  profileName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  profileRole: { fontSize: 11, fontWeight: 'bold' },
  vsContainer: { alignItems: 'center', width: 30 },
  vsLine: { width: 1, flex: 1, marginVertical: 8 },
  inviteBox: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  inviteText: { fontSize: 12, marginBottom: 8 },
  codeBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  codeText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  editProfileBtn: { padding: 14, borderRadius: 16, alignItems: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

  analyticsCard: { borderRadius: 32, padding: 24, marginBottom: 32 },
  analyticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  analyticsTitle: { fontSize: 16, fontWeight: '900' },
  analyticsSubtitle: { fontSize: 12, fontWeight: '500' },
  periodPills: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4, gap: 4 },
  periodPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  periodPillText: { fontSize: 10, fontWeight: '800' },
  
  customDateRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  dateInputGroup: { flex: 1 },
  dateLabel: { fontSize: 10, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  dateInput: { padding: 12, borderRadius: 12, fontSize: 13, fontWeight: '700' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 20 },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '900' },

  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, gap: 10 },
  generateBtnText: { fontSize: 14, fontWeight: '900' },

  settingGroup: { gap: 12, marginBottom: 32 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 24 },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  settingTitle: { fontSize: 15, fontWeight: 'bold' },
  settingDesc: { fontSize: 12 },

  paletteContainer: { padding: 24, borderRadius: 32 },
  paletteHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  paletteIconBg: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  paletteTitle: { fontSize: 16, fontWeight: '900' },
  paletteSubtitle: { fontSize: 11, fontWeight: '500' },
  paletteList: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paletteDot: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  paletteDotActive: { width: 38, height: 38, borderRadius: 19 },
  plusBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  savedColorDot: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  fontGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fontItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  fontItemText: { fontSize: 12, fontWeight: 'bold' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 24, gap: 12 },
  logoutText: { fontSize: 16, fontWeight: 'bold' },


  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 36, padding: 28 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 24, textAlign: 'center' },
  modalActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, gap: 12, marginBottom: 24 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 },
  avatarOption: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalCloseBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  formatBtn: { flex: 1, padding: 20, borderRadius: 20, borderWidth: 2, alignItems: 'center', gap: 8 },
  hexInput: { padding: 18, borderRadius: 16, fontSize: 18, fontWeight: '900', textAlign: 'center', letterSpacing: 2, marginBottom: 20 },
});

export default SettingsScreen;
