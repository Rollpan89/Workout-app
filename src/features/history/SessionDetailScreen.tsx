import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { compareWithPrevious, formatCalorieRange } from '@/core/metrics/metrics';
import { useI18n } from '@/hooks/useI18n';
import { formatDate, formatDuration } from '@/i18n';
import { findWorkout } from '@/state/customWorkoutStore';
import { useHistoryStore } from '@/state/historyStore';
import { accent, colors, spacing } from '@/theme';
import { ComparisonRow, MuscleImpactBars, StatTile } from '@/ui/components';
import { Button, Screen, SectionTitle, Text } from '@/ui/primitives';

/** One logged session: all metrics, comparison with the previous run, delete. */
export function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, lz, locale } = useI18n();
  const logs = useHistoryStore((s) => s.logs);
  const remove = useHistoryStore((s) => s.remove);
  const log = logs.find((l) => l.id === id);
  const comparison = useMemo(() => (log ? compareWithPrevious(log, logs) : undefined), [log, logs]);
  const [confirming, setConfirming] = useState(false);

  if (!log) {
    return (
      <Screen>
        <Text variant="h2" color={colors.textMuted}>
          404
        </Text>
        <Button label={t.common.back} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const workout = findWorkout(log.workoutId);
  const tone = accent[workout?.accent ?? 'red'];

  const doDelete = () => {
    void remove(log.id);
    router.back();
  };
  const askDelete = () => {
    if (Platform.OS === 'web') {
      setConfirming(true);
      return;
    }
    Alert.alert(t.history.deleteOne, t.history.deleteOneConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.history.deleteOne, style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <Screen bottomInset>
      <View style={styles.nav}>
        <Button
          label={`‹ ${t.common.back}`}
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          testID="detail-back"
        />
      </View>
      <View style={styles.hero}>
        <Text variant="label" color={tone.main} upper>
          {formatDate(log.endedAt, locale)}
          {!log.completed ? ` · ${t.history.aborted}` : ''}
        </Text>
        <Text variant="hero" upper style={styles.heading} testID="detail-heading">
          {workout ? lz(workout.title) : log.workoutId}
        </Text>
      </View>

      <View style={styles.grid}>
        <StatTile
          value={formatCalorieRange(log.estimatedCalories)}
          unit={t.common.kcal}
          label={`${t.summary.calories} · ${t.common.estimate}`}
          color={tone.main}
          emphasis
        />
        <StatTile value={formatDuration(log.durationSeconds)} label={t.summary.duration} />
      </View>
      <View style={styles.grid}>
        <StatTile value={log.totalReps} label={t.summary.reps} color={colors.orange} />
        <StatTile value={log.totalSets} label={t.summary.sets} />
        <StatTile
          value={`${Math.round(log.averageIntensity * 100)}%`}
          label={t.summary.avgIntensity}
        />
      </View>

      {comparison ? (
        <ComparisonRow comparison={comparison} />
      ) : (
        <Text variant="bodySmall" color={colors.textMuted} style={styles.first}>
          {t.history.firstRun}
        </Text>
      )}

      <SectionTitle title={t.summary.muscleImpact} color={tone.main} />
      <MuscleImpactBars impact={log.muscleImpact} limit={8} />

      <View style={styles.actions}>
        {workout ? (
          <Button
            label={t.history.runAgain}
            size="lg"
            fullWidth
            color={tone.main}
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: workout.id } })}
            testID="detail-run-again"
          />
        ) : null}
        {confirming ? (
          <View style={styles.confirmRow}>
            <Text variant="bodySmall" color={colors.textMuted} style={styles.confirmText}>
              {t.history.deleteOneConfirm}
            </Text>
            <Button
              label={t.common.no}
              variant="secondary"
              size="sm"
              onPress={() => setConfirming(false)}
            />
            <Button
              label={t.common.yes}
              variant="danger"
              size="sm"
              onPress={doDelete}
              testID="detail-confirm-delete"
            />
          </View>
        ) : (
          <Button
            label={t.history.deleteOne}
            variant="ghost"
            size="md"
            onPress={askDelete}
            testID="detail-delete"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', marginLeft: -spacing.md, marginBottom: spacing.sm },
  hero: { gap: spacing.xs, marginBottom: spacing.xl },
  heading: { fontSize: 48, lineHeight: 48 },
  grid: { flexDirection: 'row', marginHorizontal: -6, marginBottom: spacing.md },
  first: { marginBottom: spacing.md },
  actions: { marginTop: spacing.xl, gap: spacing.md, alignItems: 'center' },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  confirmText: { width: '100%', textAlign: 'center', marginBottom: spacing.sm },
});
