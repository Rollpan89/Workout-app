import { StyleSheet, View } from 'react-native';

import type { Workout } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { accent, colors, spacing } from '@/theme';
import { Card, Chip, Text } from '@/ui/primitives';

export interface WorkoutCardProps {
  workout: Workout;
  onPress: (workout: Workout) => void;
}

export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  const { t, lz } = useI18n();
  const tone = accent[workout.accent];

  return (
    <Card accentColor={tone.main} onPress={() => onPress(workout)} style={styles.card} testID={`workout-${workout.id}`}>
      {/* Soft colour wash in the top-right corner so cards read as distinct at a glance */}
      
      
      {workout.custom ? (
        <View style={[styles.customTag, { borderColor: tone.main }]}>
          <Text variant="labelSmall" color={tone.main} upper>
            {t.library.customTag}
          </Text>
        </View>
      ) : null}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text variant="h2" upper numberOfLines={1}>
            {lz(workout.title)}
          </Text>
          <Text variant="bodySmall" color={colors.textMuted} numberOfLines={1}>
            {lz(workout.tagline)}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: tone.main }]}>
          <View pointerEvents="none" style={[styles.wash, { backgroundColor: tone.deep }]} />
          <Text variant="stat" color={tone.on} style={styles.badgeNumber}>
            {workout.estimatedMinutes}
          </Text>
          <Text variant="labelSmall" color={tone.on} upper>
            {t.common.minutes}
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        <Chip label={t.goal[workout.goal]} selected color={tone.deep} />
        <Chip label={t.difficulty[workout.difficulty]} />
        <Chip label={t.equipment[workout.equipment[0] ?? 'none']} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
   linearGradient: {
    flex: 1,
    paddingLeft: 15,
    paddingRight: 15,
    borderRadius: 5,
  },
  wash: {
    position: 'absolute',
    right: -105,
    top: -105,
    width: 210,
    height: 210,
    borderRadius: 210,
    opacity: 0.12,
    transform: [{ skewX: '12deg' }],
  },
  customTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: spacing.sm,
    transform: [{ skewX: '-12deg' }],
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleWrap: { flex: 1, gap: 2, paddingLeft: 6 },
  badge: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-12deg' }],
  },
  badgeNumber: { fontSize: 30, lineHeight: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, marginLeft: -3 },
});
