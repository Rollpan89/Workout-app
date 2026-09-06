import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EXERCISES } from '@/content';
import type { Exercise, ExerciseCategory } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { colors, fonts, radius, spacing } from '@/theme';
import { Button, Chip, Text } from '@/ui/primitives';

const CATEGORIES: readonly ExerciseCategory[] = ['strength', 'core', 'cardio', 'mobility'];

export interface ExercisePickerProps {
  visible: boolean;
  color: string;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

/** Searchable, category-filtered list of the exercise library. */
export function ExercisePicker({ visible, color, onPick, onClose }: ExercisePickerProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Mounted only while open → search/filter state starts fresh every time */}
      {visible ? <PickerContent color={color} onPick={onPick} onClose={onClose} /> : null}
    </Modal>
  );
}

function PickerContent({ color, onPick, onClose }: Omit<ExercisePickerProps, 'visible'>) {
  const { t, lz } = useI18n();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => category === 'all' || e.category === category).filter(
      (e) => q.length === 0 || lz(e.name).toLowerCase().includes(q) || e.id.includes(q),
    );
  }, [query, category, lz]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]} testID="exercise-picker">
        <View style={styles.header}>
          <Text variant="h1" upper>
            {t.builder.pickExercise}
          </Text>
          <Button label={t.common.close} variant="ghost" size="sm" onPress={onClose} testID="picker-close" />
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.builder.searchPlaceholder}
          placeholderTextColor={colors.textDim}
          style={styles.search}
          autoCorrect={false}
          returnKeyType="search"
          testID="picker-search"
        />

        <View style={styles.filters}>
          <Chip label={t.builder.allCategories} selected={category === 'all'} color={color} onPress={() => setCategory('all')} />
          {CATEGORIES.map((c) => (
            <Chip key={c} label={t.exerciseSheet.category[c]} selected={category === c} color={color} onPress={() => setCategory(c)} />
          ))}
        </View>

        <FlatList
          data={results}
          keyExtractor={(exercise) => exercise.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={5}
          renderItem={({ item: exercise }) => (
            <Pressable
              onPress={() => onPick(exercise)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              testID={`pick-${exercise.id}`}
            >
              <View style={styles.rowText}>
                <Text variant="bodyBold">{lz(exercise.name)}</Text>
                <Text variant="labelSmall" color={colors.textDim} upper>
                  {t.exerciseSheet.category[exercise.category]}
                  {' · '}
                  {exercise.equipment.map((e) => t.equipment[e]).join(', ')}
                </Text>
              </View>
              <Text variant="h2" color={color}>
                +
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text variant="body" color={colors.textMuted} style={styles.empty}>
              {t.library.empty}
            </Text>
          }
        />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginLeft: -3 },
  list: { paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceHigh,
    gap: spacing.md,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', marginTop: spacing.xl },
});
