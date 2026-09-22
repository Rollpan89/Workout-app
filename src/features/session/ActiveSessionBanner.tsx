import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { formatDuration } from '@/i18n';
import type { SessionSnapshot } from '@/core/engine/types';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useI18n } from '@/hooks/useI18n';
import { colors, spacing } from '@/theme';
import { Button, SlantBox, Text } from '@/ui/primitives';

/**
 * "Pass pågår" – shown on the tab screens while a session is running, so a
 * user who backed out of the session screen (or switched tabs mid-workout)
 * can always find their way back to it. The engine keeps counting in the
 * background; nothing is lost by leaving the screen.
 */
export function ActiveSessionBanner() {
  const router = useRouter();
  const { t, f, lz } = useI18n();
  const { active, workout, snapshot } = useActiveSession();

  if (!active || !snapshot) return null;

  return (
    <SlantBox color={colors.surfaceHigh} padding={spacing.md} style={styles.box}>
      <View style={styles.row} testID="active-session-banner">
        <View style={styles.text}>
          <Text variant="label" color={colors.orange} upper>
            {t.activeSession.title}
          </Text>
          <Text variant="body">
            {f(t.activeSession.body, {
              workout: workout ? lz(workout.title) : '',
              phase: phaseLabel(snapshot, t),
              time: formatDuration(snapshot.sessionElapsedSeconds),
            })}
          </Text>
          <Text variant="bodySmall" color={colors.textDim}>
            {t.activeSession.running}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          label={t.activeSession.cta}
          size="md"
          color={colors.orange}
          onPress={() => router.push('/session')}
          testID="active-session-return"
        />
      </View>
    </SlantBox>
  );
}

function phaseLabel(snapshot: SessionSnapshot, t: ReturnType<typeof useI18n>['t']): string {
  const phase = snapshot.phase === 'paused' ? (snapshot.pausedFrom ?? 'working') : snapshot.phase;
  switch (phase) {
    case 'resting':
      return t.activeSession.rest;
    case 'announcing':
      return t.activeSession.announcing;
    case 'awaitingStart':
      return t.activeSession.awaitingStart;
    default:
      return snapshot.phase === 'paused' ? t.activeSession.paused : t.activeSession.working;
  }
}

const styles = StyleSheet.create({
  box: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, gap: spacing.xxs },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
});
