import { Platform } from 'react-native';

/**
 * Helper to generate shadow styles compatible with iOS, Android, and Web.
 * Resolves the "shadow* style props are deprecated" warning on React Native Web.
 */
export const getShadow = (color, opacity, radius, offset = { width: 0, height: 4 }, elevation = 4) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
    };
  }
  
  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevation,
  };
};
