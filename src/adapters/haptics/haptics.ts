import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticKind = 'rep' | 'go' | 'done' | 'warn' | 'tap';

/**
 * Fire-and-forget haptic feedback. Silently no-ops on web and when the
 * device has no haptic engine.
 */
export function haptic(kind: HapticKind): void {
  if (Platform.OS === 'web') return;
  const run = async () => {
    switch (kind) {
      case 'rep':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'tap':
        await Haptics.selectionAsync();
        break;
      case 'go':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'done':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warn':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  };
  run().catch(() => {
    /* haptics unavailable */
  });
}
