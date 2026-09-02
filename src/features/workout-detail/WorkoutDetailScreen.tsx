import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getExercise, getWorkout } from '@/content';
import type { InteractionLevel, ReadinessLevel } from '@/core/domain';
import { buildSessionPlan, estimatePlanDuration } from '@/core/engine/planner';
import { intensityForReadiness, stepIntensity, type IntensityLevel } from '@/core/intensity/intensity';
import { useI18n } from '@/hooks/useI18n';
import { useSessionStore } from '@/state/sessionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { accent, colors, spacing } from '@/theme';
import { IntensityMeter, InteractionPicker } from '@/ui/components';
import { Button, Card, Chip, Screen, SectionTitle, Text } from '@/ui/primitives';

const READINESS: readonly ReadinessLevel[] = ['low', 'normal', 'high'];

export function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lz } = useI18n();
  const defaultInteraction = useSettingsStore((s) => s.settings.interactionLevel);
  const startSession = useSessionStore((s) => s.start);

  const workout = useMemo(() => (id ? getWorkout(id) : undefined), [id]);
  const [readiness, setReadiness] = useState<ReadinessLevel>('normal');
  const [intensity, setIntensity] = useState<IntensityLevel>(intensityForReadiness('normal'));
  const [interaction, setInteraction] = useState<InteractionLevel>(defaultInteraction);

  const plan = useMemo(() => (workout ? buildSessionPlan(workout, getExercise) : undefined), [workout]);
  const minutes = plan ? Math.round(estimatePlanDuration(plan, intensity) / 60) : 0;

  if (!workout || !plan) {
    return (
      <Screen>
        <Text variant="h2">404</Text>
      </Screen>
    );
  }

  const tone = accent[workout.accent];

  const onReadiness = (level: ReadinessLevel) => {
    setReadiness(level);
    setIntensity(intensityForReadiness(level));
  };

  const start = () => {
    startSession({ workout, intensity, interactionLevel: interaction });
    router.replace('/session');
  };

  return (
    <View style={styles.root}>
      <Screen contentStyle={styles.content}>
        <Button label={`‹ ${t.common.back}`} variant="ghost" size="sm" onPress={() => router.back()} />

        <View style={styles.hero}>
          <Text variant="label" color={tone.main} upper>
            {t.goal[workout.goal]} · {t.difficulty[workout.difficulty]}
          </Text>
          <Text variant="hero" upper style={styles.title}>
            {lz(workout.title)}
          </Text>
          <Text variant="body" color={colors.textMuted}>
            {lz(workout.description)}
          </Text>
        </View>

        <View style={styles.facts}>
          <Fact value={`${minutes}`} unit={t.common.minutes} label={t.detail.estimated} color={tone.main} />
          <Fact value={`${plan.steps.length}`} label={t.detail.steps} />
          <Fact value={`${workout.blocks.length}`} label={t.detail.overview} />
        </View>

        <SectionTitle title={t.detail.muscles} color={tone.main} />
        <View style={styles.chips}>
          {workout.primaryMuscles.map((m) => (
            <Chip key={m} label={t.muscles[m]} selected color={tone.deep} />
          ))}
        </View>

        <SectionTitle title={t.detail.equipment} color={tone.main} />
        <View style={styles.chips}>
          {workout.equipment.map((e) => (
            <Chip key={e} label={t.equipment[e]} />
          ))}
        </View>

        <SectionTitle title={t.detail.overview} color={tone.main} />
        {workout.blocks.map((block) => (
          <Card key={block.id} style={styles.block} padding={spacing.md}>
            <View style={styles.blockHeader}>
              <Text variant="h3" upper>
                {lz(block.title)}
              </Text>
              <Text variant="labelSmall" color={colors.textDim} upper>
                {t.blockKind[block.kind]}
                {block.rounds && block.rounds > 1 ? ` · ${block.rounds} ${t.detail.rounds}` : ''}
              </Text>
            </View>
            {block.exercises.map((we, i) => {
              const ex = getExercise(we.exerciseId);
              if (!ex) return null;
              const p = we.prescription;
              return (
                <View key={`${we.exerciseId}-${i}`} style={styles.exerciseRow}>
                  <Text variant="body" style={styles.exerciseName}>
                    {lz(ex.name)}
                  </Text>
                  <Text variant="bodyBold" color={colors.textMuted}>
                    {we.sets} × {p.kind === 'reps' ? `${p.reps}` : `${p.seconds}${t.common.seconds.charAt(0)}`}
                  </Text>
                </View>
              );
            })}
          </Card>
        ))}

        <SectionTitle title={t.detail.readiness} color={tone.main} />
        <View style={styles.chips}>
          {READINESS.map((r) => (
            <Chip
              key={r}
              label={t.detail[`readiness${capitalize(r)}` as 'readinessLow' | 'readinessNormal' | 'readinessHigh']}
              selected={readiness === r}
              onPress={() => onReadiness(r)}
              color={tone.main}
            />
          ))}
        </View>

        <SectionTitle title={t.detail.startIntensity} color={tone.main} />
        <IntensityMeter value={intensity} onChange={(delta) => setIntensity((cur) => stepIntensity(cur, delta))} />

        <SectionTitle title={t.detail.interaction} color={tone.main} />
        <InteractionPicker value={interaction} onChange={setInteraction} />
      </Screen>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label={t.detail.startWorkout} size="xl" fullWidth onPress={start} testID="start-workout" />
      </View>
    </View>
  );
}

function Fact({ value, unit, label, color }: { value: string; unit?: string; label: string; color?: string }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factValueRow}>
        <Text variant="stat" color={color ?? colors.text}>
          {value}
        </Text>
        {unit ? (
          <Text variant="labelSmall" color={colors.textMuted} upper>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="labelSmall" color={colors.textDim} upper>
        {label}
      </Text>
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 140 },
  hero: { gap: spacing.sm, marginTop: spacing.md },
  title: { fontSize: 52, lineHeight: 52 },
  facts: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xl },
  fact: { flex: 1, gap: 2 },
  factValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginLeft: -3 },
  block: { marginBottom: spacing.sm },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  exerciseName: { flex: 1 },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
