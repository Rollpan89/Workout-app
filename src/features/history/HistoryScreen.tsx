import { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { getWorkout } from '@/content';
import { summarizeHistory } from '@/core/metrics/metrics';
import { useI18n } from '@/hooks/useI18n';
import { formatDate, formatDuration } from '@/i18n';
import { useHistoryStore } from '@/state/historyStore';
import { colors, spacing } from '@/theme';
import { MuscleImpactBars, StatTile } from '@/ui/components';
import { Button, Card, Screen, SectionTitle, Text } from '@/ui/primitives';

export function HistoryScreen() {
  const { t, lz, locale } = useI18n();
  const logs = useHistoryStore((s) => s.logs);
  const clear = useHistoryStore((s) => s.clear);
  const summary = useMemo(() => summarizeHistory(logs), [logs]);
  const [confirming, setConfirming] = useState(false);

  const askClear = () => {
    if (Platform.OS === 'web') {
      setConfirming(true);
      return;
    }
    Alert.alert(t.history.clear, t.history.clearConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.history.clear, style: 'destructive', onPress: () => void clear() },
    ]);
  };

  return (
    <Screen>
      <Text variant="hero" upper style={styles.heading}>
        {t.history.heading}
      </Text>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="h2" color={colors.textMuted} upper>
            {t.history.empty}
          </Text>
          <Text variant="body" color={colors.textDim}>
            {t.history.emptyHint}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            <StatTile value={summary.streakDays} unit={t.history.days} label={t.history.streak} emphasis />
            <StatTile value={summary.sessions} label={t.history.sessions} />
          </View>
          <View style={styles.grid}>
            <StatTile value={summary.totalCalories} unit={t.common.kcal} label={t.history.totalCalories} color={colors.orange} />
            <StatTile value={`${summary.totalMinutes}`} unit={t.common.minutes} label={t.history.totalTime} />
          </View>

          <SectionTitle title={t.history.muscleBalance} color={colors.orange} />
          <MuscleImpactBars impact={summary.muscleImpact} limit={8} />

          <SectionTitle title={t.history.recent} />
          {logs.map((log) => {
            const workout = getWorkout(log.workoutId);
            return (
              <Card key={log.id} style={styles.row} padding={spacing.md} accentColor={log.completed ? colors.red : colors.textDim}>
                <View style={styles.rowHeader}>
                  <Text variant="h3" upper numberOfLines={1} style={styles.rowTitle}>
                    {workout ? lz(workout.title) : log.workoutId}
                  </Text>
                  <Text variant="labelSmall" color={colors.textDim} upper>
                    {formatDate(log.endedAt, locale)}
                  </Text>
                </View>
                <View style={styles.rowStats}>
                  <Text variant="bodySmall" color={colors.textMuted}>
                    {formatDuration(log.durationSeconds)}
                  </Text>
                  <Text variant="bodySmall" color={colors.textMuted}>
                    {log.estimatedCalories} {t.common.kcal}
                  </Text>
                  <Text variant="bodySmall" color={colors.textMuted}>
                    {log.totalSets} {t.common.sets}
                  </Text>
                  {!log.completed ? (
                    <Text variant="labelSmall" color={colors.orange} upper>
                      {t.history.aborted}
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          })}

          <View style={styles.clear}>
            {confirming ? (
              <View style={styles.confirmRow}>
                <Text variant="bodySmall" color={colors.textMuted} style={styles.confirmText}>
                  {t.history.clearConfirm}
                </Text>
                <Button label={t.common.no} variant="secondary" size="sm" onPress={() => setConfirming(false)} />
                <Button
                  label={t.common.yes}
                  variant="danger"
                  size="sm"
                  onPress={() => {
                    setConfirming(false);
                    void clear();
                  }}
                />
              </View>
            ) : (
              <Button label={t.history.clear} variant="ghost" size="sm" onPress={askClear} />
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 56, lineHeight: 56, marginBottom: spacing.lg },
  empty: { marginTop: spacing.xxl, gap: spacing.sm },
  grid: { flexDirection: 'row', marginHorizontal: -6, marginBottom: spacing.md },
  row: { marginBottom: spacing.sm },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
  rowTitle: { flex: 1 },
  rowStats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs, flexWrap: 'wrap' },
  clear: { marginTop: spacing.xl, alignItems: 'center' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  confirmText: { width: '100%', textAlign: 'center', marginBottom: spacing.sm },
});
