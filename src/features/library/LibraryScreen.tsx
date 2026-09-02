import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WORKOUTS } from '@/content';
import type { Workout, WorkoutGoal } from '@/core/domain';
import { summarizeHistory } from '@/core/metrics/metrics';
import { useI18n } from '@/hooks/useI18n';
import { useHistoryStore } from '@/state/historyStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, spacing } from '@/theme';
import { WorkoutCard } from '@/ui/components';
import { Chip, Screen, SlantBox, Text } from '@/ui/primitives';

const GOALS: readonly WorkoutGoal[] = ['strength', 'hypertrophy', 'endurance', 'fatLoss', 'mobility'];

export function LibraryScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [goal, setGoal] = useState<WorkoutGoal | 'all'>('all');
  const displayName = useSettingsStore((s) => s.settings.profile.displayName);
  const logs = useHistoryStore((s) => s.logs);
  const summary = useMemo(() => summarizeHistory(logs), [logs]);

  const workouts = useMemo(
    () => (goal === 'all' ? WORKOUTS : WORKOUTS.filter((w) => w.goal === goal)),
    [goal],
  );

  const open = (workout: Workout) => router.push({ pathname: '/workout/[id]', params: { id: workout.id } });

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="label" color={colors.textMuted} upper>
          {greeting(t)}
          {displayName ? `, ${displayName}` : ''}
        </Text>
        <Text variant="hero" upper style={styles.heading}>
          {t.library.heading}
        </Text>
        <Text variant="body" color={colors.textMuted}>
          {t.library.subheading}
        </Text>
      </View>

      {summary.sessions > 0 ? (
        <View style={styles.statsRow}>
          <SlantBox color={colors.red} padding={spacing.md} style={styles.statBox}>
            <Text variant="stat" color={colors.textOnAccent}>
              {summary.streakDays}
            </Text>
            <Text variant="labelSmall" color="rgba(255,255,255,0.85)" upper>
              {t.library.streak}
            </Text>
          </SlantBox>
          <SlantBox color={colors.surface} padding={spacing.md} style={styles.statBox}>
            <Text variant="stat">{summary.sessions}</Text>
            <Text variant="labelSmall" color={colors.textMuted} upper>
              {t.history.sessions}
            </Text>
          </SlantBox>
          <SlantBox color={colors.surface} padding={spacing.md} style={styles.statBox}>
            <Text variant="stat">{summary.totalCalories}</Text>
            <Text variant="labelSmall" color={colors.textMuted} upper>
              {t.common.kcal}
            </Text>
          </SlantBox>
        </View>
      ) : null}

      <View style={styles.filters}>
        <Chip label={t.library.filterAll} selected={goal === 'all'} onPress={() => setGoal('all')} />
        {GOALS.map((g) => (
          <Chip key={g} label={t.goal[g]} selected={goal === g} onPress={() => setGoal(g)} />
        ))}
      </View>

      {workouts.length === 0 ? (
        <Text variant="body" color={colors.textMuted} style={styles.empty}>
          {t.library.empty}
        </Text>
      ) : (
        workouts.map((w) => <WorkoutCard key={w.id} workout={w} onPress={open} />)
      )}
    </Screen>
  );
}

function greeting(t: ReturnType<typeof useI18n>['t']): string {
  const h = new Date().getHours();
  if (h < 10) return t.library.greetingMorning;
  if (h >= 18) return t.library.greetingEvening;
  return t.library.greetingDay;
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginBottom: spacing.lg },
  heading: { fontSize: 56, lineHeight: 56, color: colors.text },
  statsRow: { flexDirection: 'row', marginHorizontal: -6, marginBottom: spacing.lg },
  statBox: { flex: 1, marginHorizontal: 6 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginBottom: spacing.lg, marginLeft: -3 },
  empty: { marginTop: spacing.xl, textAlign: 'center' },
});
