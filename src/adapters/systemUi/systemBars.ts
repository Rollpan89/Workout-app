import { Platform } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';

/**
 * Immersive mode – the platform edge for "the app owns the whole screen".
 *
 * - **Android**: the navigation bar (back/home/recents) is hidden through
 *   `WindowInsetsControllerCompat` with `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`,
 *   so a swipe in from the bottom edge brings it back until it auto-hides
 *   again. The status bar is hidden the same way by `<StatusBar hidden />`
 *   (see `ui/components/SystemBars.tsx`).
 * - **iOS**: there is no navigation bar to hide; only the status bar goes away
 *   (the home indicator is controlled by the OS and cannot be hidden from JS).
 * - **Web**: browsers have no system bars either; the closest thing is the
 *   Fullscreen API, which we drive from a user gesture (see `armWebFullscreen`).
 *
 * Always fire-and-forget: a cosmetic failure must never break a session.
 */
export function setSystemBarsHidden(hidden: boolean): void {
  if (Platform.OS === 'android') setNavigationBarHidden(hidden);
  if (Platform.OS === 'web') {
    if (hidden) armWebFullscreen();
    else exitWebFullscreen();
  }
}

/** Hide the Android navigation bar (no-op on every other platform). */
function setNavigationBarHidden(hidden: boolean): void {
  try {
    // The module's JS only warns on non-Android builds, so keep the platform
    // check here instead of relying on it.
    NavigationBar.setHidden(hidden);
  } catch (error) {
    // Missing native module (stale build, Expo Go without the module).
    console.warn('[systemBars] navigation bar unavailable', error);
  }
}

let webFullscreenArmed = false;

/**
 * Web only: the Fullscreen API rejects requests that are not made inside a
 * user gesture, so arm it once and fire on the next tap or key press.
 * `document.fullscreenEnabled` is false inside an iframe without
 * `allow="fullscreen"` – then we simply leave the browser chrome alone.
 */
function armWebFullscreen(): void {
  if (webFullscreenArmed) return;
  const doc: Document | undefined = typeof document === 'undefined' ? undefined : document;
  const root = doc?.documentElement;
  if (!doc?.fullscreenEnabled || typeof root?.requestFullscreen !== 'function') return;
  webFullscreenArmed = true;

  const enter = () => {
    doc.removeEventListener('pointerdown', enter);
    doc.removeEventListener('keydown', enter);
    if (doc.fullscreenElement) return;
    root.requestFullscreen().catch(() => undefined); // the browser may refuse
  };
  doc.addEventListener('pointerdown', enter);
  doc.addEventListener('keydown', enter);
}

function exitWebFullscreen(): void {
  const doc: Document | undefined = typeof document === 'undefined' ? undefined : document;
  if (!doc?.fullscreenElement) return;
  doc.exitFullscreen().catch(() => undefined);
}
