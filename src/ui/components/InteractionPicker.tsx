import { Pressable, StyleSheet, View } from 'react-native';

import { INTERACTION_LEVELS, type InteractionLevel } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { colors, radius, spacing } from '@/theme';
import { Text } from '@/ui/primitives';

export interface InteractionPickerProps {
  value: InteractionLevel;
  onChange: (level: InteractionLevel) => void;
  /** Show descriptions under each option. */
  detailed?: boolean;
}

const ICONS: Record<InteractionLevel, string> = {
  handsFree: '🎧',
  assisted: '👆',
  manual: '✋',
};

export function InteractionPicker({ value, onChange, detailed = true }: InteractionPickerProps) {
  const { t } = useI18n();
  return (
    <View style={styles.root}>
      {INTERACTION_LEVELS.map((level) => {
        const selected = level === value;
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(level)}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
            testID={`interaction-${level}`}
          >
            <View style={styles.optionHeader}>
              <Text variant="h3" style={styles.icon}>
                {ICONS[level]}
              </Text>
              <Text variant="h3" upper color={selected ? colors.text : colors.textMuted}>
                {t.interaction[level]}
              </Text>
              {selected ? <View style={styles.dot} /> : null}
            </View>
            {detailed ? (
              <Text variant="bodySmall" color={colors.textMuted}>
                {t.interaction[`${level}Desc`]}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  selected: { borderColor: colors.red, backgroundColor: colors.redSoft },
  pressed: { opacity: 0.85 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { fontSize: 18 },
  dot: {
    marginLeft: 'auto',
    width: 14,
    height: 14,
    backgroundColor: colors.red,
    transform: [{ skewX: '-12deg' }],
  },
});
