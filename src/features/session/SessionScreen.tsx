import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PlanStep, SessionSnapshot } from '@/core/engine/types';
import { useI18n } from '@/hooks/useI18n';
import { formatDuration } from '@/i18n';
import { useSessionStore } from '@/state/sessionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, spacing } from '@/theme';
import { IntensityMeter } from '@/ui/components';
import { Button, ProgressBar, Text } from '@/ui/primitives';

import { PhaseDisplay } from './PhaseDisplay';

export function SessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, f, lz } = useI18n();
  const keepAwake = useSettingsStore((s) => s.settings.keepScreenAwake);
  const snapshot = useSessionStore((s) => s.snapshot);
  const plan = useSessionStore((s) => s.plan);
  // Actions are stable references on the store – read them once.
  const actions = useMemo(() => {
    const s = useSessionStore.getState();
    return {
      togglePause: s.togglePause,
      confirmStart: s.confirmStart,
      markRep: s.markRep,
      completeSet: s.completeSet,
      skipRest: s.skipRest,
      skipStep: s.skipStep,
      adjustIntensity: s.adjustIntensity,
      stop: s.stop,
    };
  }, []);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useKeepAwakeIf(keepAwake);

  // Navigate to the summary when the engine finishes
  useEffect(() => {
    if (snapshot?.phase === 'finished') {
      router.replace('/summary');
    }
  }, [snapshot?.phase, router]);

  const nextStep = useMemo<PlanStep | undefined>(
    () => (plan && snapshot ? plan.steps[snapshot.stepIndex + 1] : undefined),
    [plan, snapshot],
  );

  if (!snapshot || !plan || !snapshot.step) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text variant="h2" color={colors.textMuted}>
          …
        </Text>
      </View>
    );
  }

  const step = snapshot.step;
  const phase = snapshot.phase === 'paused' ? snapshot.pausedFrom ?? 'working' : snapshot.phase;
  const isPaused = snapshot.phase === 'paused';
  const overall = (snapshot.stepIndex + stepFraction(snapshot)) / snapshot.totalSteps;
  const accentColor = phase === 'resting' ? colors.rest : colors.red;

  const askEnd = () => {
    if (Platform.OS === 'web') {
      setConfirmEnd(true);
      return;
    }
    Alert.alert(t.session.endConfirmTitle, t.session.endConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.session.end, style: 'destructive', onPress: actions.stop },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
      {/* Top: overall progress + time */}
      <View style={styles.top}>
        <View style={styles.topRow}>
          <Text variant="labelSmall" color={colors.textMuted} upper>
            {f(t.session.step, { current: snapshot.stepIndex + 1, total: snapshot.totalSteps })}
          </Text>
          <Text variant="labelSmall" color={colors.textMuted} upper>
            {lz(step.block.title)}
            {step.rounds > 1 ? ` · ${f(t.session.round, { round: step.round, rounds: step.rounds })}` : ''}
          </Text>
          <Text variant="labelSmall" color={colors.textMuted} upper>
            {formatDuration(snapshot.sessionElapsedSeconds)}
          </Text>
        </View>
        <ProgressBar progress={overall} color={colors.orange} height={10} segments={Math.min(snapshot.totalSteps, 24)} />
      </View>

      {/* Middle: the big phase display */}
      <View style={styles.middle}>
        <PhaseDisplay snapshot={snapshot} phase={phase} nextStep={nextStep} isPaused={isPaused} />
      </View>

      {/* Bottom: intensity + controls */}
      <View style={styles.bottom}>
        <IntensityMeter value={snapshot.intensity} onChange={actions.adjustIntensity} compact />

        <View style={styles.primaryRow}>
          <PrimaryAction snapshot={snapshot} phase={phase} isPaused={isPaused} actions={actions} accentColor={accentColor} />
        </View>

        <View style={styles.secondaryRow}>
          <Button label={t.session.end} variant="ghost" size="md" onPress={askEnd} testID="end-session" />
          <Button
            label={isPaused ? t.session.resume : t.session.pause}
            variant="secondary"
            size="md"
            onPress={actions.togglePause}
            disabled={phase === 'awaitingStart'}
            testID="toggle-pause"
          />
          <Button label={t.session.skip} variant="ghost" size="md" onPress={actions.skipStep} testID="skip-step" />
        </View>
      </View>

      {confirmEnd ? (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text variant="h2" upper>
              {t.session.endConfirmTitle}
            </Text>
            <Text variant="body" color={colors.textMuted}>
              {t.session.endConfirmBody}
            </Text>
            <View style={styles.dialogActions}>
              <Button label={t.common.cancel} variant="secondary" onPress={() => setConfirmEnd(false)} />
              <Button
                label={t.session.end}
                variant="danger"
                onPress={() => {
                  setConfirmEnd(false);
                  actions.stop();
                }}
                testID="confirm-end"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PrimaryAction({
  snapshot,
  phase,
  isPaused,
  actions,
  accentColor,
}: {
  snapshot: SessionSnapshot;
  phase: SessionSnapshot['phase'];
  isPaused: boolean;
  actions: {
    togglePause: () => void;
    confirmStart: () => void;
    markRep: () => void;
    completeSet: () => void;
    skipRest: () => void;
  };
  accentColor: string;
}) {
  const { t } = useI18n();

  if (isPaused) {
    return <Button label={t.session.resume} size="xl" fullWidth onPress={actions.togglePause} testID="primary-resume" />;
  }

  switch (phase) {
    case 'awaitingStart':
      return <Button label={t.session.startSet} size="xl" fullWidth onPress={actions.confirmStart} testID="primary-start-set" />;
    case 'resting':
      return <Button label={t.session.skipRest} size="xl" fullWidth variant="rest" onPress={actions.skipRest} testID="primary-skip-rest" />;
    case 'working':
      if (snapshot.interactionLevel === 'manual') {
        return (
          <View style={styles.manualRow}>
            {snapshot.target?.kind === 'reps' ? (
              <Button label={t.session.markRep} size="xl" style={styles.flex} fullWidth onPress={actions.markRep} testID="primary-mark-rep" />
            ) : null}
            <Button
              label={t.session.completeSet}
              size="xl"
              variant="secondary"
              style={styles.flex}
              fullWidth
              onPress={actions.completeSet}
              testID="primary-complete-set"
            />
          </View>
        );
      }
      return (
        <Button
          label={t.session.completeSet}
          size="xl"
          fullWidth
          variant="secondary"
          onPress={actions.completeSet}
          style={{ borderColor: accentColor }}
          testID="primary-complete-set"
        />
      );
    case 'announcing':
    default:
      return <Button label={t.session.getReady} size="xl" fullWidth variant="secondary" disabled hapticFeedback={false} />;
  }
}

/** Fraction of the current step done, for a smooth overall progress bar. */
function stepFraction(s: SessionSnapshot): number {
  const active = s.phase === 'paused' ? s.pausedFrom : s.phase;
  if (active === 'working' && s.target) {
    return s.target.kind === 'reps'
      ? Math.min(1, s.repsDone / s.target.reps) * 0.8
      : Math.min(1, s.workElapsedSeconds / s.target.seconds) * 0.8;
  }
  if (active === 'resting' && s.restTotalSeconds > 0) {
    return 0.8 + 0.2 * (1 - s.restRemainingSeconds / s.restTotalSeconds);
  }
  return 0;
}

function useKeepAwakeIf(enabled: boolean) {
  // expo-keep-awake's hook cannot be conditional, so wrap it.
  const Hook = enabled ? useKeepAwake : () => undefined;
  Hook();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { gap: spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  middle: { flex: 1, justifyContent: 'center' },
  bottom: { gap: spacing.md },
  primaryRow: { marginTop: spacing.xs },
  secondaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manualRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
});
