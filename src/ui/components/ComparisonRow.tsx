import { StyleSheet, View } from 'react-native';

import type { LogComparison } from '@/core/metrics/metrics';
import { useI18n } from '@/hooks/useI18n';
import { formatDate } from '@/i18n';
import { colors, spacing } from '@/theme';
import { Text } from '@/ui/primitives';

/**
 * "Jämfört med förra gången" – three deltas (time, reps, kcal) in a row.
 * Green = better (faster, more reps, more kcal), muted = same, orange = less.
 */
export function ComparisonRow({ comparison }: { comparison: LogComparison }) {
  const { t, locale } = useI18n();
  const deltas = [
    {
      label: t.compare.time,
      value: -Math.round(comparison.durationSeconds / 60),
      unit: t.common.minutes,
      good: comparison.durationSeconds <= 0,
      shown: fmtSigned(Math.round(comparison.durationSeconds / 60)),
    },
    {
      label: t.compare.reps,
      value: comparison.totalReps,
      unit: t.common.reps,
      good: comparison.totalReps >= 0,
      shown: fmtSigned(comparison.totalReps),
    },
    {
      label: t.compare.calories,
      value: comparison.estimatedCalories,
      unit: t.common.kcal,
      good: comparison.estimatedCalories >= 0,
      shown: fmtSigned(comparison.estimatedCalories),
    },
  ];
  const intensity = comparison.averageIntensity;

  return (
    <View style={styles.root} testID="comparison-row">
      <Text variant="labelSmall" color={colors.textMuted} upper>
        {t.compare.title} · {formatDate(comparison.previous.endedAt, locale)}
      </Text>
      <View style={styles.row}>
        {deltas.map((d) => (
          <View key={d.label} style={styles.cell}>
            <Text
              variant="h2"
              color={d.value === 0 ? colors.textMuted : d.good ? colors.success : colors.orange}
            >
              {d.shown}
            </Text>
            <Text variant="labelSmall" color={colors.textMuted} upper>
              {d.label} · {d.unit}
            </Text>
          </View>
        ))}
      </View>
      {intensity !== 0 ? (
        <Text variant="bodySmall" color={colors.textMuted}>
          {intensity > 0 ? t.compare.harder : t.compare.easier} (
          {fmtSigned(Math.round(intensity * 100))} %)
        </Text>
      ) : null}
    </View>
  );
}

function fmtSigned(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '±0';
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row' },
  cell: { flex: 1, gap: spacing.xxs },
});
