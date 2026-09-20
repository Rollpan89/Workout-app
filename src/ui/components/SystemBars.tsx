import { StatusBar } from 'expo-status-bar';

import { useImmersiveMode } from '@/hooks/useImmersiveMode';

/**
 * Mount once, at the root: keeps the status bar hidden on every screen and
 * drives the Android navigation bar through `useImmersiveMode`.
 *
 * `Screen` still renders its own `<StatusBar style="light" />` for the icon
 * colour; React Native merges the two and only overrides the props each one
 * actually sets, so `hidden` here is never lost.
 */
export function SystemBars() {
  useImmersiveMode();
  return <StatusBar style="light" hidden />;
}
