import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export interface CardProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Left accent stripe colour. */
  accentColor?: string;
  padding?: number;
  children: React.ReactNode;
  /**
   * Interactive content (buttons, chips) rendered inside the card surface but
   * *outside* the pressable area. Required for nested controls on a pressable
   * card: on web a pressable card is a `<button>`, and HTML forbids a
   * `<button>` inside a `<button>`.
   */
  footer?: React.ReactNode;
}

/** Elevated surface with an optional slanted accent stripe on the left. */
export function Card({ style, accentColor, padding = spacing.lg, children, footer, onPress, testID, ...rest }: CardProps) {
  const stripe = accentColor ? <View style={[styles.stripe, { backgroundColor: accentColor }]} /> : null;

  if (!onPress) {
    return (
      <View style={[styles.card, { padding }, style]} testID={testID}>
        {stripe}
        {children}
        {footer}
      </View>
    );
  }

  // Pressable surface: only `children` live inside the button. The footer is a
  // sibling in the same visual card, so nested controls stay valid HTML and do
  // not need stopPropagation hacks to avoid triggering the card press.
  return (
    <View style={[styles.card, style]}>
      {stripe}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, { padding }, pressed && styles.pressed]}
        testID={testID}
        {...rest}
      >
        {children}
      </Pressable>
      {footer ? <View style={[styles.footer, { paddingHorizontal: padding, paddingBottom: padding }]}>{footer}</View> : null}
    </View>
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
    left: -27,
    top: -10,
    bottom: -10,
    width: 32,
    transform: [{ skewX: '-12deg' }],
  },
  pressable: { position: 'relative' },
  footer: { position: 'relative' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
