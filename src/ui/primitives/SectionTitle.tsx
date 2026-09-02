import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { Text } from './Text';

export interface SectionTitleProps {
  title: string;
  hint?: string;
  color?: string;
  style?: object;
}

/** Upper-case label with a short slanted accent bar – used to open sections. */
export function SectionTitle({ title, hint, color = colors.red, style }: SectionTitleProps) {
  return (
    <View style={[styles.root, style]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <Text variant="label" color={colors.textMuted} upper>
        {title}
      </Text>
      {hint ? (
        <Text variant="labelSmall" color={colors.textDim} style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  bar: { width: 14, height: 14, transform: [{ skewX: '-12deg' }] },
  hint: { marginLeft: 'auto' },
});
