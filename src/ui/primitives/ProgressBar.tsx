import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, SLANT } from '@/theme';

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  /** Thick by default – a design signature. */
  height?: number;
  /** Slant the ends like the rest of the UI. */
  slanted?: boolean;
  /** Animate changes (disable for the fast rep counter). */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Draw tick marks at every `segments`th – e.g. one per set. */
  segments?: number;
}

export function ProgressBar({
  progress,
  color = colors.red,
  trackColor = colors.surfaceHigh,
  height = 14,
  slanted = true,
  animated = true,
  style,
  segments,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.value = animated ? withTiming(clamped, { duration: 250 }) : clamped;
  }, [clamped, animated, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        styles.track,
        { height, backgroundColor: trackColor, transform: slanted ? [{ skewX: SLANT }] : undefined },
        style,
      ]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
      {segments && segments > 1
        ? Array.from({ length: segments - 1 }, (_, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[styles.tick, { left: `${((i + 1) / segments) * 100}%` }]}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 2,
  },
  fill: {
    height: '100%',
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.bg,
  },
});
