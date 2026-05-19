import { StyleSheet, Dimensions, Platform } from 'react-native';
import { getShadow } from '../utils/styleUtils';

export const fabActions = [
  { key: 'goals', icon: 'favorite', label: 'Goal baru', color: '#E879F9' },
  { key: 'transfer', icon: 'swap-horiz', label: 'Pindah dana', color: '#6366F1' },
  { key: 'tagihan', icon: 'receipt-long', label: 'Pengingat tagihan', color: '#F59E0B' },
  { key: 'pemasukan', icon: 'add-chart', label: 'Pemasukan', color: '#10B981' },
  { key: 'pengeluaran', icon: 'shopping-bag', label: 'Pengeluaran', color: '#F43F5E' },
];

export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrapper: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  notifBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  notifBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    minWidth: 16, 
    height: 16, 
    borderRadius: 8, 
    backgroundColor: '#F43F5E', 
    borderWidth: 1.5, 
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2
  },
  main: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: Dimensions.get('window').height },

  heroCard: { borderRadius: 36, padding: 28, marginBottom: 24 },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 },
  heroValue: { color: '#ffffff', fontSize: 34, fontWeight: '900', letterSpacing: -1.5 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 24 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterChipActive: { backgroundColor: '#ffffff' },
  filterChipText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  walletScroll: { marginHorizontal: -24, marginTop: 4 },
  surfaceCard: {
    borderRadius: 24,
    ...getShadow('#000', 0.05, 12, { width: 0, height: 4 }, 4),
    backgroundColor: 'transparent',
    elevation: 3,
  },
  walletCard: { 
    width: 160, 
    padding: 16, 
    borderRadius: 24, 
    marginRight: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  walletIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  walletName: { fontSize: 13, fontWeight: 'bold' },
  walletBalance: { fontSize: 11, fontWeight: '900', marginTop: 2 },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 10 },
  txIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txName: { fontSize: 14, fontWeight: 'bold' },
  txAmount: { fontSize: 14, fontWeight: '900' },
  fabContainer: { position: 'absolute', bottom: 115, right: 24, alignItems: 'flex-end' },
  fabMain: { 
    width: 64, height: 64, borderRadius: 24, overflow: 'hidden', elevation: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { shadowColor: '#000' },
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }
    })
  },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fabAction: { position: 'absolute', bottom: 8, right: 0 },
  fabMini: { width: 48, height: 48, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  iconButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  donutCenterLarge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  input: { padding: 16, borderRadius: 16, marginBottom: 12 },
  toastContainer: { position: 'absolute', top: 100, left: 24, right: 24, alignItems: 'center', zIndex: 999 },
  toastContent: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  toastText: { fontSize: 13, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    borderRadius: 32, padding: 24, width: '85%', maxWidth: 340, elevation: 10, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { shadowColor: '#000' },
      web: { boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }
    })
  },
});
