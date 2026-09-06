import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { PlanStep, SessionPhase, SessionSnapshot } from '@/core/engine/types';
import { useI18n } from '@/hooks/useI18n';
import { colors, fonts, spacing } from '@/theme';
import { ProgressBar, SlantBox, Text } from '@/ui/primitives';

export interface PhaseDisplayProps {
  snapshot: SessionSnapshot;
  phase: SessionPhase;
  nextStep?: PlanStep;
  isPaused: boolean;
}

/**
 * The centre of the session screen: one giant number and one short word.
 * Readable from across the room so a glance is all that's needed.
 */
export function PhaseDisplay({ snapshot, phase, nextStep, isPaused }: PhaseDisplayProps) {
  const { t, f, lz } = useI18n();
  const step = snapshot.step;
  if (!step) return null;

  const exerciseName = lz(step.exercise.name);
  const setLabel = step.totalSets > 1 ? f(t.session.setOf, { set: step.setNumber, total: step.totalSets }) : '';

  let big = '';
  let caption = '';
  let progress = 0;
  let color: string = colors.red;
  let subtitle = '';

  switch (phase) {
    case 'announcing': {
      const remaining = Math.ceil(snapshot.announceRemainingSeconds);
      big = remaining > 0 ? String(remaining) : t.session.go;
      caption = t.session.getReady;
      progress = 1 - snapshot.announceRemainingSeconds / 5;
      color = colors.orange;
      subtitle = targetText(snapshot, t);
      break;
    }
    case 'awaitingStart':
      big = '▶';
      caption = t.session.tapWhenReady;
      color = colors.orange;
      subtitle = targetText(snapshot, t);
      break;
    case 'working': {
      if (snapshot.target?.kind === 'reps') {
        big = String(snapshot.repsDone);
        caption = `/ ${snapshot.target.reps} ${t.common.reps}`;
        progress = snapshot.repsDone / snapshot.target.reps;
      } else if (snapshot.target) {
        const remaining = Math.max(0, Math.ceil(snapshot.target.seconds - snapshot.workElapsedSeconds));
        big = String(remaining);
        caption = t.common.seconds;
        progress = snapshot.workElapsedSeconds / snapshot.target.seconds;
      }
      color = colors.red;
      break;
    }
    case 'resting': {
      big = String(Math.ceil(snapshot.restRemainingSeconds));
      caption = t.session.rest;
      progress = snapshot.restTotalSeconds > 0 ? 1 - snapshot.restRemainingSeconds / snapshot.restTotalSeconds : 0;
      color = colors.rest;
      break;
    }
    default:
      break;
  }

  const isResting = phase === 'resting';
  const headline = isResting && nextStep && nextStep.exercise.id !== step.exercise.id ? lz(nextStep.exercise.name) : exerciseName;
  const headlinePrefix = isResting && nextStep && nextStep.exercise.id !== step.exercise.id ? t.session.nextUp : '';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {headlinePrefix ? (
          <Text variant="label" color={colors.textMuted} upper>
            {headlinePrefix}
          </Text>
        ) : null}
        <Text
          variant="h1"
          upper
          numberOfLines={2}
          adjustsFontSizeToFit
          style={styles.exercise}
          // The headline changes once per step – that is the right granularity
          // for a screen reader announcement (the coach handles the counting).
          accessibilityLiveRegion="polite"
          accessibilityRole="header"
        >
          {headline}
        </Text>
        {setLabel && !isResting ? (
          <Text variant="label" color={colors.textMuted} upper>
            {setLabel}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="h3" color={colors.textMuted} upper>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <BigNumber value={big} color={isPaused ? colors.textDim : color} />

      <Text variant="h3" color={isPaused ? colors.textDim : colors.textMuted} upper align="center">
        {isPaused ? t.session.paused : caption}
      </Text>

      <ProgressBar
        progress={progress}
        color={isPaused ? colors.textDim : color}
        height={18}
        animated={phase !== 'working' || snapshot.target?.kind !== 'reps'}
        style={styles.bar}
      />

      {step.exercise.cue && phase !== 'resting' ? (
        <SlantBox color={colors.surface} padding={spacing.sm} style={styles.cue}>
          <Text variant="bodySmall" color={colors.textMuted} align="center">
            {lz(step.exercise.cue)}
          </Text>
        </SlantBox>
      ) : null}
    </View>
  );
}

function targetText(snapshot: SessionSnapshot, t: ReturnType<typeof useI18n>['t']): string {
  if (!snapshot.target) return '';
  return snapshot.target.kind === 'reps'
    ? `${snapshot.target.reps} ${t.common.reps}`
    : `${snapshot.target.seconds} ${t.common.seconds}`;
}

/** Punches (scale bump) each time the value changes – a visual "tick". */
function BigNumber({ value, color }: { value: string; color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withTiming(1.12, { duration: 70 }), withTiming(1, { duration: 160 }));
  }, [value, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { skewX: '-6deg' }] }));

  const long = value.length > 3;
  return (
    <Animated.Text
      // Not a live region on purpose: the value changes every second and the
      // coach already speaks every rep / countdown – announcing it twice
      // through VoiceOver/TalkBack would drown the coach.
      accessibilityLiveRegion="none"
      style={[styles.big, { color }, long && styles.bigSmall, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      testID="big-number"
    >
      {value}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.sm },
  header: { alignItems: 'center', gap: spacing.xs, minHeight: 96, justifyContent: 'flex-end' },
  exercise: { textAlign: 'center', fontSize: 44, lineHeight: 46 },
  big: {
    fontFamily: fonts.display,
    fontSize: 168,
    lineHeight: 176,
    textAlign: 'center',
    includeFontPadding: false,
  },
  bigSmall: { fontSize: 88, lineHeight: 96,  },
  bar: { marginTop: spacing.sm },
  cue: { marginTop: spacing.md, alignSelf: 'stretch' },
});
