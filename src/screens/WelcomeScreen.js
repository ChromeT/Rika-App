import React, { useContext, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Text from '../components/ThemeText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const WelcomeScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);

  // Animations
  const fadeAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const slideAnims = useRef([new Animated.Value(20), new Animated.Value(20), new Animated.Value(20), new Animated.Value(20)]).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnims[0], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[0], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[1], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[1], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[2], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[2], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnims[3], { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnims[3], { toValue: 0, tension: 50, friction: 7, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1, justifyContent: 'center', padding: 32, alignItems: 'center' },
    iconBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.primaryContainer, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 32, fontWeight: '900', color: theme.primary, marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, color: theme.onSurfaceVariant, textAlign: 'center', marginBottom: 48, lineHeight: 24 },
    
    btnPrimary: { width: '100%', borderRadius: 24, overflow: 'hidden', marginBottom: 16 },
    gradientPrimary: { paddingVertical: 20, alignItems: 'center' },
    btnPrimaryText: { color: theme.onPrimary, fontSize: 16, fontWeight: 'bold' },
    
    btnSecondary: { width: '100%', paddingVertical: 20, alignItems: 'center', borderRadius: 24, backgroundColor: theme.surfaceContainer, borderWidth: 1, borderColor: theme.outlineVariant + '4D' },
    btnSecondaryText: { color: theme.onSurface, fontSize: 16, fontWeight: 'bold' }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconBg, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
          <MaterialIcons name="favorite" size={48} color={theme.primary} />
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }], alignItems: 'center' }}>
          <Text style={styles.title}>Rika</Text>
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }], alignItems: 'center' }}>
          <Text style={styles.subtitle}>Tempat rahasia kita berdua untuk merencanakan masa depan.</Text>
        </Animated.View>
        
        <Animated.View style={{ width: '100%', opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8} onPress={() => navigation.navigate('CreateRoom')}>
            <LinearGradient colors={[theme.primary, theme.primaryContainer]} style={styles.gradientPrimary} start={{x:0, y:0}} end={{x:1, y:1}}>
              <Text style={styles.btnPrimaryText}>Buat Ruang Finansial Baru</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.8} onPress={() => navigation.navigate('JoinRoom')}>
            <Text style={styles.btnSecondaryText}>Gabung atau Masuk Kembali</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;
