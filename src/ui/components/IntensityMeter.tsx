import { Pressable, StyleSheet, View } from 'react-native';

import { INTENSITY_LEVELS, intensityIndex, intensityLabelKey, type IntensityLevel } from '@/core/intensity/intensity';
import { useI18n } from '@/hooks/useI18n';
import { colors, spacing } from '@/theme';
import { Text } from '@/ui/primitives';

export interface IntensityMeterProps {
  value: IntensityLevel;
  onChange?: (delta: 1 | -1) => void;
  /** Compact variant used inside the active session. */
  compact?: boolean;
}

const LEVEL_COLORS = [colors.rest, colors.success, colors.yellow, colors.orange, colors.red] as const;

/**
 * Five slanted segments + big ± buttons. Designed to be operable without
 * looking: the buttons are huge and always in the same place.
 */
export function IntensityMeter({ value, onChange, compact }: IntensityMeterProps) {
  const { t } = useI18n();
  const idx = intensityIndex(value);
  const label = t.intensity[intensityLabelKey(value)];
  const activeColor = LEVEL_COLORS[idx] ?? colors.red;

  return (
    <View style={styles.root}>
      {!compact ? (
        <View style={styles.header}>
          <Text variant="label" color={colors.textMuted} upper>
            {t.intensity.label}
          </Text>
          <Text variant="h3" color={activeColor} upper>
            {label}
          </Text>
        </View>
      ) : null}

      <View style={styles.row}>
        {onChange ? (
          <StepButton
            label="−"
            accessibilityLabel={t.intensity.down}
            disabled={idx === 0}
            onPress={() => onChange(-1)}
            compact={compact}
          />
        ) : null}

        <View style={styles.segments}>
          {INTENSITY_LEVELS.map((level, i) => (
            <View
              key={level}
              style={[
                styles.segment,
                compact && styles.segmentCompact,
                { backgroundColor: i <= idx ? activeColor : colors.surfaceHigh },
              ]}
            />
          ))}
        </View>

        {onChange ? (
          <StepButton
            label="+"
            accessibilityLabel={t.intensity.up}
            disabled={idx === INTENSITY_LEVELS.length - 1}
            onPress={() => onChange(1)}
            compact={compact}
          />
        ) : null}
      </View>

      {compact ? (
        <Text variant="labelSmall" color={activeColor} upper align="center" style={styles.compactLabel}>
          {t.intensity.label}: {label}
        </Text>
      ) : null}
    </View>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
  compact,
}: {
  label: string;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.stepButton,
        compact && styles.stepButtonCompact,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text variant="h1" color={colors.text} style={styles.stepLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 22, transform: [{ skewX: '-12deg' }], borderRadius: 2 },
  segmentCompact: { height: 14 },
  stepButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 8,
    transform: [{ skewX: '-12deg' }],
  },
  stepButtonCompact: { width: 56, height: 56 },
  stepLabel: { transform: [{ skewX: '12deg' }], lineHeight: 44 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.3 },
  compactLabel: { marginTop: 2 },
});
