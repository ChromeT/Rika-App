import React from 'react';
import { View, TouchableOpacity, Animated, Image, ScrollView, Platform, StyleSheet } from 'react-native';
import Text from '../ThemeText';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../../screens/DashboardStyles';
import { getShadow } from '../../utils/styleUtils';

// --- [SUB-KOMPONEN: Header] ---
export const DashboardHeader = ({ avatar, myName, theme, setNotifyVisible, notifications, user, navigation }) => (
  <View style={[styles.header, { backgroundColor: theme.background }]}>
    <View style={styles.headerLeft}>
      <TouchableOpacity onPress={() => navigation.navigate('Couple')} style={styles.avatarWrapper}>
        {avatar?.startsWith('file://') || avatar?.startsWith('data:image') ? (
          <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <MaterialIcons name={avatar || 'person'} size={28} color={theme.primary} />
        )}
      </TouchableOpacity>
      <View>
        <Text style={{ fontSize: 12, color: theme.onSurfaceVariant, fontWeight: 'bold' }}>Halo,</Text>
        <Text style={[styles.headerTitle, { color: theme.onSurface }]}>{myName}</Text>
      </View>
    </View>
    <TouchableOpacity onPress={() => setNotifyVisible(true)} style={styles.notifBtn}>
      <MaterialIcons name="notifications-none" size={26} color={theme.onSurface} />
      {notifications.filter(n => {
        if (!user?.name || !n.sender) return true;
        return n.sender.toLowerCase().trim() !== user.name.toLowerCase().trim();
      }).filter(n => !n.readBy?.includes(user?.name)).length > 0 && (
        <View style={styles.notifBadge}>
          <Text style={{ color: theme.onPrimary, fontSize: 8, fontWeight: '900' }}>
            {notifications.filter(n => {
              if (!user?.name || !n.sender) return true;
              return n.sender.toLowerCase().trim() !== user.name.toLowerCase().trim();
            }).filter(n => !n.readBy?.includes(user?.name)).length}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  </View>
);

// --- [SUB-KOMPONEN: Hero Section] ---
export const HeroSection = ({ theme, filter, formatMoney, getBalance, myName, partnerName, setFilter, animStyle }) => (
  <Animated.View style={animStyle}>
    <LinearGradient colors={[theme.primary, theme.primary + 'AA']} style={styles.heroCard} start={{x:0,y:0}} end={{x:1,y:1}}>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroLabel}>Total Saldo {filter}</Text>
        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>Rp {formatMoney(getBalance(filter))}</Text>
      </View>
      <View style={styles.filterRow}>
        {['Kita', myName, partnerName].filter(Boolean).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filter === f && { color: theme.primary }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  </Animated.View>
);

// --- [SUB-KOMPONEN: Pending Splits] ---
export const PendingSplitsSection = ({ pendingSplits, theme, formatMoney, setSelectedSplitTx, setSplitModalVisible, highlightedId, highlightAnim, animStyle, itemLayouts, sectionLayouts }) => (
  <Animated.View 
    onLayout={(e) => { sectionLayouts.current.pending = e.nativeEvent.layout.y; }}
    style={animStyle.style || animStyle}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <MaterialIcons name="notification-important" size={20} color={theme.primary} />
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.onSurface }}>Butuh Konfirmasi Kamu</Text>
      <View style={{ backgroundColor: theme.error, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{pendingSplits.length}</Text>
      </View>
    </View>
    {pendingSplits.map(tx => (
      <Animated.View 
        key={tx.id} 
        onLayout={(e) => {
          const layout = e.nativeEvent.layout;
          itemLayouts.current[`pending_${tx.id}`] = { localY: layout.y, height: layout.height, section: 'pending' };
        }}
        style={{ 
          backgroundColor: highlightedId === `pending_${tx.id}` ? 
            highlightAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.surfaceContainerLow, theme.primary + '33'] }) : 
            theme.surfaceContainerLow, 
          borderRadius: 24, 
          borderWidth: 1.5, 
          borderColor: highlightedId === `pending_${tx.id}` ? theme.primary : theme.primary + '33',
          marginBottom: 12,
          overflow: 'hidden'
        }}
      >
        <TouchableOpacity 
          onPress={() => {
            setSelectedSplitTx(tx);
            setSplitModalVisible(true);
          }}
          style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.onSurface }}>{tx.name}</Text>
            <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>
              {tx.isJoint ? 'Bagi rata 50:50' : 'Patungan Custom'} • Rp {formatMoney(tx.partnerContrib)}
            </Text>
          </View>
          <View style={{ backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: theme.onPrimary, fontSize: 12, fontWeight: 'bold' }}>Konfirmasi</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    ))}
  </Animated.View>
);

// --- [SUB-KOMPONEN: Wallets Section] ---
export const WalletsSection = ({ accounts, theme, formatMoney, navigation, animStyle, width, sectionLayouts }) => (
  <Animated.View 
    onLayout={(e) => { sectionLayouts.current.wallets = e.nativeEvent.layout.y; }}
    style={animStyle.style || animStyle}
  >
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Dompet Kita</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Wallets')}><Text style={{ color: theme.primary, fontWeight: 'bold' }}>Semua</Text></TouchableOpacity>
    </View>
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.walletScroll}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12 }}
    >
      {accounts.length === 0 ? (
        <TouchableOpacity 
          style={[styles.walletCard, { width: width - 48, height: 90, backgroundColor: theme.surface, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.outline, justifyContent: 'center', gap: 16 }]} 
          onPress={() => navigation.navigate('AddAccount')}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="account-balance-wallet" size={24} color={theme.primary} />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.onSurface }}>Belum ada dompet</Text>
            <Text style={{ fontSize: 12, color: theme.onSurfaceVariant }}>Tap di sini untuk tambah dompet pertama kamu</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <>
          {accounts.map(acc => (
            <TouchableOpacity 
              key={acc.id} 
              style={[styles.walletCard, { backgroundColor: theme.surface, ...getShadow(theme.onSurface, 0.04, 8, { width: 0, height: 4 }, 2) }]} 
              onPress={() => navigation.navigate('Wallets', { walletId: acc.id })}
            >
              <View style={[styles.walletIcon, { backgroundColor: (acc.color || theme.primary) + '15' }]}>
                <MaterialIcons name={acc.icon || 'payments'} size={20} color={acc.color || theme.primary} />
              </View>
              <View>
                <Text style={[styles.walletName, { color: theme.onSurface }]} numberOfLines={1}>{acc.name}</Text>
                <Text style={[styles.walletBalance, { color: theme.primary }]}>Rp {formatMoney(acc.balance)}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={[styles.walletCard, { borderStyle: 'dashed', borderWidth: 1.5, borderColor: theme.outline, backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]} 
            onPress={() => navigation.navigate('AddAccount')}
          >
            <MaterialIcons name="add-circle-outline" size={24} color={theme.onSurfaceVariant} />
            <Text style={{ color: theme.onSurfaceVariant, fontSize: 12, fontWeight: 'bold' }}>Tambah</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  </Animated.View>
);

// --- [SUB-KOMPONEN: Expense Analysis] ---
export const ExpenseAnalysisSection = ({ 
  theme, filter, myName, partnerName, setFilter, timeFilter, setTimeFilter, 
  customStartDate, customEndDate, setShowStartPicker, setShowEndPicker,
  showStartPicker, showEndPicker, setCustomStartDate, setCustomEndDate,
  segments, totalExpense, formatMoney, RADIUS, CIRCUMFERENCE, animStyle, sectionLayouts, isDarkMode
}) => (
  <Animated.View 
    onLayout={(e) => { sectionLayouts.current.expense = e.nativeEvent.layout.y; }}
    style={animStyle.style || animStyle}
  >
    <View style={[
      styles.surfaceCard, 
      { 
        backgroundColor: theme.surface, 
        padding: 24, 
        borderRadius: 32, 
        marginBottom: 24, 
        borderWidth: 1, 
        borderColor: theme.outlineVariant + '33',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDarkMode ? 0.2 : 0.08,
        shadowRadius: 16,
        elevation: 4
      }
    ]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Pengeluaran</Text>
        <View style={{ flexDirection: 'row', backgroundColor: theme.surfaceContainerHighest + '66', padding: 3, borderRadius: 12, borderWidth: 1, borderColor: theme.outlineVariant + '11' }}>
          {['Kita', myName, (partnerName || 'Rika')].map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: filter === f ? theme.primary : 'transparent' }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: filter === f ? theme.onPrimary : theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginHorizontal: -24 }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 8 }}>
          {['Hari ini', 'Minggu ini', 'Bulan ini', 'Tahun ini', 'Semua Waktu', 'Kustom'].map(tf => (
            <TouchableOpacity 
              key={tf} onPress={() => setTimeFilter(tf)} 
              style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: theme.surfaceContainerHighest + '44', borderWidth: 1, borderColor: theme.outlineVariant + '11' }, timeFilter === tf && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <Text style={{ color: timeFilter === tf ? theme.onPrimary : theme.onSurfaceVariant, fontSize: 12, fontWeight: 'bold' }}>{tf}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {timeFilter === 'Kustom' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24, backgroundColor: theme.surfaceContainerHighest + '33', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: theme.outlineVariant + '11' }}>
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS === 'web') document.getElementById('custom-start-date')?.showPicker?.() || document.getElementById('custom-start-date')?.click();
              else setShowStartPicker(true);
            }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.outlineVariant + '22' }}
          >
            <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, fontWeight: 'bold', marginBottom: 2 }}>MULAI</Text>
            <Text style={{ fontSize: 12, color: theme.onSurface, fontWeight: '900' }}>{customStartDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</Text>
          </TouchableOpacity>
          <MaterialIcons name="arrow-forward" size={16} color={theme.outlineVariant} />
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS === 'web') document.getElementById('custom-end-date')?.showPicker?.() || document.getElementById('custom-end-date')?.click();
              else setShowEndPicker(true);
            }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.outlineVariant + '22' }}
          >
            <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, fontWeight: 'bold', marginBottom: 2 }}>SELESAI</Text>
            <Text style={{ fontSize: 12, color: theme.onSurface, fontWeight: '900' }}>{customEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</Text>
          </TouchableOpacity>

          {(showStartPicker || showEndPicker) && Platform.OS !== 'web' && (
            <DateTimePicker
              value={showStartPicker ? customStartDate : customEndDate}
              mode="date" display="default"
              onChange={(event, selectedDate) => {
                setShowStartPicker(false); setShowEndPicker(false);
                if (selectedDate) {
                  if (showStartPicker) setCustomStartDate(selectedDate);
                  else setCustomEndDate(selectedDate);
                }
              }}
            />
          )}
          {Platform.OS === 'web' && (
            <View style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}>
              <input type="date" id="custom-start-date" value={customStartDate.toISOString().split('T')[0]} onChange={(e) => { if (e.target.value) { setCustomStartDate(new Date(e.target.value)); setShowStartPicker(false); } }} />
              <input type="date" id="custom-end-date" value={customEndDate.toISOString().split('T')[0]} onChange={(e) => { if (e.target.value) { setCustomEndDate(new Date(e.target.value)); setShowEndPicker(false); } }} />
            </View>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <View style={{ width: 140, height: 140, position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
          <Svg width="140" height="140" viewBox="0 0 120 120">
            <G rotation={-90} originX={60} originY={60}>
              <Circle cx="60" cy="60" r={RADIUS} stroke={theme.surfaceContainerHighest + '44'} strokeWidth="10" fill="none" />
              {segments.map((seg, i) => {
                let offset = segments.slice(0, i).reduce((s, x) => s + x.dash, 0);
                return <Circle key={i} cx="60" cy="60" r={RADIUS} stroke={seg.color} strokeWidth="10" fill="none" strokeDasharray={`${seg.dash} ${CIRCUMFERENCE}`} strokeDashoffset={-offset} strokeLinecap="round" />;
              })}
            </G>
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: theme.onSurfaceVariant, fontWeight: '900', letterSpacing: 1.5, opacity: 0.9 }}>TOTAL</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: theme.onSurface, marginTop: 2 }}>Rp {formatMoney(totalExpense)}</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          {segments.length === 0 ? (
            <Text style={{ color: theme.onSurfaceVariant, fontSize: 12, fontStyle: 'italic' }}>Belum ada data pengeluaran</Text>
          ) : (
            segments.map((seg, i) => {
              const exactPercentage = (seg.amount / (totalExpense || 1)) * 100;
              const displayPercentage = exactPercentage > 0 && exactPercentage < 1 ? '< 1' : Math.round(exactPercentage);
              return (
                <View key={i} style={{ width: '100%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.onSurface }} numberOfLines={1}>{seg.cat}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: theme.primary }}>{displayPercentage}%</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: theme.surfaceContainerHighest + '44', borderRadius: 2, width: '100%' }}>
                    <View style={{ height: '100%', width: `${Math.max(exactPercentage, 1)}%`, backgroundColor: seg.color, borderRadius: 2 }} />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </View>
  </Animated.View>
);

// --- [SUB-KOMPONEN: Bills Section] ---
export const BillsSection = ({ bills, theme, formatMoney, setSelectedBill, setBillActionModalVisible, highlightedId, highlightAnim, animStyle, itemLayouts, resetBillForm, setBillModalVisible, sectionLayouts }) => (
  <Animated.View 
    onLayout={(e) => { sectionLayouts.current.bills = e.nativeEvent.layout.y; }}
    style={animStyle.style || animStyle}
  >
    <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
      <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Tagihan Mendatang</Text>
      <TouchableOpacity onPress={() => { resetBillForm(); setBillModalVisible(true); }}>
        <View style={{ backgroundColor: theme.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
          <Text style={{ color: theme.primary, fontSize: 11, fontWeight: 'bold' }}>+ Baru</Text>
        </View>
      </TouchableOpacity>
    </View>
    {bills.length === 0 ? (
      <TouchableOpacity 
        onPress={() => setBillModalVisible(true)}
        style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.outlineVariant + '44' }}
      >
        <MaterialIcons name="receipt-long" size={32} color={theme.onSurfaceVariant + '44'} />
        <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, marginTop: 8 }}>Belum ada tagihan terdaftar</Text>
      </TouchableOpacity>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
        {bills.sort((a,b) => {
          const today = new Date(); today.setHours(0,0,0,0);
          const aDate = new Date(a.dueDate); aDate.setHours(0,0,0,0);
          const bDate = new Date(b.dueDate); bDate.setHours(0,0,0,0);
          return (aDate - today) - (bDate - today);
        }).slice(0, 5).map(bill => (
          <Animated.View 
            key={bill.id}
            onLayout={(e) => {
              itemLayouts.current[bill.id] = { localY: e.nativeEvent.layout.y, section: 'bills' }; 
            }}
          >
            <TouchableOpacity 
              onPress={() => { setSelectedBill(bill); setBillActionModalVisible(true); }}
              style={{ 
                backgroundColor: highlightedId === bill.id ? 
                  highlightAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.surface, theme.primary + '33'] }) : 
                  theme.surface, 
                padding: 20, borderRadius: 28, width: 220, marginRight: 16, borderWidth: 1, 
                borderColor: highlightedId === bill.id ? theme.primary : theme.outlineVariant + '11' 
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bill.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name={bill.icon || 'favorite'} size={20} color={bill.color} />
                </View>
                <View style={{ backgroundColor: (() => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const target = new Date(bill.dueDate); target.setHours(0,0,0,0);
                  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                  return diff <= 3 ? '#F43F5E' : theme.primary;
                })() + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ color: (() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const target = new Date(bill.dueDate); target.setHours(0,0,0,0);
                    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                    return diff <= 3 ? '#F43F5E' : theme.primary;
                  })(), fontSize: 10, fontWeight: 'bold' }}>
                    {(() => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const target = new Date(bill.dueDate); target.setHours(0,0,0,0);
                      const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
                      return diff < 0 ? `Terlewat ${Math.abs(diff)}` : `${diff}`;
                    })()} Hari
                  </Text>
                </View>
              </View>
              <Text style={{ color: theme.onSurface, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{bill.name}</Text>
              <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 12, marginTop: 4 }}>Rp {formatMoney(bill.amount)}</Text>
              {bill.type === 'installment' && (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.outlineVariant + '22' }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: theme.onSurfaceVariant }}>TENOR: {bill.currentTenor || 1}/{bill.totalTenor || 1}</Text>
                  <View style={{ height: 3, backgroundColor: theme.surfaceContainer, borderRadius: 2, marginTop: 4 }}>
                    <View style={{ height: '100%', width: `${((bill.currentTenor || 1) / (bill.totalTenor || 1)) * 100}%`, backgroundColor: bill.color, borderRadius: 2 }} />
                  </View>
                </View>
              )}
              {bill.type === 'recurring' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <MaterialIcons name="autorenew" size={10} color={theme.onSurfaceVariant} />
                  <Text style={{ fontSize: 9, color: theme.onSurfaceVariant, fontWeight: 'bold' }}>RUTIN</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    )}
  </Animated.View>
);

// --- [SUB-KOMPONEN: Goals Section] ---
export const GoalsSection = ({ goals, hasPartner, theme, formatMoney, navigation, animStyle, itemLayouts, sectionLayouts }) => (
  <Animated.View 
    onLayout={(e) => { sectionLayouts.current.goals = e.nativeEvent.layout.y; }}
    style={animStyle.style || animStyle}
  >
    <View style={[styles.sectionHeader, { marginBottom: 20 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Goal kita</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ backgroundColor: theme.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '900' }}>{goals.filter(g => !g.achieved).length} AKTIF</Text>
          </View>
          {goals.filter(g => g.achieved).length > 0 && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Goals', { initialTab: 'achieved' })}
              style={{ backgroundColor: '#81C784' + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#81C784' + '33' }}
            >
              <MaterialIcons name="stars" size={10} color="#81C784" />
              <Text style={{ fontSize: 10, color: '#81C784', fontWeight: '900' }}>{goals.filter(g => g.achieved).length} TERCAPAI</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
        <Text style={{ color: theme.onSurfaceVariant, fontWeight: 'bold', fontSize: 13 }}>Lihat Semua</Text>
      </TouchableOpacity>
    </View>

    {!hasPartner ? (
      <View style={{ backgroundColor: theme.surface, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: theme.primary + '33' }}>
        <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>Menunggu Rika bergabung sebelum memulai goal bersama.</Text>
      </View>
    ) : goals.filter(g => !g.achieved).length === 0 ? (
      <TouchableOpacity 
        onPress={() => navigation.navigate('Goals')}
        style={{ backgroundColor: theme.surface, borderRadius: 32, padding: 24, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.outlineVariant + '44' }}
      >
        <MaterialIcons name="favorite" size={32} color={theme.onSurfaceVariant + '44'} />
        <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, marginTop: 8 }}>Belum ada goals aktif</Text>
      </TouchableOpacity>
    ) : (
      goals.filter(g => !g.achieved).slice(0, 3).map((goal, idx) => {
        const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
        return (
          <TouchableOpacity 
            key={goal.id || idx} 
            onLayout={(e) => { itemLayouts.current[goal.id || idx] = { localY: e.nativeEvent.layout.y, section: 'goals' }; }}
            onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
            activeOpacity={0.9}
            style={{ backgroundColor: theme.surface, padding: 14, borderRadius: 30, flexDirection: 'row', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: theme.outlineVariant + '15', shadowColor: theme.onSurface, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
          >
            <View style={{ width: 90, height: 90, borderRadius: 22, overflow: 'hidden', backgroundColor: theme.surfaceContainerHighest, borderWidth: 1, borderColor: theme.outlineVariant + '11' }}>
              {goal.previewImage ? <Image source={{ uri: goal.previewImage }} style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><MaterialIcons name="auto-awesome" size={32} color={theme.primary + '33'} /></View>}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)']} style={StyleSheet.absoluteFill} />
            </View>
            <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: theme.onSurface, flex: 1 }} numberOfLines={1}>{goal.name}</Text>
                <View style={{ backgroundColor: theme.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                   <Text style={{ fontSize: 9, fontWeight: '900', color: theme.primary }}>{Math.round(progress)}%</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                 <MaterialIcons name="flag" size={10} color={theme.onSurfaceVariant} />
                 <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, fontWeight: 'bold' }}>PROGRES GOAL</Text>
              </View>
              <View style={{ height: 6, backgroundColor: theme.surfaceContainerHighest, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                <LinearGradient colors={[theme.primary, theme.primary + '88']} start={{x:0, y:0}} end={{x:1, y:0}} style={{ height: '100%', width: `${progress}%`, borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.onSurfaceVariant }}>Rp</Text>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: theme.primary }}>{formatMoney(goal.currentAmount)}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.onSurfaceVariant }}>/ {formatMoney(goal.targetAmount)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })
    )}
  </Animated.View>
);

// --- [SUB-KOMPONEN: Recent Activities] ---
export const RecentActivitiesSection = ({ filteredTx, theme, filter, myName, partnerName, formatMoney, navigation, openQuickEdit, highlightedId, highlightAnim, animStyle, itemLayouts, sectionLayouts }) => (
  <Animated.View 
    onLayout={(e) => { sectionLayouts.current.recent = e.nativeEvent.layout.y; }}
    style={animStyle.style || animStyle}
  >
    <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
      <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Aktivitas Terakhir</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Riwayat')}><Text style={{ color: theme.primary, fontWeight: 'bold' }}>Lihat</Text></TouchableOpacity>
    </View>
    {filteredTx.length === 0 ? (
      <View style={{ backgroundColor: theme.surfaceContainerLow, borderRadius: 24, padding: 24, alignItems: 'center' }}>
        <MaterialIcons name="history" size={32} color={theme.onSurfaceVariant + '44'} />
        <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, marginTop: 8 }}>Belum ada aktivitas dicatat</Text>
      </View>
    ) : (
      filteredTx.slice(0, 5).map((tx, idx) => (
        <Animated.View 
          key={tx.id || idx} 
          onLayout={(e) => { itemLayouts.current[`recent_${tx.id}`] = { localY: e.nativeEvent.layout.y, section: 'recent' }; }} 
          style={[styles.surfaceCard, { backgroundColor: highlightedId === `recent_${tx.id}` ? highlightAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.surfaceContainerLow, theme.primary + '33'] }) : theme.surfaceContainerLow, marginBottom: 12, borderWidth: 1, borderColor: highlightedId === `recent_${tx.id}` ? theme.primary : theme.outlineVariant + '15', overflow: 'hidden' }]}
        >
          <TouchableOpacity style={styles.txItem} onPress={() => openQuickEdit(tx)}>
            <View style={[styles.txIcon, { backgroundColor: (tx.type === 'income' ? theme.primary : theme.error) + '15' }]}>
              <MaterialIcons name={tx.icon || (tx.type === 'income' ? 'add' : 'remove')} size={20} color={tx.type === 'income' ? theme.primary : theme.error} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.txName, { color: theme.onSurface }]} numberOfLines={1}>{tx.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 10, color: theme.onSurfaceVariant }}>{tx.category} • {tx.isJoint || tx.isPatungan ? 'Kita' : tx.owner}</Text>
              </View>
              {(tx.isJoint || tx.isPatungan) && (
                <Text style={{ fontSize: 8, color: theme.onSurfaceVariant, marginTop: 2 }}>
                  {myName}: {formatMoney(tx.myContrib || 0)} • {partnerName}: {formatMoney(tx.partnerContrib || 0)}
                </Text>
              )}
            </View>
            <Text style={[styles.txAmount, { color: tx.type === 'income' ? theme.primary : theme.error }]}>
              {tx.type === 'income' ? '+' : '-'}Rp {formatMoney(
                filter === 'Kita' 
                ? (tx.myContrib || 0) + (tx.partnerContrib || 0)
                : (filter === myName 
                    ? (tx.owner === myName ? (tx.myContrib || 0) : (tx.partnerContrib || 0))
                    : (tx.owner === myName ? (tx.partnerContrib || 0) : (tx.myContrib || 0))
                  )
              )}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ))
    )}
  </Animated.View>
);
