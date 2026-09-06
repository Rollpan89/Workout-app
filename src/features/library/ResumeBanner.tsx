import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { SessionCheckpoint } from '@/core/engine/types';
import { useI18n } from '@/hooks/useI18n';
import { findWorkout } from '@/state/customWorkoutStore';
import { useSessionStore } from '@/state/sessionStore';
import { colors, spacing } from '@/theme';
import { Button, SlantBox, Text } from '@/ui/primitives';

/**
 * "Fortsätt passet?" – shown at the top of the library when a checkpoint of
 * an interrupted session exists (app killed, crash, phone died).
 */
export function ResumeBanner({ checkpoint }: { checkpoint: SessionCheckpoint }) {
  const router = useRouter();
  const { t, f, lz } = useI18n();
  const start = useSessionStore((s) => s.start);
  const discard = useSessionStore((s) => s.discardPendingCheckpoint);
  const workout = findWorkout(checkpoint.workoutId);

  if (!workout) {
    // The workout was deleted meanwhile – nothing sensible to resume.
    discard();
    return null;
  }

  const resume = () => {
    start({ workout, resumeFrom: checkpoint });
    router.push('/session');
  };

  return (
    <SlantBox color={colors.surfaceHigh} padding={spacing.md} style={styles.box}>
      <View style={styles.row} testID="resume-banner">
        <View style={styles.text}>
          <Text variant="label" color={colors.orange} upper>
            {t.resume.title}
          </Text>
          <Text variant="body">
            {f(t.resume.body, {
              workout: lz(workout.title),
              step: checkpoint.stepIndex + 1,
              total: checkpoint.totalSteps,
              minutes: Math.max(1, Math.round(checkpoint.elapsedSeconds / 60)),
            })}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          label={t.resume.discard}
          variant="ghost"
          size="md"
          onPress={discard}
          testID="resume-discard"
        />
        <Button
          label={t.resume.cta}
          size="md"
          color={colors.orange}
          onPress={resume}
          testID="resume-session"
        />
      </View>
    </SlantBox>
  );
}

const styles = StyleSheet.create({
  box: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, gap: spacing.xxs },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
