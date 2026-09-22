import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { useI18n } from '@/hooks/useI18n';
import { useBuiltInWorkouts, useCustomWorkoutStore } from '@/state/customWorkoutStore';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, spacing } from '@/theme';
import { DeleteButton } from '@/ui/components';
import { Button, Card, Screen, SectionTitle, Text } from '@/ui/primitives';

/**
 * Admin: edit the workouts that ship with the app.
 *
 * This is deliberately *not* part of the athlete flow. Admin mode is a
 * setting; while it is on, each built-in program can be opened in the normal
 * builder and saved as a device-local override. The library, history,
 * summary and the planner all read the overridden version, so the change is
 * felt everywhere – but the shipped content itself is never rewritten.
 */
export function AdminScreen() {
  const router = useRouter();
  const { t, f, lz } = useI18n();
  const adminMode = useSettingsStore((s) => s.settings.adminMode);
  const setAdminMode = useSettingsStore((s) => s.setAdminMode);
  const builtIn = useBuiltInWorkouts();
  const overrides = useCustomWorkoutStore((s) => s.overrides);
  const removeOverride = useCustomWorkoutStore((s) => s.removeOverride);
  const removeAllOverrides = useCustomWorkoutStore((s) => s.removeAllOverrides);
  const overriddenIds = useMemo(() => new Set(overrides.map((o) => o.workoutId)), [overrides]);

  const edit = (workoutId: string) =>
    router.push({ pathname: '/builder/[id]', params: { id: 'new', override: workoutId } });

  return (
    <Screen bottomInset>
      <Button
        label={`‹ ${t.common.back}`}
        variant="ghost"
        size="sm"
        onPress={() => router.back()}
        testID="admin-back"
      />

      <View style={styles.hero}>
        <Text variant="label" color={colors.cyan} upper>
          {t.admin.section}
        </Text>
        <Text variant="hero" upper style={styles.heading}>
          {t.admin.heading}
        </Text>
        <Text variant="body" color={colors.textMuted}>
          {t.admin.subheading}
        </Text>
      </View>

      <Card padding={spacing.md} style={styles.modeCard}>
        <View style={styles.modeRow}>
          <View style={styles.modeText}>
            <Text variant="bodyBold">{t.admin.mode}</Text>
            <Text variant="bodySmall" color={colors.textMuted}>
              {t.admin.modeDesc}
            </Text>
          </View>
          <Switch
            value={adminMode}
            onValueChange={setAdminMode}
            trackColor={{ true: colors.cyan, false: colors.surfaceHigh }}
            thumbColor={colors.text}
            testID="toggle-admin-mode"
          />
        </View>
      </Card>

      {overrides.length > 0 ? (
        <View style={styles.resetAll}>
          <Text variant="bodySmall" color={colors.textMuted}>
            {f(t.builder.customCount, { count: overrides.length })}
          </Text>
          <DeleteButton
            label={t.admin.resetAll}
            confirmMessage={t.admin.resetAllConfirm}
            onConfirm={() => void removeAllOverrides()}
            testID="admin-reset-all"
          />
        </View>
      ) : null}

      <SectionTitle title={t.admin.manage} color={colors.cyan} />

      {builtIn.length === 0 ? (
        <Text variant="body" color={colors.textMuted}>
          {t.admin.none}
        </Text>
      ) : (
        builtIn.map((workout) => (
          <Card
            key={workout.id}
            padding={spacing.md}
            style={styles.row}
            testID={`admin-${workout.id}`}
          >
            <View style={styles.rowHeader}>
              <Text variant="h3" upper numberOfLines={1} style={styles.rowTitle}>
                {lz(workout.title)}
              </Text>
              {overriddenIds.has(workout.id) ? (
                <Text
                  variant="labelSmall"
                  color={colors.cyan}
                  upper
                  testID={`admin-${workout.id}-badge`}
                >
                  {t.admin.overridden}
                </Text>
              ) : null}
            </View>
            <Text variant="bodySmall" color={colors.textMuted}>
              {t.goal[workout.goal]} · {t.difficulty[workout.difficulty]} ·{' '}
              {workout.estimatedMinutes} {t.common.minutes}
            </Text>
            <View style={styles.actions}>
              <Button
                label={t.admin.edit}
                variant="secondary"
                size="sm"
                onPress={() => edit(workout.id)}
                testID={`admin-${workout.id}-edit`}
              />
              {overriddenIds.has(workout.id) ? (
                <DeleteButton
                  label={t.admin.reset}
                  confirmMessage={t.admin.resetConfirm}
                  onConfirm={() => void removeOverride(workout.id)}
                  testID={`admin-${workout.id}-reset`}
                />
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.md },
  heading: { fontSize: 48, lineHeight: 48 },
  modeCard: { marginTop: spacing.lg },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modeText: { flex: 1, gap: 2 },
  resetAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  row: { marginBottom: spacing.sm },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowTitle: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
});
