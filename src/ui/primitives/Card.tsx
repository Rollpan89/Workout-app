import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export interface CardProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Left accent stripe colour. */
  accentColor?: string;
  padding?: number;
  children: React.ReactNode;
}

/** Elevated surface with an optional slanted accent stripe on the left. */
export function Card({ style, accentColor, padding = spacing.lg, children, onPress, ...rest }: CardProps) {
  const body = (
    <View style={[styles.card, { padding }, style]}>
      {accentColor ? <View style={[styles.stripe, { backgroundColor: accentColor }]} /> : null}
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
      {...rest}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  stripe: {
    position: 'absolute',
    left: -6,
    top: -10,
    bottom: -10,
    width: 12,
    transform: [{ skewX: '-12deg' }],
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
