import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getExercise, getWorkout } from '@/content';
import {
  clamp,
  defaultDraftExercise,
  DRAFT_LIMITS,
  draftRounds,
  estimateDraftMinutes,
  validateDraft,
  WORKOUT_ACCENTS,
  type CustomWorkoutDraft,
  type Difficulty,
  type DraftExercise,
  type DraftValidationError,
  type Exercise,
  type WorkoutGoal,
} from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { useCustomWorkoutStore } from '@/state/customWorkoutStore';
import { accent, colors, fonts, radius, spacing } from '@/theme';
import { ExerciseSheet } from '@/ui/components';
import { Button, Card, Chip, Screen, SectionTitle, Text } from '@/ui/primitives';

import { DraftExerciseRow } from './DraftExerciseRow';
import { ExercisePicker } from './ExercisePicker';

const GOALS: readonly WorkoutGoal[] = ['strength', 'hypertrophy', 'endurance', 'fatLoss', 'mobility'];
const LEVELS: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced'];

const ERROR_KEY: Record<DraftValidationError, 'errorNameRequired' | 'errorNoExercises' | 'errorTooManyExercises'> = {
  nameRequired: 'errorNameRequired',
  noExercises: 'errorNoExercises',
  tooManyExercises: 'errorTooManyExercises',
};

/**
 * Builder for custom workouts.
 *
 * Route params:
 *   id = "new"          → empty draft
 *   id = <custom id>    → edit existing draft
 *   id = "new" + from=<workout id> → copy of that workout (built-in or custom)
 *   optional name=<prefilled name>
 */
export function WorkoutBuilderScreen() {
  const { id, from, name: prefillName } = useLocalSearchParams<{ id: string; from?: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, f, lz } = useI18n();

  const store = useCustomWorkoutStore();
  // The store is hydrated before any screen mounts (see app/_layout), so the
  // initial draft can be derived once, synchronously.
  const [draft, setDraft] = useState<CustomWorkoutDraft | undefined>(() => {
    if (id && id !== 'new') return store.getDraft(id);
    if (from) {
      const source = getWorkout(from) ?? store.workouts.find((w) => w.id === from);
      if (source) return store.duplicate(source, prefillName ?? `${lz(source.title)} ${t.builder.copySuffix}`);
    }
    return { ...store.newDraft(), name: prefillName ?? '' };
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [info, setInfo] = useState<Exercise | undefined>();
  const [errors, setErrors] = useState<readonly DraftValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEditing = !!id && id !== 'new';
  const tone = accent[draft?.accent ?? 'red'];
  const minutes = useMemo(() => (draft ? estimateDraftMinutes(draft, getExercise) : 0), [draft]);

  const update = useCallback((patch: Partial<CustomWorkoutDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setErrors([]);
  }, []);

  const updateExercise = (index: number, next: DraftExercise) =>
    update({ exercises: draft!.exercises.map((e, i) => (i === index ? next : e)) });

  const removeExercise = (index: number) => update({ exercises: draft!.exercises.filter((_, i) => i !== index) });

  const moveExercise = (index: number, direction: -1 | 1) => {
    const list = [...draft!.exercises];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item!);
    update({ exercises: list });
  };

  const addExercise = (exercise: Exercise) => {
    update({ exercises: [...draft!.exercises, defaultDraftExercise(exercise)] });
    setPickerOpen(false);
  };

  const save = async () => {
    if (!draft) return;
    const problems = validateDraft(draft);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setSaving(true);
    const workout = await store.save(draft);
    setSaving(false);
    router.replace({ pathname: '/workout/[id]', params: { id: workout.id } });
  };

  const doDelete = async () => {
    if (!draft) return;
    setConfirmingDelete(false);
    await store.remove(draft.id);
    router.dismissTo('/');
  };

  const askDelete = () => {
    if (Platform.OS === 'web') {
      setConfirmingDelete(true);
      return;
    }
    Alert.alert(t.builder.delete, t.builder.deleteConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.builder.delete, style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  if (!draft) {
    return (
      <Screen>
        <Text variant="h2" color={colors.textMuted}>
          …
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={{ paddingBottom: insets.bottom + 120 }}>
      <View style={styles.topBar}>
        <Button label={`‹ ${t.common.cancel}`} variant="ghost" size="sm" onPress={() => router.back()} testID="builder-cancel" />
        {isEditing ? <Button label={t.builder.delete} variant="ghost" size="sm" onPress={askDelete} testID="builder-delete" /> : null}
      </View>

      {confirmingDelete ? (
        <View style={styles.confirmRow}>
          <Text variant="bodySmall" color={colors.textMuted} style={styles.confirmText}>
            {t.builder.deleteConfirm}
          </Text>
          <Button label={t.common.no} variant="secondary" size="sm" onPress={() => setConfirmingDelete(false)} />
          <Button label={t.common.yes} variant="danger" size="sm" onPress={() => void doDelete()} testID="builder-confirm-delete" />
        </View>
      ) : null}

      <Text variant="label" color={tone.main} upper>
        {isEditing ? t.builder.editTitle : t.builder.newTitle}
      </Text>
      <TextInput
        value={draft.name}
        onChangeText={(name) => update({ name: name.slice(0, DRAFT_LIMITS.nameMax) })}
        placeholder={t.builder.namePlaceholder}
        placeholderTextColor={colors.textDim}
        style={[styles.nameInput, errors.includes('nameRequired') && styles.inputError]}
        autoCapitalize="sentences"
        returnKeyType="done"
        accessibilityLabel={t.builder.name}
        testID="builder-name"
      />

      <View style={styles.metaRow}>
        <Text variant="bodyBold" color={colors.textMuted}>
          {f(t.builder.estimate, { minutes })}
        </Text>
        <Text variant="bodyBold" color={colors.textMuted}>
          {draft.exercises.length} {t.builder.exercises.toLowerCase()}
        </Text>
      </View>

      <SectionTitle title={t.builder.color} color={tone.main} />
      <View style={styles.swatches}>
        {WORKOUT_ACCENTS.map((a) => (
          <Chip
            key={a}
            label={draft.accent === a ? '✓' : ' '}
            selected
            color={accent[a].main}
            onPress={() => update({ accent: a })}
            style={[styles.swatch, draft.accent === a && styles.swatchSelected]}
          />
        ))}
      </View>

      <SectionTitle title={t.builder.goal} color={tone.main} />
      <View style={styles.chips}>
        {GOALS.map((g) => (
          <Chip key={g} label={t.goal[g]} selected={draft.goal === g} color={tone.main} onPress={() => update({ goal: g })} />
        ))}
      </View>

      <SectionTitle title={t.builder.difficulty} color={tone.main} />
      <View style={styles.chips}>
        {LEVELS.map((d) => (
          <Chip key={d} label={t.difficulty[d]} selected={draft.difficulty === d} color={tone.main} onPress={() => update({ difficulty: d })} />
        ))}
      </View>

      <SectionTitle title={t.builder.exercises} color={tone.main} />
      {draft.exercises.length === 0 ? (
        <Card style={[styles.emptyCard, errors.includes('noExercises') && styles.cardError]}>
          <Text variant="body" color={colors.textMuted} align="center">
            {t.builder.emptyList}
          </Text>
        </Card>
      ) : (
        draft.exercises.map((item, index) => {
          const exercise = getExercise(item.exerciseId);
          if (!exercise) return null;
          return (
            <DraftExerciseRow
              key={`${item.exerciseId}-${index}`}
              index={index}
              total={draft.exercises.length}
              item={item}
              exercise={exercise}
              color={tone.main}
              onChange={(next) => updateExercise(index, next)}
              onRemove={() => removeExercise(index)}
              onMove={(dir) => moveExercise(index, dir)}
              onOpenInfo={() => setInfo(exercise)}
            />
          );
        })
      )}
      <Button
        label={`+ ${t.builder.addExercise}`}
        variant="secondary"
        fullWidth
        onPress={() => setPickerOpen(true)}
        disabled={draft.exercises.length >= DRAFT_LIMITS.exercises.max}
        testID="builder-add-exercise"
      />

      <SectionTitle title={t.builder.rounds} color={tone.main} />
      <View style={styles.transitionRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip
            key={n}
            label={n === 1 ? t.builder.roundsOne : f(t.builder.roundsN, { n })}
            selected={draftRounds(draft) === n}
            color={tone.main}
            onPress={() => update({ rounds: n })}
            testID={`builder-rounds-${n}`}
          />
        ))}
      </View>
      <Text variant="bodySmall" color={colors.textMuted} style={styles.hint}>
        {t.builder.roundsHint}
      </Text>

      <SectionTitle title={t.builder.transition} color={tone.main} />
      <View style={styles.transitionRow}>
        {[0, 10, 20, 30, 45, 60].map((s) => (
          <Chip
            key={s}
            label={`${s}${t.common.seconds.charAt(0)}`}
            selected={draft.transitionSeconds === s}
            color={tone.main}
            onPress={() => update({ transitionSeconds: clamp(s, DRAFT_LIMITS.transition.min, DRAFT_LIMITS.transition.max) })}
          />
        ))}
      </View>

      {errors.length > 0 ? (
        <View style={styles.errors} testID="builder-errors">
          {errors.map((e) => (
            <Text key={e} variant="bodyBold" color={colors.red}>
              {t.builder[ERROR_KEY[e]]}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label={t.builder.save} size="xl" fullWidth color={tone.main} onPress={() => void save()} disabled={saving} testID="builder-save" />
      </View>

      <ExercisePicker visible={pickerOpen} color={tone.main} onPick={addExercise} onClose={() => setPickerOpen(false)} />
      <ExerciseSheet exercise={info} color={tone.main} onColor={tone.on} onClose={() => setInfo(undefined)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  confirmText: { flex: 1 },
  nameInput: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: { borderColor: colors.red },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { minWidth: 40 },
  swatchSelected: { transform: [{ scale: 1.15 }] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginLeft: -3 },
  emptyCard: { marginBottom: spacing.md },
  cardError: { borderWidth: 1, borderColor: colors.red },
  transitionRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginLeft: -3 },
  hint: { marginTop: spacing.sm },
  errors: { marginTop: spacing.lg, gap: 4 },
  footer: { marginTop: spacing.xl },
});
