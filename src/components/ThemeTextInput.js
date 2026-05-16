import React, { useContext } from 'react';
import { TextInput as RNTextInput, StyleSheet, Platform } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const ThemeTextInput = React.forwardRef((props, ref) => {
  const { theme } = useContext(ThemeContext);
  
  // Resolve Font Family for Android Weights
  const resolveFont = () => {
    if (Platform.OS !== 'android' || !theme.fontFamily) return { family: theme.fontFamily, weightFix: {} };
    if (['System', 'monospace', 'serif'].includes(theme.fontFamily)) return { family: theme.fontFamily, weightFix: {} };

    const flattened = StyleSheet.flatten(props.style) || {};
    const weight = flattened.fontWeight;
    const isBold = weight === 'bold' || weight === '700' || weight === '800' || weight === '900';
    const isSemiBold = weight === '600' || weight === '500';

    let finalFamily = theme.fontFamily;
    let weightFix = {};

    // Mapping for Plus Jakarta Sans
    if (theme.fontFamily === 'PlusJakartaSans-Regular') {
      if (isBold) {
        finalFamily = 'PlusJakartaSans-ExtraBold';
        weightFix = { fontWeight: 'normal' };
      } else if (isSemiBold) {
        finalFamily = 'PlusJakartaSans-Bold';
        weightFix = { fontWeight: 'normal' };
      }
    } 
    // Mapping for Be Vietnam Pro
    else if (theme.fontFamily === 'BeVietnamPro-Light' || theme.fontFamily === 'BeVietnamPro-Regular') {
      if (isBold || isSemiBold) {
        finalFamily = 'BeVietnamPro-SemiBold';
        weightFix = { fontWeight: 'normal' };
      }
    }

    return { family: finalFamily, weightFix };
  };

  const { family, weightFix } = resolveFont();

  const combinedStyle = [
    { 
      fontFamily: family, 
      color: props.style?.color || theme.onSurface 
    }, 
    props.style,
    weightFix 
  ];

  return (
    <RNTextInput
      ref={ref}
      {...props}
      style={combinedStyle}
      placeholderTextColor={props.placeholderTextColor || theme.onSurfaceVariant}
    />
  );
});

export default ThemeTextInput;
