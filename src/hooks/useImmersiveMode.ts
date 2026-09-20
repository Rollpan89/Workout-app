import { useEffect } from 'react';
import { AppState } from 'react-native';

import { setSystemBarsHidden } from '@/adapters/systemUi/systemBars';

/**
 * Keeps the app in immersive mode (system bars hidden) for as long as it is
 * in the foreground.
 *
 * The bars are re-hidden every time the app becomes active because a few
 * things put them back: the system showing them transiently after a swipe, a
 * keyboard, a share sheet or a permission dialog. Hiding is idempotent and
 * cheap, so we just re-assert instead of tracking the state.
 *
 * Swipe in from the top/bottom edge to see the bars again – they hide
 * themselves after a moment (Android `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`).
 */
export function useImmersiveMode(): void {
  useEffect(() => {
    setSystemBarsHidden(true);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setSystemBarsHidden(true);
    });
    return () => subscription.remove();
  }, []);
}
