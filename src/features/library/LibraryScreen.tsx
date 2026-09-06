import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { getExercise, WORKOUTS } from '@/content';
import type { Workout, WorkoutGoal } from '@/core/domain';
import { summarizeHistory } from '@/core/metrics/metrics';
import { useI18n } from '@/hooks/useI18n';
import { useCustomWorkoutStore } from '@/state/customWorkoutStore';
import { useHistoryStore } from '@/state/historyStore';
import { useSessionStore } from '@/state/sessionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, fonts, radius, spacing } from '@/theme';
import { WorkoutCard } from '@/ui/components';
import { Button, Chip, Screen, SectionTitle, SlantBox, Text } from '@/ui/primitives';

import { OnboardingOverlay } from '../onboarding/OnboardingOverlay';
import { ResumeBanner } from './ResumeBanner';

const GOALS: readonly WorkoutGoal[] = ['strength', 'hypertrophy', 'endurance', 'fatLoss', 'mobility'];

export function LibraryScreen() {
  const router = useRouter();
  const { t, f, lz } = useI18n();
  const [goal, setGoal] = useState<WorkoutGoal | 'all'>('all');
  const [query, setQuery] = useState('');
  const displayName = useSettingsStore((s) => s.settings.profile.displayName);
  const logs = useHistoryStore((s) => s.logs);
  const customWorkouts = useCustomWorkoutStore((s) => s.workouts);
  const removeCustom = useCustomWorkoutStore((s) => s.remove);
  const summary = useMemo(() => summarizeHistory(logs), [logs]);
  const pendingCheckpoint = useSessionStore((s) => s.pendingCheckpoint);

  const { locale } = useI18n();
  const filter = useMemo(() => {
    const q = normalise(query);
    return (list: readonly Workout[]) =>
      list.filter((w) => (goal === 'all' || w.goal === goal) && (q === '' || matchesQuery(w, q, locale, lz)));
  }, [goal, query, locale, lz]);
  const workouts = useMemo(() => filter(WORKOUTS), [filter]);
  const mine = useMemo(() => filter(customWorkouts), [filter, customWorkouts]);

  const open = (workout: Workout) => router.push({ pathname: '/workout/[id]', params: { id: workout.id } });
  const createNew = () => router.push({ pathname: '/builder/[id]', params: { id: 'new' } });
  const editCustom = (workout: Workout) => router.push({ pathname: '/builder/[id]', params: { id: workout.id } });
  const deleteCustom = (workout: Workout) => void removeCustom(workout.id);

  return (
    <Screen>
      <OnboardingOverlay />
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

      {pendingCheckpoint ? <ResumeBanner checkpoint={pendingCheckpoint} /> : null}

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
            <Text variant="stat">≈ {summary.totalCalories}</Text>
            <Text variant="labelSmall" color={colors.textMuted} upper>
              {t.common.kcal}
            </Text>
          </SlantBox>
        </View>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.library.searchPlaceholder}
        placeholderTextColor={colors.textDim}
        style={styles.search}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel={t.library.searchPlaceholder}
        testID="library-search"
      />

      <View style={styles.filters}>
        <Chip label={t.library.filterAll} selected={goal === 'all'} onPress={() => setGoal('all')} />
        {GOALS.map((g) => (
          <Chip key={g} label={t.goal[g]} selected={goal === g} onPress={() => setGoal(g)} />
        ))}
      </View>

      {mine.length > 0 ? (
        <>
          <SectionTitle title={t.builder.mySection} hint={f(t.builder.customCount, { count: mine.length })} />
          {mine.map((w) => (
            <WorkoutCard key={w.id} workout={w} onPress={open} onEdit={editCustom} onDelete={deleteCustom} />
          ))}
          <SectionTitle title={t.builder.builtInSection} style={styles.sectionGap} />
        </>
      ) : null}

      {workouts.length === 0 && mine.length === 0 ? (
        <Text variant="body" color={colors.textMuted} style={styles.empty} testID="library-empty">
          {query ? f(t.library.noSearchResults, { query }) : t.library.empty}
        </Text>
      ) : (
        workouts.map((w) => <WorkoutCard key={w.id} workout={w} onPress={open} />)
      )}

      <Button
        label={`+ ${t.builder.createCta}`}
        variant="secondary"
        size="lg"
        fullWidth
        onPress={createNew}
        style={styles.createButton}
        testID="create-workout"
      />
    </Screen>
  );
}

function normalise(s: string): string {
  return s.trim().toLocaleLowerCase();
}

/** Match on title, tagline, goal-agnostic muscle names and the names of the exercises inside. */
function matchesQuery(w: Workout, q: string, locale: string, lz: ReturnType<typeof useI18n>['lz']): boolean {
  if (normalise(lz(w.title)).includes(q) || normalise(lz(w.tagline)).includes(q)) return true;
  for (const block of w.blocks) {
    for (const we of block.exercises) {
      const ex = getExercise(we.exerciseId);
      if (ex && normalise(lz(ex.name)).includes(q)) return true;
    }
  }
  void locale;
  return false;
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
  search: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginBottom: spacing.lg, marginLeft: -3 },
  empty: { marginTop: spacing.xl, textAlign: 'center' },
  sectionGap: { marginTop: spacing.md },
  createButton: { marginTop: spacing.md },
});
