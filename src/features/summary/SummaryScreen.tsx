import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { findWorkout } from '@/state/customWorkoutStore';
import { useI18n } from '@/hooks/useI18n';
import { formatDuration } from '@/i18n';
import { useSessionStore } from '@/state/sessionStore';
import { colors, spacing } from '@/theme';
import { MuscleImpactBars, StatTile } from '@/ui/components';
import { Button, Screen, SectionTitle, Text } from '@/ui/primitives';

export function SummaryScreen() {
  const router = useRouter();
  const { t, lz } = useI18n();
  const result = useSessionStore((s) => s.result);
  const saving = useSessionStore((s) => s.saving);
  const reset = useSessionStore((s) => s.reset);

  useEffect(() => {
    if (!result) router.replace('/');
  }, [result, router]);

  if (!result) return null;

  const workout = findWorkout(result.workoutId);

  const done = () => {
    reset();
    router.replace('/');
  };

  return (
    <Screen bottomInset>
      <View style={styles.hero}>
        <Text variant="label" color={result.completed ? colors.orange : colors.textMuted} upper>
          {workout ? lz(workout.title) : result.workoutId}
        </Text>
        <Text variant="hero" upper style={styles.heading} testID="summary-heading">
          {result.completed ? t.summary.heading : t.summary.headingAborted}
        </Text>
        <Text variant="body" color={colors.textMuted}>
          {t.summary.subheading}
        </Text>
      </View>

      <View style={styles.grid}>
        <StatTile value={result.estimatedCalories} unit={t.common.kcal} label={t.summary.calories} emphasis />
        <StatTile value={formatDuration(result.durationSeconds)} label={t.summary.duration} />
      </View>
      <View style={styles.grid}>
        <StatTile value={result.totalReps} label={t.summary.reps} color={colors.orange} />
        <StatTile value={result.totalSets} label={t.summary.sets} />
        <StatTile value={`${Math.round(result.averageIntensity * 100)}%`} label={t.summary.avgIntensity} />
      </View>

      <SectionTitle title={t.summary.muscleImpact} color={colors.orange} />
      <MuscleImpactBars impact={result.muscleImpact} limit={8} />

      <View style={styles.actions}>
        <Button
          label={saving ? t.summary.saving : t.summary.backToLibrary}
          size="lg"
          fullWidth
          onPress={done}
          disabled={saving}
          testID="summary-done"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginBottom: spacing.xl },
  heading: { fontSize: 56, lineHeight: 56 },
  grid: { flexDirection: 'row', marginHorizontal: -6, marginBottom: spacing.md },
  actions: { marginTop: spacing.xxl },
});
