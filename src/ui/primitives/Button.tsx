import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/adapters/haptics/haptics';
import { colors, onAccent, radius, SLANT, spacing } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'rest';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Slanted parallelogram shape (default) or rounded pill. */
  shape?: 'slant' | 'pill';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
  /** Override the fill colour (primary variant); text colour adapts for contrast. */
  color?: string;
}

const VARIANT_BG: Record<ButtonVariant, string> = {
  primary: colors.red,
  secondary: colors.surfaceHigh,
  ghost: 'transparent',
  danger: colors.redDeep,
  rest: colors.rest,
};

const VARIANT_FG: Record<ButtonVariant, string> = {
  primary: colors.textOnAccent,
  secondary: colors.text,
  ghost: colors.textMuted,
  danger: colors.textOnAccent,
  rest: colors.textOnAccent,
};

const SIZE: Record<ButtonSize, { h: number; px: number; font: 'labelSmall' | 'label' | 'h3' | 'h2' }> = {
  sm: { h: 36, px: spacing.md, font: 'labelSmall' },
  md: { h: 48, px: spacing.lg, font: 'label' },
  lg: { h: 60, px: spacing.xl, font: 'h3' },
  xl: { h: 76, px: spacing.xxl, font: 'h2' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  shape = 'slant',
  fullWidth,
  icon,
  style,
  disabled,
  hapticFeedback = true,
  color,
  onPress,
  ...rest
}: ButtonProps) {
  const dims = SIZE[size];
  const bg = color ?? VARIANT_BG[variant];
  const fg = color ? onAccent(color) : VARIANT_FG[variant];
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={(e) => {
        if (hapticFeedback) haptic('tap');
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.root,
        { height: dims.h, paddingHorizontal: dims.px },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    > 
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: bg,
            borderRadius: shape === 'pill' ? radius.pill : radius.sm,
            transform: shape === 'slant' ? [{ skewX: SLANT }] : undefined,
          },
          isGhost && styles.ghostBorder,
        ]}
      />
      <View style={styles.content}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text variant={dims.font} color={fg} upper style={styles.label}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: spacing.xs,
  },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { alignItems: 'center', justifyContent: 'center' },
  label: { fontStyle: 'italic' },
  ghostBorder: { borderWidth: 1.5, borderColor: colors.borderStrong },
});
