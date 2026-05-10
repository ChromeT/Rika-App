import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Share, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';

dayjs.extend(relativeTime);

const { width } = Dimensions.get('window');

const CoupleScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { user, householdUsers, householdAvatars, householdData, avatar } = useContext(AuthContext);
  const { getBalance, goals, transactions } = useContext(DataContext);

  const myName = user?.name || 'Saya';
  const partnerName = householdUsers.find(u => u !== myName);
  const hasPartner = !!partnerName;

  const relationshipStart = householdData?.createdAt ? dayjs(householdData.createdAt) : dayjs();
  const daysTogether = dayjs().diff(relationshipStart, 'day');
  const durationText = daysTogether === 0 ? 'Hari Pertama' : `${daysTogether} Hari Bersama`;

  const formatMoney = (val) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val || 0);
  };

  const copyToClipboard = () => {
    Share.share({
      message: `Yuk join ke aplikasi Rika bareng aku! Pake kode rumah tangga ini ya: ${user?.householdId}`,
    });
  };

  const myBalance = getBalance(myName);
  const partnerBalance = hasPartner ? getBalance(partnerName) : 0;
  const totalAssets = myBalance + partnerBalance;

  const renderAvatar = (src, size) => {
    if (src?.startsWith('file://') || src?.startsWith('data:image')) {
      return <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: size / 2.5 }} />;
    }
    return <MaterialIcons name={src || "person"} size={size * 0.6} color={theme.primary} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.onSurface }]}>Ruang Kita</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Couple Card */}
        <View style={[styles.coupleCard, { backgroundColor: theme.surfaceContainerLow }]}>
          <View style={styles.avatarsRow}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarFrame, { borderColor: theme.primary + '33' }]}>
                {renderAvatar(avatar, 80)}
              </View>
              <Text style={[styles.avatarName, { color: theme.onSurface }]}>{myName}</Text>
              <View style={[styles.roleBadge, { backgroundColor: theme.primary + '22' }]}>
                <Text style={[styles.roleText, { color: theme.primary }]}>SAYA</Text>
              </View>
            </View>

            <View style={styles.connectLine}>
              <View style={[styles.heartCircle, { backgroundColor: theme.primary }]}>
                <MaterialIcons name="favorite" size={20} color="#fff" />
              </View>
              <View style={[styles.dashLine, { borderBottomColor: theme.outlineVariant + '44' }]} />
              <Text style={{ position: 'absolute', top: 44, fontSize: 10, fontWeight: 'bold', color: theme.primary, width: 100, textAlign: 'center' }}>
                {durationText}
              </Text>
            </View>

            <View style={styles.avatarContainer}>
              <View style={[styles.avatarFrame, { borderColor: hasPartner ? theme.primaryContainer + '33' : theme.outlineVariant + '33' }]}>
                {hasPartner && householdAvatars[partnerName] 
                  ? renderAvatar(householdAvatars[partnerName], 80)
                  : <MaterialIcons name="person-add" size={40} color={theme.onSurfaceVariant + '44'} />
                }
              </View>
              <Text style={[styles.avatarName, { color: hasPartner ? theme.onSurface : theme.onSurfaceVariant }]}>
                {partnerName || 'Belum Ada'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: hasPartner ? theme.primaryContainer + '22' : theme.surfaceContainerHighest }]}>
                <Text style={[styles.roleText, { color: hasPartner ? theme.primaryContainer : theme.onSurfaceVariant }]}>PASANGAN</Text>
              </View>
            </View>
          </View>

          {!hasPartner && (
            <TouchableOpacity style={[styles.inviteBanner, { backgroundColor: theme.primary + '1A' }]} onPress={copyToClipboard}>
              <MaterialIcons name="info-outline" size={16} color={theme.primary} />
              <Text style={[styles.inviteText, { color: theme.onSurfaceVariant }]}>
                Berikan kode rumah tangga ke pasanganmu untuk terhubung.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Combined Stats */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Kekuatan Finansial</Text>
        <LinearGradient 
          colors={[theme.primary, theme.primaryContainer]} 
          start={{x:0, y:0}} 
          end={{x:1, y:1}} 
          style={styles.statsCard}
        >
          <View>
            <Text style={styles.statsLabel}>TOTAL ASET GABUNGAN</Text>
            <Text style={styles.totalValue}>Rp {formatMoney(totalAssets)}</Text>
          </View>
          <View style={styles.statsIconBg}>
            <MaterialIcons name="account-balance-wallet" size={32} color={theme.onPrimary} />
          </View>
        </LinearGradient>

        <View style={styles.breakdownRow}>
          <View style={[styles.miniStat, { backgroundColor: theme.surfaceContainerLow }]}>
            <Text style={[styles.miniLabel, { color: theme.onSurfaceVariant }]}>MILIK {myName.toUpperCase()}</Text>
            <Text style={[styles.miniValue, { color: theme.onSurface }]}>Rp {formatMoney(myBalance)}</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: theme.surfaceContainerLow }]}>
            <Text style={[styles.miniLabel, { color: theme.onSurfaceVariant }]}>MILIK PASANGAN</Text>
            <Text style={[styles.miniValue, { color: theme.onSurface }]}>Rp {formatMoney(partnerBalance)}</Text>
          </View>
        </View>

        {/* Household Info */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Informasi Rumah Tangga</Text>
        <View style={[styles.infoCard, { backgroundColor: theme.surfaceContainerLow }]}>
          <View style={styles.infoRow}>
            <View>
              <Text style={[styles.infoLabel, { color: theme.onSurfaceVariant }]}>ID RUMAH TANGGA</Text>
              <Text style={[styles.infoValue, { color: theme.onSurface }]}>{user?.householdId}</Text>
            </View>
            <TouchableOpacity style={[styles.copyBtn, { backgroundColor: theme.primary + '22' }]} onPress={copyToClipboard}>
              <MaterialIcons name="share" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.outlineVariant + '22' }]} />
          <View style={styles.infoRow}>
            <View>
              <Text style={[styles.infoLabel, { color: theme.onSurfaceVariant }]}>STATUS KONEKSI</Text>
              <Text style={[styles.infoValue, { color: hasPartner ? '#10B981' : theme.error }]}>
                {hasPartner ? 'Terhubung Aktif' : 'Menunggu Pasangan'}
              </Text>
            </View>
            <MaterialIcons name={hasPartner ? "verified-user" : "hourglass-empty"} size={24} color={hasPartner ? '#10B981' : theme.error} />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.mottoCard, { backgroundColor: theme.primary + '0D', borderColor: theme.primary + '33', borderWidth: 1, borderStyle: 'dashed', marginBottom: 32 }]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="auto-awesome" size={24} color={theme.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.mottoText, { color: theme.onSurface }]}>
            "Gak apa-apa, kita mulai dari awal, ya?"
          </Text>
          <Text style={[styles.mottoAuthor, { color: theme.primary }]}>— SORE</Text>
        </TouchableOpacity>

        {/* Timeline Milestones */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Timeline Kebersamaan</Text>
        <View style={[styles.timelineCard, { backgroundColor: theme.surfaceContainerLow }]}>
          {(() => {
            const milestones = [
              { title: 'Perjalanan Dimulai', date: relationshipStart, icon: 'auto-awesome', color: theme.primary, desc: 'Kalian resmi memulai petualangan di Rika App.' },
            ];

            // Achieved goals
            const achievedGoals = goals.filter(g => g.status === 'achieved').sort((a,b) => new Date(a.achievedAt) - new Date(b.achievedAt));
            if (achievedGoals.length > 0) {
              milestones.push({
                title: 'Kemenangan Pertama',
                date: dayjs(achievedGoals[0].achievedAt),
                icon: 'emoji-events',
                color: '#FFB800',
                desc: `Hore! Goal "${achievedGoals[0].name}" berhasil kalian capai bersama.`
              });
            }

            // High assets
            if (totalAssets > 5000000) {
              milestones.push({ title: 'Kekuatan Finansial', date: dayjs(), icon: 'account-balance', color: '#10B981', desc: 'Wow! Total aset kalian sudah menembus angka Rp 5.000.000.' });
            }

            // Future Roadmap
            const futureGoals = goals.filter(g => g.status !== 'achieved' && g.targetDate).sort((a,b) => new Date(a.targetDate) - new Date(b.targetDate));
            futureGoals.forEach(g => {
              milestones.push({
                title: g.name,
                date: dayjs(g.targetDate),
                icon: 'rocket_launch',
                color: theme.primary,
                desc: `Target Roadmap: Rencana pencapaian goal ini.`,
              });
            });

            return milestones.sort((a,b) => b.date - a.date).map((m, idx) => (
              <View key={idx} style={styles.milestoneItem}>
                <View style={styles.milestoneLeft}>
                  <View style={[styles.milestoneIconBg, { backgroundColor: m.color + '22' }]}>
                    <MaterialIcons name={m.icon} size={18} color={m.color} />
                  </View>
                  {idx !== milestones.length - 1 && <View style={[styles.milestoneLine, { backgroundColor: theme.outlineVariant + '44' }]} />}
                </View>
                <View style={styles.milestoneRight}>
                  <View style={styles.milestoneHeader}>
                    <Text style={[styles.milestoneTitle, { color: theme.onSurface }]}>{m.title}</Text>
                    <Text style={[styles.milestoneDate, { color: theme.onSurfaceVariant }]}>{m.date.format('DD MMM YY')}</Text>
                  </View>
                  <Text style={[styles.milestoneDesc, { color: theme.onSurfaceVariant }]}>{m.desc}</Text>
                </View>
              </View>
            ));
          })()}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  coupleCard: { borderRadius: 32, padding: 24, marginBottom: 24 },
  avatarsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarContainer: { alignItems: 'center', flex: 1 },
  avatarFrame: { 
    width: 90, 
    height: 90, 
    borderRadius: 36, 
    borderWidth: 3, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
    overflow: 'hidden'
  },
  avatarName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleText: { fontSize: 9, fontWeight: '900' },
  connectLine: { flex: 1, alignItems: 'center', position: 'relative' },
  heartCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  dashLine: { position: 'absolute', top: 18, width: '100%', borderBottomWidth: 2, borderStyle: 'dashed' },
  inviteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, padding: 12, borderRadius: 12 },
  inviteText: { fontSize: 10, fontWeight: '500', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
  statsCard: { borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  totalValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  statsIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  breakdownRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  miniStat: { flex: 1, padding: 16, borderRadius: 20 },
  miniLabel: { fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  miniValue: { fontSize: 13, fontWeight: 'bold' },
  infoCard: { borderRadius: 24, padding: 20, marginBottom: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  copyBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, marginVertical: 16 },
  mottoCard: { padding: 24, borderRadius: 24, alignItems: 'center' },
  mottoText: { textAlign: 'center', fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 12 },
  mottoAuthor: { fontSize: 11, fontWeight: 'bold' },
  
  timelineCard: { borderRadius: 28, padding: 24, marginBottom: 40 },
  milestoneItem: { flexDirection: 'row', gap: 16 },
  milestoneLeft: { alignItems: 'center' },
  milestoneIconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  milestoneLine: { width: 2, flex: 1, marginVertical: 4 },
  milestoneRight: { flex: 1, paddingBottom: 24 },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  milestoneTitle: { fontSize: 14, fontWeight: 'bold' },
  milestoneDate: { fontSize: 10, fontWeight: '500' },
  milestoneDesc: { fontSize: 11, lineHeight: 16 },
});

export default CoupleScreen;
