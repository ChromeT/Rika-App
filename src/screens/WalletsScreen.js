import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { DataContext } from '../context/DataContext';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const WalletsScreen = () => {
  const navigation = useNavigation();
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { accounts, deleteAccount } = useContext(DataContext);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const formatMoney = (v) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v || 0);

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.onSurface }]}>Semua Dompet</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddAccount')}>
          <MaterialIcons name="add" size={28} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary Card */}
        <LinearGradient
          colors={[theme.primary, theme.primary + 'CC']}
          style={styles.summaryCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.summaryLabel}>Total Kekayaan Kita</Text>
          <Text style={styles.summaryValue}>Rp {formatMoney(totalBalance)}</Text>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Dompet Saya</Text>
        
        {myAccounts.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.surfaceContainerLow, marginBottom: 24 }]}>
            <MaterialIcons name="person-outline" size={32} color={theme.onSurfaceVariant + '44'} />
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>Kamu belum punya dompet pribadi.</Text>
          </View>
        ) : (
          <View style={[styles.accountList, { marginBottom: 24 }]}>
            {myAccounts.map((acc) => (
              <TouchableOpacity 
                key={acc.id} 
                style={[styles.accountCard, { backgroundColor: theme.surfaceContainerLow }]}
                onPress={() => openActions(acc)}
              >
                <View style={[styles.iconContainer, { backgroundColor: acc.color + '22' }]}>
                  <MaterialIcons name={acc.icon || 'payments'} size={24} color={acc.color || theme.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: theme.onSurface }]}>{acc.name}</Text>
                  <Text style={[styles.accountType, { color: theme.onSurfaceVariant }]}>
                    {acc.type.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.accountBalance, { color: theme.onSurface }]}>
                  Rp {formatMoney(acc.balance)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {partnerAccounts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Dompet Pribadi Pasangan</Text>
            <View style={styles.accountList}>
              {partnerAccounts.map((acc) => (
                <View 
                  key={acc.id} 
                  style={[styles.accountCard, { backgroundColor: theme.surfaceContainerLow, opacity: 0.8 }]}
                >
                  <View style={[styles.iconContainer, { backgroundColor: acc.color + '22' }]}>
                    <MaterialIcons name={acc.icon || 'payments'} size={24} color={acc.color || theme.primary} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: theme.onSurface }]}>{acc.name}</Text>
                    <Text style={[styles.accountType, { color: theme.onSurfaceVariant }]}>
                      MILIK {acc.owner?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.accountBalance, { color: theme.onSurface }]}>
                    Rp {formatMoney(acc.balance)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {accounts.length === 0 && (
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: theme.primary, marginTop: 20 }]}
            onPress={() => navigation.navigate('AddAccount')}
          >
            <Text style={{ color: theme.onPrimary, fontWeight: 'bold', textAlign: 'center' }}>Tambah Dompet Pertama</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={16} color={theme.onSurfaceVariant} />
          <Text style={[styles.infoText, { color: theme.onSurfaceVariant }]}>
            Kamu hanya bisa mengelola dompet milikmu sendiri. Dompet pasangan hanya untuk pantauan bersama.
          </Text>
        </View>
      </ScrollView>

      {/* Action Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View onStartShouldSetResponder={() => true} style={{ width: '100%' }}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              
              {!showConfirmDelete ? (
                <>
                  <Text style={[styles.modalTitle, { color: theme.onSurface }]}>{selectedAccount?.name}</Text>
                  
                  <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
                    <MaterialIcons name="edit" size={20} color={theme.primary} />
                    <Text style={[styles.actionText, { color: theme.onSurface }]}>Edit Saldo / Nama</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, { borderBottomWidth: 0 }]} onPress={() => setShowConfirmDelete(true)}>
                    <MaterialIcons name="delete" size={20} color={theme.error} />
                    <Text style={[styles.actionText, { color: theme.error }]}>Hapus Dompet</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.cancelBtn, { backgroundColor: theme.surfaceContainerHighest }]} 
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={{ color: theme.onSurface, fontWeight: 'bold' }}>Batal</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ backgroundColor: theme.error + '1A', padding: 16, borderRadius: 32, marginBottom: 12 }}>
                      <MaterialIcons name="warning" size={32} color={theme.error} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.onSurface, marginBottom: 8 }]}>Hapus Dompet?</Text>
                    <Text style={{ color: theme.onSurfaceVariant, textAlign: 'center', fontSize: 13 }}>
                      Apakah kamu yakin ingin menghapus "{selectedAccount?.name}"? Tindakan ini tidak bisa dibatalkan.
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.submitBtn, { backgroundColor: theme.error }]} 
                    onPress={confirmDelete}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Ya, Hapus Sekarang</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.cancelBtn, { backgroundColor: 'transparent' }]} 
                    onPress={() => setShowConfirmDelete(false)}
                  >
                    <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Batal</Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  content: { padding: 20, paddingBottom: 100 },
  summaryCard: { padding: 24, borderRadius: 32, marginBottom: 32, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyContainer: { padding: 40, borderRadius: 32, alignItems: 'center', gap: 16 },
  emptyText: { textAlign: 'center', fontSize: 14 },
  addBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  accountList: { gap: 12 },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, gap: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: 'bold' },
  accountType: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  accountBalance: { fontSize: 15, fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', gap: 8, marginTop: 32, padding: 16, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 32, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', gap: 12 },
  actionText: { fontSize: 16, fontWeight: '500' },
  cancelBtn: { marginTop: 12, padding: 16, borderRadius: 16, alignItems: 'center' },
  submitBtn: { marginTop: 16, padding: 18, borderRadius: 16, alignItems: 'center' },
});

export default WalletsScreen;
