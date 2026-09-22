import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { getExercise, WORKOUTS } from '@/content';
import {
  decodeWorkoutShareCode,
  draftFromSharedWorkout,
  estimateDraftMinutes,
  nextAccent,
  type ShareCodeError,
  type SharedWorkout,
} from '@/core/domain';
import { createId } from '@/core/utils/id';
import { useI18n } from '@/hooks/useI18n';
import { useCustomWorkoutStore } from '@/state/customWorkoutStore';
import { colors, fonts, radius, spacing } from '@/theme';
import { Button, Card, Screen, SectionTitle, Text } from '@/ui/primitives';

const ERROR_KEY: Record<
  ShareCodeError,
  'errorEmpty' | 'errorMalformed' | 'errorUnsupportedVersion' | 'errorNoName' | 'errorNoExercises'
> = {
  empty: 'errorEmpty',
  malformed: 'errorMalformed',
  unsupportedVersion: 'errorUnsupportedVersion',
  noName: 'errorNoName',
  noExercises: 'errorNoExercises',
};

/**
 * Import a workout that a friend shared as text. Paste the code → preview →
 * "Lägg till bland mina pass". The imported workout becomes a normal custom
 * workout that can be edited, run and shared on.
 */
export function ImportWorkoutScreen() {
  const router = useRouter();
  const { t, f } = useI18n();
  const save = useCustomWorkoutStore((s) => s.save);
  const drafts = useCustomWorkoutStore((s) => s.drafts);
  const [code, setCode] = useState('');
  const [error, setError] = useState<ShareCodeError | undefined>();
  const [parsed, setParsed] = useState<SharedWorkout | undefined>();
  const [saving, setSaving] = useState(false);

  const readCode = () => {
    setParsed(undefined);
    const result = decodeWorkoutShareCode(code, getExercise);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(undefined);
    setParsed(result.workout);
  };

  const addToMyWorkouts = async () => {
    if (!parsed) return;
    setSaving(true);
    const draft = draftFromSharedWorkout(parsed, {
      id: createId('cw'),
      accent: nextAccent([...WORKOUTS, ...drafts]),
      now: new Date().toISOString(),
    });
    const workout = await save(draft);
    setSaving(false);
    router.replace({ pathname: '/workout/[id]', params: { id: workout.id } });
  };

  return (
    <Screen bottomInset>
      <Button
        label={`‹ ${t.common.back}`}
        variant="ghost"
        size="sm"
        onPress={() => router.back()}
        testID="import-back"
      />

      <View style={styles.hero}>
        <Text variant="label" color={colors.orange} upper>
          {t.share.cta}
        </Text>
        <Text variant="hero" upper style={styles.heading}>
          {t.share.openCta}
        </Text>
        <Text variant="body" color={colors.textMuted}>
          {t.share.importBody}
        </Text>
      </View>

      <SectionTitle title={t.share.importHeading} color={colors.orange} />
      <TextInput
        value={code}
        onChangeText={(next) => {
          setCode(next);
          setError(undefined);
          setParsed(undefined);
        }}
        placeholder={t.share.importPlaceholder}
        placeholderTextColor={colors.textDim}
        style={styles.input}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t.share.importHeading}
        testID="import-code"
      />

      <Button
        label={t.share.importParse}
        variant="secondary"
        fullWidth
        onPress={readCode}
        style={styles.parse}
        testID="import-parse"
      />

      {error ? (
        <Card padding={spacing.md} style={styles.errorCard}>
          <Text variant="bodyBold" color={colors.orange} testID="import-error">
            {t.share[ERROR_KEY[error] ?? 'errorMalformed']}
          </Text>
        </Card>
      ) : null}

      {parsed ? (
        <Card padding={spacing.md} style={styles.previewCard} testID="import-preview">
          <Text variant="h2" upper numberOfLines={2}>
            {parsed.name}
          </Text>
          <Text variant="body" color={colors.textMuted}>
            {f(t.share.preview, {
              exercises: parsed.exercises.length,
              minutes: estimateDraftMinutes(
                draftFromSharedWorkout(parsed, { id: 'preview', now: new Date().toISOString() }),
                getExercise,
              ),
            })}
          </Text>
          {parsed.unknownExerciseIds.length > 0 ? (
            <Text variant="bodySmall" color={colors.orange} testID="import-dropped">
              {f(t.share.dropped, { count: parsed.unknownExerciseIds.length })}
            </Text>
          ) : null}
          <Button
            label={t.share.save}
            size="lg"
            fullWidth
            color={colors.orange}
            onPress={() => void addToMyWorkouts()}
            disabled={saving}
            style={styles.save}
            testID="import-save"
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.md },
  heading: { fontSize: 52, lineHeight: 52 },
  input: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  parse: { marginTop: spacing.md },
  errorCard: { marginTop: spacing.md, borderWidth: 1, borderColor: colors.orange },
  previewCard: { marginTop: spacing.md, gap: spacing.xs },
  save: { marginTop: spacing.md },
});
