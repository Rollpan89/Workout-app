import { Pressable, StyleSheet, View } from 'react-native';

import type { DraftExercise, Exercise } from '@/core/domain';
import { clamp, DRAFT_LIMITS } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { colors, radius, spacing } from '@/theme';
import { Card, Chip, Text } from '@/ui/primitives';

export interface DraftExerciseRowProps {
  index: number;
  total: number;
  item: DraftExercise;
  exercise: Exercise;
  color: string;
  onChange: (next: DraftExercise) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onOpenInfo: () => void;
}

/** One editable exercise line in the builder: sets · reps/seconds · rest. */
export function DraftExerciseRow({ index, total, item, exercise, color, onChange, onRemove, onMove, onOpenInfo }: DraftExerciseRowProps) {
  const { t, lz } = useI18n();
  const isReps = item.prescription.kind === 'reps';
  const value = item.prescription.kind === 'reps' ? item.prescription.reps : item.prescription.seconds;

  const setValue = (next: number) => {
    if (isReps) onChange({ ...item, prescription: { kind: 'reps', reps: clamp(next, DRAFT_LIMITS.reps.min, DRAFT_LIMITS.reps.max) } });
    else onChange({ ...item, prescription: { kind: 'time', seconds: clamp(next, DRAFT_LIMITS.seconds.min, DRAFT_LIMITS.seconds.max) } });
  };

  const setMode = (kind: 'reps' | 'time') => {
    if (kind === item.prescription.kind) return;
    onChange({
      ...item,
      prescription:
        kind === 'reps'
          ? { kind: 'reps', reps: clamp(value / Math.max(1, exercise.secondsPerRep), DRAFT_LIMITS.reps.min, DRAFT_LIMITS.reps.max) }
          : { kind: 'time', seconds: clamp(value * exercise.secondsPerRep, DRAFT_LIMITS.seconds.min, DRAFT_LIMITS.seconds.max) },
    });
  };

  return (
    <Card padding={spacing.md} style={styles.card} testID={`draft-row-${index}`}>
      <View style={styles.header}>
        <View style={[styles.indexBadge, { backgroundColor: color }]}>
          <Text variant="labelSmall" color={colors.bg}>
            {index + 1}
          </Text>
        </View>
        <Pressable onPress={onOpenInfo} style={styles.titleWrap} accessibilityRole="button" accessibilityHint={t.exerciseSheet.tapForInstructions}>
          <Text variant="h3" upper numberOfLines={1}>
            {lz(exercise.name)}
          </Text>
          <Text variant="labelSmall" color={colors.textDim} upper>
            {t.exerciseSheet.category[exercise.category]} · ⓘ
          </Text>
        </Pressable>
        <View style={styles.orderButtons}>
          <IconButton label="↑" a11y={t.builder.moveUp} disabled={index === 0} onPress={() => onMove(-1)} testID={`draft-row-${index}-up`} />
          <IconButton label="↓" a11y={t.builder.moveDown} disabled={index === total - 1} onPress={() => onMove(1)} testID={`draft-row-${index}-down`} />
          <IconButton label="✕" a11y={t.builder.removeExercise} onPress={onRemove} danger testID={`draft-row-${index}-remove`} />
        </View>
      </View>

      <View style={styles.controls}>
        <Stepper
          label={t.builder.sets}
          value={item.sets}
          color={color}
          onChange={(n) => onChange({ ...item, sets: clamp(n, DRAFT_LIMITS.sets.min, DRAFT_LIMITS.sets.max) })}
          testID={`draft-row-${index}-sets`}
        />
        <Stepper
          label={isReps ? t.builder.reps : t.builder.seconds}
          value={value}
          step={isReps ? 1 : 5}
          color={color}
          onChange={setValue}
          testID={`draft-row-${index}-value`}
        />
        <Stepper
          label={`${t.builder.rest} (${t.common.seconds})`}
          value={item.restSeconds}
          step={5}
          color={color}
          onChange={(n) => onChange({ ...item, restSeconds: clamp(n, DRAFT_LIMITS.rest.min, DRAFT_LIMITS.rest.max) })}
          testID={`draft-row-${index}-rest`}
        />
      </View>

      <View style={styles.modeRow}>
        <Text variant="labelSmall" color={colors.textDim} upper>
          {t.builder.mode}
        </Text>
        <Chip label={t.builder.modeReps} selected={isReps} color={color} onPress={() => setMode('reps')} />
        <Chip label={t.builder.modeTime} selected={!isReps} color={color} onPress={() => setMode('time')} />
      </View>
    </Card>
  );
}

function Stepper({
  label,
  value,
  step = 1,
  color,
  onChange,
  testID,
}: {
  label: string;
  value: number;
  step?: number;
  color: string;
  onChange: (next: number) => void;
  testID: string;
}) {
  return (
    <View style={styles.stepper}>
      <Text variant="labelSmall" color={colors.textDim} upper numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(value - step)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${label} −`}
          testID={`${testID}-dec`}
        >
          <Text variant="h3" color={colors.text}>
            −
          </Text>
        </Pressable>
        <Text variant="stat" color={color} style={styles.stepValue} testID={`${testID}-value`}>
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(value + step)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${label} +`}
          testID={`${testID}-inc`}
        >
          <Text variant="h3" color={colors.text}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function IconButton({
  label,
  a11y,
  onPress,
  disabled,
  danger,
  testID,
}: {
  label: string;
  a11y: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.iconBtn, disabled && styles.iconBtnDisabled, pressed && styles.pressed]}
      testID={testID}
    >
      <Text variant="bodyBold" color={danger ? colors.red : colors.textMuted}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-12deg' }],
  },
  titleWrap: { flex: 1, gap: 2 },
  orderButtons: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: { opacity: 0.3 },
  pressed: { opacity: 0.6 },
  controls: { flexDirection: 'row', gap: spacing.sm },
  stepper: { flex: 1, gap: 4 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: 2,
  },
  stepBtn: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 24, lineHeight: 26, minWidth: 36, textAlign: 'center' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: -3 },
});
