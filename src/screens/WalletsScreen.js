import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Modal, Animated, Platform } from 'react-native';
import Text from '../components/ThemeText';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { formatMoney } from '../utils/formatUtils';

const { width } = Dimensions.get('window');

const WalletsScreen = ({ route }) => {
  const { walletId } = route.params || {};
  const navigation = useNavigation();
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { accounts, deleteAccount, transactions } = useContext(DataContext);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Highlighting
  const [highlightedId, setHighlightedId] = useState(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const itemLayouts = useRef({});

  useEffect(() => {
    if (walletId) {
      setHighlightedId(walletId);
      highlightAnim.setValue(0);
      
      // Auto scroll logic
      setTimeout(() => {
        const layout = itemLayouts.current[walletId];
        if (layout && scrollRef.current) {
          scrollRef.current.scrollTo({ y: Math.max(0, layout.y - 100), animated: true });
        }
      }, 500);

      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.delay(1200),
        Animated.timing(highlightAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start(() => setHighlightedId(null));
      
      // Clean up params
      navigation.setParams({ walletId: null });
    }
  }, [walletId]);

  // Animations
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

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
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[4], { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(slideAnims[4], { toValue: 0, tension: 50, friction: 7, useNativeDriver: Platform.OS !== 'web' })
      ])
    ]).start();
  }, []);

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(fadeAnims[0], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[1], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[2], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[3], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnims[4], { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[0], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[1], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[2], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[3], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnims[4], { toValue: -20, duration: 300, useNativeDriver: Platform.OS !== 'web' })
    ]).start(() => navigation.goBack());
  };

  // Using global formatMoney from utils

  const myAccounts = (accounts || []).filter(a => a.owner === user?.name);
  const partnerAccounts = (accounts || []).filter(a => a.owner && a.owner !== user?.name);

  const totalBalance = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);

  const handleEdit = () => {
    setModalVisible(false);
    navigation.navigate('AddAccount', { account: selectedAccount });
  };

  const confirmDelete = async () => {
    if (selectedAccount) {
      await deleteAccount(selectedAccount.id);
      setModalVisible(false);
      setShowConfirmDelete(false);
    }
  };

  const openActions = (acc) => {
    setSelectedAccount(acc);
    setShowConfirmDelete(false);
    setModalVisible(true);
  };

  const renderWalletItem = (acc, index, isPartner) => (
    <WalletCard 
      key={acc.id} 
      acc={acc} 
      index={index} 
      isPartner={isPartner} 
      theme={theme} 
      formatMoney={formatMoney} 
      onPress={() => !isPartner && openActions(acc)} 
      isHighlighted={highlightedId === acc.id}
      highlightAnim={highlightAnim}
      onLayout={(e) => {
        itemLayouts.current[acc.id] = { y: e.nativeEvent.layout.y + (isPartner ? 400 : 0) }; // Basic offset logic
      }}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Animated.View style={[styles.header, { backgroundColor: theme.background, opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back-ios-new" size={20} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.onSurface }]}>Sumber Dana</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddAccount')} style={styles.headerBtn}>
          <MaterialIcons name="add" size={28} color={theme.primary} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <LinearGradient
            colors={[theme.primary, theme.primary + 'BB']}
            style={styles.summaryCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Total Saldo Gabungan</Text>
                <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>Rp {formatMoney(totalBalance)}</Text>
              </View>
              <View style={styles.summaryIcon}>
                <MaterialIcons name="people" size={32} color="#ffffff" />
              </View>
            </View>
            <View style={styles.summaryFooter}>
               <Text style={styles.summaryFooterText}>Mengelola {accounts.length} akun keuangan bersama</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Daftar Dompet</Text>
            <Text style={{ color: theme.onSurfaceVariant, fontSize: 12 }}>{myAccounts.length} Akun</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          {myAccounts.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.surfaceContainerLow, marginBottom: 24 }]}>
              <MaterialIcons name="person-outline" size={48} color={theme.onSurfaceVariant + '22'} />
              <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>Belum ada dompet pribadi.{"\n"}Tekan + untuk menambah.</Text>
            </View>
          ) : (
            <View style={[styles.accountList, { marginBottom: 32 }]}>
              {myAccounts.map((acc, index) => renderWalletItem(acc, index, false))}
            </View>
          )}

          {partnerAccounts.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Dompet Pasangan</Text>
                <Text style={{ color: theme.onSurfaceVariant, fontSize: 12 }}>Pantauan</Text>
              </View>
              <View style={styles.accountList}>
                {partnerAccounts.map((acc, index) => renderWalletItem(acc, index, true))}
              </View>
            </>
          )}
        </Animated.View>

      </ScrollView>

      {/* Action Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <Animated.View style={[styles.modalContent, { backgroundColor: theme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }]}>
            {!showConfirmDelete ? (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: theme.outlineVariant + '22', paddingBottom: 16 }]}>

                   <View style={[styles.modalIcon, { backgroundColor: (selectedAccount?.color || theme.primary) + '22' }]}>
                      <MaterialIcons name={selectedAccount?.icon || 'payments'} size={24} color={selectedAccount?.color || theme.primary} />
                   </View>
                   <Text style={[styles.modalTitle, { color: theme.onSurface }]}>{selectedAccount?.name}</Text>
                   <Text style={{ color: theme.onSurfaceVariant, fontSize: 12 }}>Kelola Dompet</Text>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
                  <View style={[styles.actionIcon, { backgroundColor: theme.primary + '15' }]}>
                    <MaterialIcons name="edit" size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.actionText, { color: theme.onSurface }]}>Edit Detail & Saldo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { marginBottom: 12 }]} onPress={() => setShowConfirmDelete(true)}>
                  <View style={[styles.actionIcon, { backgroundColor: theme.error + '15' }]}>
                    <MaterialIcons name="delete-outline" size={20} color={theme.error} />
                  </View>
                  <Text style={[styles.actionText, { color: theme.error }]}>Hapus Dompet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: theme.surfaceContainerHighest, marginTop: 12 }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: theme.onSurface, fontWeight: '900' }}>Tutup</Text>
                </TouchableOpacity>

                {/* Account History Section */}
                <View style={{ marginTop: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: theme.onSurface }}>Aktivitas Terakhir</Text>
                    <MaterialIcons name="history" size={20} color={theme.onSurfaceVariant} />
                  </View>
                  
                  {(() => {
                    const filteredTxs = (transactions || []).filter(tx => tx.accountId === selectedAccount?.id).slice(0, 5);
                    if (filteredTxs.length === 0) {
                      return (
                        <View style={{ padding: 32, alignItems: 'center', backgroundColor: theme.surfaceContainerLow, borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.outlineVariant + '44' }}>
                          <Text style={{ color: theme.onSurfaceVariant, fontSize: 13 }}>Belum ada transaksi</Text>
                        </View>
                      );
                    }
                    return filteredTxs.map(tx => (
                      <View key={tx.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant + '11' }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: (tx.type === 'income' ? theme.primary : theme.error) + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                          <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'add' : 'remove')} size={18} color={tx.type === 'income' ? theme.primary : theme.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface }} numberOfLines={1}>{tx.name}</Text>
                          <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>{new Date(tx.date).toLocaleDateString('id-ID')}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: tx.type === 'income' ? theme.primary : theme.error }}>
                          {tx.type === 'income' ? '+' : '-'}Rp {formatMoney((tx.myContrib || 0) + (tx.partnerContrib || 0))}
                        </Text>
                      </View>
                    ));
                  })()}
                </View>
              </>
            ) : (
              <View style={{ padding: 10 }}>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <View style={{ backgroundColor: theme.error + '1A', padding: 24, borderRadius: 40, marginBottom: 16 }}>
                    <MaterialIcons name="warning" size={48} color={theme.error} />
                  </View>
                  <Text style={[styles.modalTitle, { color: theme.onSurface, marginBottom: 12 }]}>Konfirmasi Hapus</Text>
                  <Text style={{ color: theme.onSurfaceVariant, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
                    Hapus "{selectedAccount?.name}"? Semua riwayat transaksi pada dompet ini akan terpengaruh.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: theme.error }]}
                  onPress={confirmDelete}
                >
                  <Text style={{ color: theme.onError, fontWeight: 'bold', fontSize: 16 }}>Ya, Hapus Permanen</Text>

                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: 'transparent' }]}
                  onPress={() => setShowConfirmDelete(false)}
                >
                  <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Kembali</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  content: { padding: 24, paddingBottom: 150 },
  summaryCard: { padding: 28, borderRadius: 36, marginBottom: 40, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { color: '#ffffff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  summaryIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  summaryFooter: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  summaryFooterText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  emptyContainer: { padding: 48, borderRadius: 32, alignItems: 'center', gap: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 22 },
  accountList: { gap: 14 },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 28, gap: 16 },
  iconContainer: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 17, fontWeight: 'bold', letterSpacing: -0.3 },
  accountType: { fontSize: 10, fontWeight: '900', marginTop: 4, letterSpacing: 0.5 },
  accountBalance: { fontSize: 16, fontWeight: '900' },
  infoBox: { flexDirection: 'row', gap: 12, marginTop: 40, padding: 24, borderRadius: 24, alignItems: 'center' },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 28, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { alignItems: 'center', paddingBottom: 24, borderBottomWidth: 1, marginBottom: 12 },
  modalIcon: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 16 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { marginTop: 8, padding: 18, borderRadius: 20, alignItems: 'center' },
  submitBtn: { marginTop: 16, padding: 20, borderRadius: 20, alignItems: 'center' },
});

export default WalletsScreen;

const WalletCard = ({ acc, index, isPartner, theme, formatMoney, onPress, isHighlighted, highlightAnim, onLayout }) => {
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemSlide = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(itemFade, { toValue: 1, duration: 600, delay: index * 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(itemSlide, { toValue: 0, duration: 600, delay: index * 100, useNativeDriver: Platform.OS !== 'web' })
    ]).start();
  }, []);

  return (
    <Animated.View 
      onLayout={onLayout}
      style={{ opacity: itemFade, transform: [{ translateY: itemSlide }] }}
    >
      <Animated.View style={{
        borderRadius: 28,
        backgroundColor: isHighlighted ? 
          highlightAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.surfaceContainerLow, theme.primary + '33'] }) : 
          theme.surfaceContainerLow,
        borderWidth: isHighlighted ? 1 : 0,
        borderColor: theme.primary
      }}>
        <TouchableOpacity
          style={[styles.accountCard, { borderLeftWidth: 4, borderLeftColor: acc.color || theme.primary }]}
          onPress={onPress}
          activeOpacity={isPartner ? 1 : 0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: (acc.color || theme.primary) + '15' }]}>
            <MaterialIcons name={acc.icon || 'account_balance_wallet'} size={26} color={acc.color || theme.primary} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: theme.onSurface }]}>{acc.name}</Text>
            <Text style={[styles.accountType, { color: theme.onSurfaceVariant }]}>
              {isPartner ? `MILIK ${acc.owner?.toUpperCase()}` : acc.type.toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
             <Text style={[styles.accountBalance, { color: theme.onSurface }]}>
               Rp {formatMoney(acc.balance)}
             </Text>
             {isPartner && <MaterialIcons name="lock-outline" size={12} color={theme.onSurfaceVariant} style={{ marginTop: 2 }} />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};
