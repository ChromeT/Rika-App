import { useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';

/**
 * A custom hook to manage staggered entry animations (fade and slide up)
 * @param {number} count - The number of animated items
 * @param {number} staggerDuration - The delay between each animation (ms)
 * @param {number} duration - The duration of the fade animation (ms)
 * @param {number} slideDistance - The initial slide distance (px)
 * @returns {object} { fadeAnims, slideAnims, animateOut }
 */
export const useStaggeredEntry = (count = 5, staggerDuration = 100, duration = 600, slideDistance = 20, autoStart = true) => {
  const fadeAnims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  const slideAnims = useRef(Array.from({ length: count }, () => new Animated.Value(slideDistance))).current;

  const animateIn = () => {
    const animations = fadeAnims.map((_, i) =>
      Animated.parallel([
        Animated.timing(fadeAnims[i], {
          toValue: 1,
          duration,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnims[i], {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    Animated.stagger(staggerDuration, animations).start();
  };

  useEffect(() => {
    if (autoStart) {
      animateIn();
    }
  }, [autoStart]);

  const animateOut = (callback) => {
    const animations = fadeAnims.map((_, i) =>
      Animated.parallel([
        Animated.timing(fadeAnims[i], {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnims[i], {
          toValue: -slideDistance,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    Animated.parallel(animations).start(callback);
  };

  return { fadeAnims, slideAnims, animateIn, animateOut };
};
