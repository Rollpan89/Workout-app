import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getShare, type ShareOutcome } from '@/adapters';
import { encodeWorkoutShareCode } from '@/core/domain';
import type { Workout } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { useCustomWorkoutStore } from '@/state/customWorkoutStore';
import { accent, colors, radius, spacing } from '@/theme';
import { Button, Text } from '@/ui/primitives';

export interface ShareWorkoutModalProps {
  /** The custom workout to share; undefined closes the modal. */
  workout: Workout | undefined;
  onClose: () => void;
}

type Status = 'idle' | ShareOutcome | 'copyFailed';

/**
 * "Dela passet": shows the share code for a custom workout and hands it to
 * the platform share sheet – or the clipboard. The code itself is always on
 * screen, which also covers platforms where neither is available (the user
 * can select and copy it by hand).
 */
export function ShareWorkoutModal({ workout, onClose }: ShareWorkoutModalProps) {
  const { t, lz } = useI18n();
  const insets = useSafeAreaInsets();
  const draft = useCustomWorkoutStore((s) => (workout ? s.getDraft(workout.id) : undefined));
  const code = useMemo(() => (draft ? encodeWorkoutShareCode(draft) : ''), [draft]);
  const [status, setStatus] = useState<Status>('idle');
  const tone = accent[workout?.accent ?? 'red'];

  if (!workout || !draft) return null;

  const statusText: string | undefined =
    status === 'copied'
      ? t.share.copied
      : status === 'copyFailed'
        ? t.share.copyFailed
        : status === 'unavailable'
          ? t.share.unavailable
          : status === 'shared'
            ? t.share.copied
            : undefined;

  const copy = async () => {
    setStatus((await getShare().copyText(code)) ? 'copied' : 'copyFailed');
  };

  const share = async () => {
    const outcome = await getShare().shareText(code, lz(workout.title));
    // A share sheet that was dismissed leaves the code on screen for a retry.
    setStatus(outcome === 'dismissed' ? 'idle' : outcome);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={t.common.close} />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          testID="share-modal"
        >
          <View style={[styles.handle, { backgroundColor: tone.main }]} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text variant="labelSmall" color={tone.main} upper>
              {lz(workout.title)}
            </Text>
            <Text variant="h1" upper>
              {t.share.title}
            </Text>
            <Text variant="body" color={colors.textMuted}>
              {t.share.body}
            </Text>

            <Text variant="label" color={colors.textMuted} upper style={styles.label}>
              {t.share.code}
            </Text>
            <View style={styles.codeBox}>
              <Text variant="bodySmall" selectable testID="share-code" style={styles.code}>
                {code}
              </Text>
            </View>
            {statusText ? (
              <Text
                variant="bodySmall"
                color={status === 'copied' ? colors.success : colors.orange}
                testID="share-status"
              >
                {statusText}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Button
              label={t.share.copy}
              variant="secondary"
              onPress={() => void copy()}
              testID="share-copy"
            />
            <Button
              label={t.share.shareSheet}
              color={tone.main}
              onPress={() => void share()}
              testID="share-sheet"
            />
          </View>
          <Button
            label={t.common.close}
            variant="ghost"
            fullWidth
            onPress={onClose}
            testID="share-close"
          />
        </View>
      </View>
    </Modal>
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
  handle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 3,
    transform: [{ skewX: '-12deg' }],
  },
  content: { gap: spacing.sm, paddingBottom: spacing.md },
  label: { marginTop: spacing.sm },
  codeBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  code: { color: colors.textMuted },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
