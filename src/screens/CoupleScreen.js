import React, { useContext, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Share, Alert, Animated, Platform, ActivityIndicator } from 'react-native';
import Text from '../components/ThemeText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';

import { formatMoney } from '../utils/formatUtils';

dayjs.extend(relativeTime);

const { width } = Dimensions.get('window');

const CoupleScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { user, householdUsers, householdAvatars, householdData, avatar, updateAnniversaryDate } = useContext(AuthContext);
  const { getBalance, goals, transactions } = useContext(DataContext);

  const [showAllRoadmap, setShowAllRoadmap] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef(null);

  // Animations
  const fadeAnims = React.useRef([
    new Animated.Value(0), // Header
    new Animated.Value(0), // Couple Card
    new Animated.Value(0), // Stats Section
    new Animated.Value(0), // Info Section
    new Animated.Value(0), // Timeline Section
  ]).current;

  const slideAnims = React.useRef([
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
  ]).current;

  React.useEffect(() => {
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

  const myName = user?.name || 'Saya';
  const partnerName = (householdUsers || []).find(u => u !== myName);
  const hasPartner = !!partnerName;

  const getDurationText = (startDate) => {
    const start = dayjs(startDate);
    const now = dayjs();
    const years = now.diff(start, 'year');
    const months = now.diff(start.add(years, 'year'), 'month');
    const days = now.diff(start.add(years, 'year').add(months, 'month'), 'day');

    if (years > 0) {
      return `${years} Thn ${months} Bln Bersama`;
    } else if (months > 0) {
      return `${months} Bln ${days} Hari Bersama`;
    } else {
      return days === 0 ? 'Hari Pertama' : `${days} Hari Bersama`;
    }
  };

  const relationshipStart = (householdData?.anniversaryDate || householdData?.createdAt) 
    ? dayjs(householdData.anniversaryDate || householdData.createdAt) 
    : dayjs();
  const durationText = getDurationText(relationshipStart);

  const handleEditAnniversary = () => {
    if (Platform.OS === 'web') {
      if (dateInputRef.current?.showPicker) {
        try { dateInputRef.current.showPicker(); } catch (e) {}
      } else {
        dateInputRef.current?.click();
      }
    } else {
      setShowDatePicker(true);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      updateAnniversaryDate(selectedDate.toISOString());
      Alert.alert('Berhasil', 'Hari bersama kita telah diperbarui.');
    }
  };



  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(user?.householdId || '');
      Alert.alert('Tersalin!', 'ID Rumah Tangga sudah disalin ke clipboard.');
    } catch (e) {
      Alert.alert('Gagal', 'Tidak dapat menyalin ID.');
    }
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: theme.surface, opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <MaterialIcons name="close" size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.onSurface }]}>Ruang Kita</Text>
        <View style={{ width: 40 }} />
      </Animated.View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Couple Card */}
        <Animated.View style={[styles.coupleCard, { backgroundColor: theme.surfaceContainerLow, opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }]}>
          {/* Background Decorative Glows */}
          <View style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: theme.primary + '10' }} />
          <View style={{ position: 'absolute', bottom: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: theme.primaryContainer + '10' }} />
          
          <View style={styles.avatarsRow}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarFrame, { borderColor: theme.primary + '44', backgroundColor: theme.surfaceContainer }]}>
                {renderAvatar(avatar, 84)}
                <View style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primary, borderWidth: 3, borderColor: theme.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="person" size={12} color="#fff" />
                </View>
              </View>
              <Text style={[styles.avatarName, { color: theme.onSurface, marginTop: 8 }]}>{myName}</Text>
              <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.roleText, { color: theme.primary }]}>{myName.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.connectLine}>
              <View style={[styles.dashLine, { borderBottomColor: theme.outlineVariant + '33' }]} />
              <View style={[styles.heartCircle, { backgroundColor: theme.primary, shadowColor: theme.primary, shadowRadius: 10, shadowOpacity: 0.5, elevation: 8 }]}>
                <MaterialIcons name="favorite" size={20} color="#fff" />
              </View>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={handleEditAnniversary}
                style={{ marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: theme.primary + '10' }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.primary, textAlign: 'center' }}>
                  {durationText.toUpperCase()}
                </Text>
                {Platform.OS === 'web' && (
                  <input 
                    ref={dateInputRef}
                    type="date" 
                    value={relationshipStart.format('YYYY-MM-DD')}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateAnniversaryDate(new Date(e.target.value).toISOString());
                      }
                    }}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                )}
              </TouchableOpacity>
              {Platform.OS !== 'web' && showDatePicker && (
                <DateTimePicker
                  value={relationshipStart.toDate()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={onDateChange}
                />
              )}
            </View>

            <View style={styles.avatarContainer}>
              <View style={[styles.avatarFrame, { borderColor: hasPartner ? theme.primaryContainer + '44' : theme.outlineVariant + '22', backgroundColor: theme.surfaceContainer }]}>
                {hasPartner && householdAvatars[partnerName] 
                  ? renderAvatar(householdAvatars[partnerName], 84)
                  : <MaterialIcons name="person-add" size={40} color={theme.onSurfaceVariant + '33'} />
                }
                {hasPartner && (
                  <View style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primaryContainer, borderWidth: 3, borderColor: theme.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialIcons name="favorite" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[styles.avatarName, { color: hasPartner ? theme.onSurface : theme.onSurfaceVariant, marginTop: 8 }]}>
                {partnerName || 'Belum Ada'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: hasPartner ? theme.primaryContainer + '15' : theme.surfaceContainerHighest }]}>
                <Text style={[styles.roleText, { color: hasPartner ? theme.primaryContainer : theme.onSurfaceVariant }]}>PASANGAN</Text>
              </View>
            </View>
          </View>

          {!hasPartner && (
            <TouchableOpacity style={[styles.inviteBanner, { backgroundColor: theme.primary + '0D', marginTop: 16 }]} onPress={copyToClipboard}>
              <MaterialIcons name="auto-fix-high" size={16} color={theme.primary} />
              <Text style={[styles.inviteText, { color: theme.onSurfaceVariant, fontSize: 11 }]}>
                Berikan kode rumah tangga ke pasanganmu untuk terhubung.
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
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
              <Text style={[styles.miniLabel, { color: theme.onSurfaceVariant }]}>MILIK {(partnerName || 'Pasangan').toUpperCase()}</Text>
              <Text style={[styles.miniValue, { color: theme.onSurface }]}>Rp {formatMoney(partnerBalance)}</Text>
            </View>
          </View>
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: theme.onSurface, marginBottom: 0 }]}>Informasi Rumah Tangga</Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: theme.primary + '15' }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: theme.primary, letterSpacing: 1 }}>OFFICIAL HOUSEHOLD</Text>
            </View>
          </View>
          
          <View style={[styles.infoCard, { backgroundColor: theme.surfaceContainerLow, overflow: 'hidden' }]}>
            {/* Decorative Background Element */}
            <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: theme.primary + '08' }} />
            
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={copyToClipboard}
              style={styles.infoRow}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="vpn-key" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: theme.onSurfaceVariant, fontSize: 10, letterSpacing: 0.5 }]}>ID RUMAH TANGGA</Text>
                  <Text style={[styles.infoValue, { color: theme.onSurface, fontSize: 18, fontWeight: '800' }]}>{user?.householdId}</Text>
                </View>
              </View>
              <MaterialIcons name="content-copy" size={18} color={theme.onSurfaceVariant + '66'} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outlineVariant + '15', marginVertical: 16 } ]} />

            <View style={styles.infoRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: (hasPartner ? '#10B981' : theme.error) + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name={hasPartner ? "verified" : "sync"} size={22} color={hasPartner ? '#10B981' : theme.error} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: theme.onSurfaceVariant, fontSize: 10, letterSpacing: 0.5 }]}>STATUS KONEKSI</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.infoValue, { color: hasPartner ? '#10B981' : theme.error, fontSize: 15, fontWeight: '700' }]}>
                      {hasPartner ? 'Terhubung Aktif' : 'Menunggu Pasangan'}
                    </Text>
                    {hasPartner && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />}
                  </View>
                </View>
              </View>
              {!hasPartner && <ActivityIndicator size="small" color={theme.error} />}
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
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnims[4], transform: [{ translateY: slideAnims[4] }] }}>
          <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Timeline Kebersamaan</Text>
          <View style={{ paddingBottom: 60 }}>
            {(() => {
              const now = dayjs();
              const safeGoals = Array.isArray(goals) ? goals : [];
              const safeTx = Array.isArray(transactions) ? transactions : [];
              
              const getGoalStatusInfo = (g) => {
                const target = Number(g.targetAmount) || 0;
                const current = Number(g.currentAmount) || 0;
                const progress = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
                const isGoalAchieved = g.status === 'achieved' || g.achieved === true;

                if (isGoalAchieved) return { icon: 'stars', color: '#FFB800', badge: 'Terwujud', type: 'ACHIEVED', progress };
                if (progress >= 100) return { icon: 'flag', color: '#10B981', badge: 'Siap Lunas', type: 'READY', progress };
                if (progress > 0) return { icon: 'donut-large', color: theme.primary, badge: `Berjalan ${progress.toFixed(0)}%`, type: 'PROGRESS', progress };
                return { icon: 'lightbulb', color: theme.onSurfaceVariant, badge: 'Rencana Baru', type: 'NEW', progress };
              };

              const pastMilestones = [
                { 
                  title: 'Awal Kisah Kita', 
                  date: (relationshipStart && relationshipStart.isValid()) ? relationshipStart : now, 
                  icon: 'favorite', 
                  color: theme.primary, 
                  desc: 'Momen pertama kita resmi terhubung dan mulai berpetualang di Rika.', 
                  type: 'SYSTEM' 
                },
              ];

              safeGoals.filter(g => g.status === 'achieved' || g.achieved === true).forEach(g => {
                const info = getGoalStatusInfo(g);
                const gDate = dayjs(g.achievedAt || g.createdAt);
                pastMilestones.push({
                  id: g.id,
                  title: `Goal Terwujud: ${g.name}`,
                  date: gDate.isValid() ? gDate : now,
                  icon: info.icon,
                  color: info.color,
                  desc: `Satu mimpi berhasil kita wujudkan. Kebanggaan yang tak terlupakan!`,
                  type: 'ACHIEVED',
                  badge: info.badge
                });
              });

              if (Number(totalAssets) > 5000000) {
                const latestTxDate = safeTx.length > 0 ? dayjs(safeTx[0].date) : now;
                pastMilestones.push({ 
                  title: 'Benteng Keuangan: 5 Juta!', 
                  date: latestTxDate.isValid() ? latestTxDate : now, 
                  icon: 'shield', 
                  color: '#10B981', 
                  desc: 'Aset gabungan kita menembus 5 Juta. Fondasi masa depan makin kohkoh!', 
                  type: 'SYSTEM' 
                });
              }

              const roadmapItems = safeGoals
                .filter(g => g.status !== 'achieved' && g.achieved !== true && g.targetDate)
                .sort((a,b) => {
                  const dateA = dayjs(a.targetDate);
                  const dateB = dayjs(b.targetDate);
                  return (dateA.isValid() ? dateA.valueOf() : 0) - (dateB.isValid() ? dateB.valueOf() : 0);
                })
                .map(g => {
                  const info = getGoalStatusInfo(g);
                  const tDate = dayjs(g.targetDate);
                  return {
                    id: g.id,
                    title: g.name,
                    date: tDate.isValid() ? tDate : now,
                    icon: info.icon,
                    color: info.color,
                    desc: g.description || `Target Roadmap: Rencana pencapaian goal ini.`,
                    isFuture: true,
                    badge: info.badge,
                    progress: info.progress,
                    type: info.type
                  };
                });

              const renderMilestone = (m, idx, list) => (
                <TouchableOpacity 
                  key={m.id || idx} 
                  activeOpacity={0.7}
                  onPress={() => m.id && navigation.navigate('GoalDetail', { goalId: m.id })}
                  style={styles.milestoneItem}
                >
                  <View style={styles.milestoneLeft}>
                    <View style={[styles.milestoneIconBg, { backgroundColor: (m.color || theme.primary) + (m.isFuture ? '11' : '22'), borderWidth: m.isFuture ? 1 : 0, borderColor: (m.color || theme.primary) + '44' }]}>
                      <MaterialIcons name={m.icon} size={18} color={m.color || theme.primary} />
                    </View>
                    {idx !== list.length - 1 && (
                      <View style={[
                        styles.milestoneLine, 
                        { backgroundColor: m.isFuture ? 'transparent' : theme.outlineVariant + '44' },
                        m.isFuture && { borderLeftWidth: 2, borderLeftColor: theme.outlineVariant + '44', borderStyle: 'dashed' }
                      ]} />
                    )}
                  </View>
                  <View style={styles.milestoneRight}>
                    <View style={styles.milestoneHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.milestoneTitle, { color: theme.onSurface }]} numberOfLines={1}>{m.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.miniBadge, { backgroundColor: (m.color || theme.primary) + '1A' }]}>
                            <Text style={[styles.miniBadgeText, { color: m.color || theme.primary }]}>{m.badge || (m.isFuture ? 'ROADMAP' : 'MEMORI')}</Text>
                          </View>
                          <Text style={[styles.milestoneDate, { color: theme.onSurfaceVariant }]}>{m.date && m.date.isValid() ? m.date.format('DD-MM-YYYY') : '-'}</Text>
                        </View>
                      </View>
                    </View>
                    
                    {m.progress !== undefined && !isNaN(m.progress) && m.type !== 'ACHIEVED' && (
                      <View style={styles.miniProgressContainer}>
                        <View style={[styles.miniProgressBar, { backgroundColor: theme.surfaceContainerHighest }]}>
                          <View style={[styles.miniProgressFill, { width: `${Math.min(100, Math.max(0, m.progress))}%`, backgroundColor: m.color || theme.primary }]} />
                        </View>
                      </View>
                    )}

                    <Text style={[styles.milestoneDesc, { color: theme.onSurfaceVariant }]} numberOfLines={2}>{m.desc}</Text>
                  </View>
                </TouchableOpacity>
              );

              const sortedPast = [...pastMilestones].sort((a, b) => {
                const valA = a.date && a.date.isValid() ? a.date.valueOf() : 0;
                const valB = b.date && b.date.isValid() ? b.date.valueOf() : 0;
                return valB - valA;
              });

              const visibleRoadmap = showAllRoadmap ? roadmapItems : roadmapItems.slice(0, 3);
              const visiblePast = showAllHistory ? sortedPast : sortedPast.slice(0, 3);

              return (
                <>
                  {roadmapItems.length > 0 && (
                    <View style={{ marginBottom: 24 }}>
                      <View style={styles.roadmapHeader}>
                        <MaterialIcons name="flight-takeoff" size={16} color={theme.primary} />
                        <Text style={[styles.roadmapHeaderText, { color: theme.primary }]}>ROADMAP MASA DEPAN</Text>
                      </View>
                      <View style={[styles.timelineCard, { backgroundColor: theme.surfaceContainerLow, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.primary + '33' }]}>
                        {visibleRoadmap.map((m, idx) => renderMilestone(m, idx, visibleRoadmap))}
                        {roadmapItems.length > 3 && (
                          <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllRoadmap(!showAllRoadmap)}>
                            <Text style={[styles.showMoreText, { color: theme.primary }]}>
                              {showAllRoadmap ? 'Ringkas Roadmap' : `Lihat ${roadmapItems.length - 3} Goal Lainnya`}
                            </Text>
                            <MaterialIcons name={showAllRoadmap ? "expand-less" : "expand-more"} size={18} color={theme.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                  <View>
                    <View style={styles.roadmapHeader}>
                      <MaterialIcons name="history" size={16} color={theme.onSurfaceVariant} />
                      <Text style={[styles.roadmapHeaderText, { color: theme.onSurfaceVariant }]}>JEJAK KENANGAN</Text>
                    </View>
                    <View style={[styles.timelineCard, { backgroundColor: theme.surfaceContainerLow }]}>
                      {visiblePast.map((m, idx) => renderMilestone(m, idx, visiblePast))}
                      {sortedPast.length > 3 && (
                        <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllHistory(!showAllHistory)}>
                          <Text style={[styles.showMoreText, { color: theme.onSurfaceVariant }]}>
                            {showAllHistory ? 'Tutup Kotak Kenangan' : `Buka ${sortedPast.length - 3} Kenangan Lainnya`}
                          </Text>
                          <MaterialIcons name={showAllHistory ? "expand-less" : "expand-more"} size={18} color={theme.onSurfaceVariant} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </>
              );
            })()}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
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
  heartCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  dashLine: { position: 'absolute', top: 20, width: '100%', borderBottomWidth: 2, borderStyle: 'dashed' },
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
  infoCard: { borderRadius: 24, padding: 20, marginBottom: 20, position: 'relative' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  copyBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, marginVertical: 16 },
  mottoCard: { padding: 24, borderRadius: 24, alignItems: 'center' },
  mottoText: { textAlign: 'center', fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 12 },
  mottoAuthor: { fontSize: 11, fontWeight: 'bold' },
  
  roadmapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 8 },
  roadmapHeaderText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

  timelineCard: { borderRadius: 28, padding: 24, marginBottom: 12 },
  milestoneItem: { flexDirection: 'row', gap: 16 },
  milestoneLeft: { alignItems: 'center' },
  milestoneIconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  milestoneLine: { width: 2, flex: 1, marginVertical: 4 },
  milestoneRight: { flex: 1, paddingBottom: 24 },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  milestoneTitle: { fontSize: 14, fontWeight: 'bold' },
  milestoneDate: { fontSize: 10, fontWeight: '500' },
  milestoneDesc: { fontSize: 11, lineHeight: 16 },

  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  miniBadgeText: { fontSize: 8, fontWeight: '900' },
  miniProgressContainer: { marginVertical: 6 },
  miniProgressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  showMoreText: { fontSize: 11, fontWeight: 'bold' },
});

export default CoupleScreen;
