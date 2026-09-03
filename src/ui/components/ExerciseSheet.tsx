import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Exercise, MuscleGroup } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { colors, radius, spacing } from '@/theme';
import { Button, Chip, Text } from '@/ui/primitives';

export interface ExerciseSheetProps {
  exercise: Exercise | undefined;
  /** Accent colour of the surrounding workout. */
  color: string;
  /** Text colour that reads well on `color`. */
  onColor?: string;
  /** Optional "3 × 12 · vila 45 s" line for this workout. */
  prescriptionLabel?: string;
  onClose: () => void;
}

/**
 * Bottom sheet with everything the user needs to *perform* an exercise:
 * how-to steps, common mistakes, the cues the coach will use, tempo and the
 * muscles it hits. Opened from the workout overview and (later) the builder.
 */
export function ExerciseSheet({ exercise, color, onColor = colors.text, prescriptionLabel, onClose }: ExerciseSheetProps) {
  const { t, lz } = useI18n();
  const insets = useSafeAreaInsets();
  const visible = exercise !== undefined;
  const instructions = exercise?.instructions;
  const muscles = exercise
    ? (Object.entries(exercise.muscles) as [MuscleGroup, number][])
        .filter(([, load]) => load > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={t.common.close} />
        {exercise ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID="exercise-sheet">
            <View style={[styles.handle, { backgroundColor: color }]} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <Text variant="labelSmall" color={color} upper>
                {t.exerciseSheet.category[exercise.category]}
              </Text>
              <Text variant="h1" upper style={styles.title}>
                {lz(exercise.name)}
              </Text>
              {prescriptionLabel ? (
                <Text variant="bodyBold" color={colors.textMuted}>
                  {prescriptionLabel}
                </Text>
              ) : null}

              {exercise.cue ? (
                <View style={[styles.cueBox, { borderColor: color }]}>
                  <Text variant="labelSmall" color={color} upper>
                    {t.exerciseSheet.keyCue}
                  </Text>
                  <Text variant="h3">{lz(exercise.cue)}</Text>
                </View>
              ) : null}

              {instructions?.steps.length ? (
                <Section title={t.exerciseSheet.howTo} color={color}>
                  {instructions.steps.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={[styles.stepBadge, { backgroundColor: color }]}>
                        <Text variant="labelSmall" color={onColor}>
                          {i + 1}
                        </Text>
                      </View>
                      <Text variant="body" style={styles.stepText}>
                        {lz(step)}
                      </Text>
                    </View>
                  ))}
                </Section>
              ) : null}

              {instructions?.mistakes?.length ? (
                <Section title={t.exerciseSheet.mistakes} color={colors.orange}>
                  {instructions.mistakes.map((m, i) => (
                    <View key={i} style={styles.stepRow}>
                      <Text variant="bodyBold" color={colors.orange} style={styles.bullet}>
                        ✕
                      </Text>
                      <Text variant="body" style={styles.stepText}>
                        {lz(m)}
                      </Text>
                    </View>
                  ))}
                </Section>
              ) : null}

              {instructions?.coachCues?.length || instructions?.tempo ? (
                <Section title={t.exerciseSheet.coachSays} color={color}>
                  <View style={styles.chips}>
                    {instructions.coachCues?.map((c, i) => (
                      <Chip key={i} label={lz(c)} color={color} slanted={false} />
                    ))}
                  </View>
                  {instructions.tempo ? (
                    <Text variant="bodySmall" color={colors.textMuted} style={styles.tempo}>
                      {t.exerciseSheet.tempo}: „{lz(instructions.tempo.down)} … {lz(instructions.tempo.up)}“
                    </Text>
                  ) : null}
                </Section>
              ) : null}

              {muscles.length ? (
                <Section title={t.detail.muscles} color={color}>
                  <View style={styles.chips}>
                    {muscles.map(([muscle, load]) => (
                      <Chip
                        key={muscle}
                        label={`${t.muscles[muscle]}${load >= 0.9 ? '' : ` ${Math.round(load * 100)}%`}`}
                        color={load >= 0.9 ? color : colors.textDim}
                        selected={load >= 0.9}
                        slanted={false}
                      />
                    ))}
                  </View>
                </Section>
              ) : null}
            </ScrollView>
            <Button label={t.common.close} onPress={onClose} variant="secondary" fullWidth testID="exercise-sheet-close" />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color={color} upper style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  handle: { alignSelf: 'center', width: 56, height: 5, borderRadius: 3, transform: [{ skewX: '-12deg' }] },
  content: { gap: spacing.sm, paddingBottom: spacing.md },
  title: { marginTop: 2 },
  cueBox: {
    marginTop: spacing.sm,
    borderLeftWidth: 4,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  section: { marginTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { marginBottom: 2 },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-12deg' }],
    marginTop: 1,
  },
  bullet: { width: 24, textAlign: 'center' },
  stepText: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tempo: { marginTop: spacing.xs },
});
