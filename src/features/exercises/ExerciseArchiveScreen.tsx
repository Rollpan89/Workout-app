import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EXERCISES } from '@/content';
import type { Exercise, ExerciseCategory, MuscleGroup } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { colors, fonts, onAccent, radius, spacing } from '@/theme';
import { ExerciseSheet } from '@/ui/components';
import { Chip, Screen, SectionTitle, Text } from '@/ui/primitives';

const CATEGORIES: readonly ExerciseCategory[] = ['strength', 'core', 'cardio', 'mobility'];

/** Muscle groups actually used by the catalogue, strongest secondarily. */
function muscleGroupsOf(exercises: readonly Exercise[]): readonly MuscleGroup[] {
  const seen = new Set<MuscleGroup>();
  for (const exercise of exercises) {
    for (const [muscle, load] of Object.entries(exercise.muscles) as [MuscleGroup, number][]) {
      if (load > 0) seen.add(muscle);
    }
  }
  return [...seen];
}

/**
 * The exercise archive: *every* exercise the app can coach, searchable by
 * name, muscle or equipment and filterable by category and muscle group.
 * Tapping a row opens the same instruction sheet the workout overview uses.
 */
export function ExerciseArchiveScreen() {
  const insets = useSafeAreaInsets();
  const { t, f, lz } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [open, setOpen] = useState<Exercise | undefined>();

  const muscles = useMemo(() => muscleGroupsOf(EXERCISES), []);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return EXERCISES.filter((exercise) => category === 'all' || exercise.category === category)
      .filter((exercise) => muscle === 'all' || (exercise.muscles[muscle] ?? 0) > 0)
      .filter((exercise) => {
        if (q.length === 0) return true;
        if (lz(exercise.name).toLocaleLowerCase().includes(q)) return true;
        if (exercise.id.includes(q)) return true;
        if (exercise.cue && lz(exercise.cue).toLocaleLowerCase().includes(q)) return true;
        if (
          exercise.equipment.some((equipment) =>
            t.equipment[equipment].toLocaleLowerCase().includes(q),
          )
        )
          return true;
        return (Object.keys(exercise.muscles) as MuscleGroup[]).some((m) =>
          t.muscles[m].toLocaleLowerCase().includes(q),
        );
      });
  }, [query, category, muscle, lz, t]);

  // NB: a plain callback, not a component defined in the render body.
  const renderExercise = useCallback<ListRenderItem<Exercise>>(
    ({ item: exercise }) => {
      const load = muscle === 'all' ? undefined : exercise.muscles[muscle];
      return (
        <Pressable
          onPress={() => setOpen(exercise)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityHint={t.exerciseSheet.tapForInstructions}
          testID={`archive-${exercise.id}`}
        >
          <View style={styles.rowText}>
            <Text variant="bodyBold" numberOfLines={2}>
              {lz(exercise.name)}
            </Text>
            <Text variant="labelSmall" color={colors.textDim} upper numberOfLines={2}>
              {t.exerciseSheet.category[exercise.category]}
              {' · '}
              {exercise.equipment.map((equipment) => t.equipment[equipment]).join(', ')}
            </Text>
          </View>
          {load !== undefined ? (
            <Text variant="labelSmall" color={colors.orange}>
              {Math.round(load * 100)}%
            </Text>
          ) : (
            <Text variant="h3" color={colors.textDim}>
              ›
            </Text>
          )}
        </Pressable>
      );
    },
    [lz, muscle, t],
  );

  const header = (
    <>
      <Text variant="hero" upper style={styles.heading}>
        {t.exercises.heading}
      </Text>
      <Text variant="body" color={colors.textMuted} style={styles.subheading}>
        {t.exercises.subheading}
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.exercises.searchPlaceholder}
        placeholderTextColor={colors.textDim}
        style={styles.search}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={t.exercises.searchPlaceholder}
        testID="archive-search"
      />

      <View style={styles.filters}>
        <Chip
          label={t.builder.allCategories}
          selected={category === 'all'}
          onPress={() => setCategory('all')}
          testID="archive-category-all"
        />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={t.exerciseSheet.category[c]}
            selected={category === c}
            color={colors.orange}
            onPress={() => setCategory(c)}
            testID={`archive-category-${c}`}
          />
        ))}
      </View>

      <SectionTitle
        title={t.exercises.muscles}
        hint={f(t.exercises.count, { count: results.length })}
        color={colors.orange}
      />
      <View style={styles.filters}>
        <Chip
          label={t.exercises.allMuscles}
          selected={muscle === 'all'}
          onPress={() => setMuscle('all')}
          testID="archive-muscle-all"
        />
        {muscles.map((m) => (
          <Chip
            key={m}
            label={t.muscles[m]}
            selected={muscle === m}
            color={colors.orange}
            onPress={() => setMuscle(m)}
            testID={`archive-muscle-${m}`}
          />
        ))}
      </View>
    </>
  );

  return (
    <Screen scroll={false} padded={false} topInset={false}>
      <FlatList
        data={results}
        keyExtractor={(exercise) => exercise.id}
        renderItem={renderExercise}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.md }]}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text variant="body" color={colors.textMuted} style={styles.empty} testID="archive-empty">
            {f(t.exercises.empty, { query })}
          </Text>
        }
        testID="archive-list"
      />
      <ExerciseSheet
        exercise={open}
        color={colors.orange}
        onColor={onAccent(colors.orange)}
        onClose={() => setOpen(undefined)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  heading: { fontSize: 56, lineHeight: 56, marginBottom: spacing.sm },
  subheading: { marginBottom: spacing.md },
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    marginLeft: -3,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', marginTop: spacing.xl },
});
