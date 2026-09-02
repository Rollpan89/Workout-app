import { StyleSheet, View } from 'react-native';

import type { MuscleGroup } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { colors, spacing } from '@/theme';
import { ProgressBar, Text } from '@/ui/primitives';

export interface MuscleImpactBarsProps {
  impact: Readonly<Partial<Record<MuscleGroup, number>>>;
  /** Show at most this many groups (sorted by impact). */
  limit?: number;
  color?: string;
}

export function MuscleImpactBars({ impact, limit = 6, color = colors.orange }: MuscleImpactBarsProps) {
  const { t } = useI18n();
  const rows = (Object.entries(impact) as [MuscleGroup, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (rows.length === 0) return null;

  return (
    <View style={styles.root}>
      {rows.map(([group, value]) => (
        <View key={group} style={styles.row}>
          <Text variant="labelSmall" color={colors.textMuted} upper style={styles.label} numberOfLines={1}>
            {t.muscles[group]}
          </Text>
          <ProgressBar progress={value} color={color} height={12} style={styles.bar} />
          <Text variant="labelSmall" color={colors.textDim} style={styles.pct}>
            {Math.round(value * 100)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { width: 96 },
  bar: { flex: 1 },
  pct: { width: 40, textAlign: 'right' },
});
