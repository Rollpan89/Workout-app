import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, onAccent, radius, SLANT, spacing } from '@/theme';

import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
  slanted?: boolean;
  testID?: string;
}

export function Chip({ label, selected, onPress, color = colors.red, style, slanted = true, testID }: ChipProps) {
  const bg = selected ? color : colors.surface;
  const fg = selected ? onAccent(color) : colors.textMuted;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      testID={testID}
      disabled={!onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed, style]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: bg,
            borderRadius: slanted ? radius.sm : radius.pill,
            transform: slanted ? [{ skewX: SLANT }] : undefined,
          },
          !selected && styles.border,
        ]}
      />
      <Text variant="labelSmall" color={fg} upper>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.md,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  pressed: { opacity: 0.8 },
  border: { borderWidth: 1, borderColor: colors.border },
});
