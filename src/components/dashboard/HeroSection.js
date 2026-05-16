import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import Text from '../ThemeText';
import { LinearGradient } from 'expo-linear-gradient';

export const HeroSection = ({ theme, filter, formatMoney, getBalance, myName, partnerName, setFilter, animStyle, styles }) => (
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
