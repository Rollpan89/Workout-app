/**
 * Immersive mode: the app owns the whole screen, but the user can still drag
 * the system bars back in from the edge (Android: BEHAVIOR_SHOW_TRANSIENT_
 * BARS_BY_SWIPE). These tests pin the platform contract – the swipe gesture
 * itself can only be verified on a device.
 */
import { act, render } from '@testing-library/react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { AppState, Platform } from 'react-native';

import { setSystemBarsHidden } from '@/adapters/systemUi/systemBars';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import { SystemBars } from '@/ui/components/SystemBars';

const setHidden = NavigationBar.setHidden as unknown as jest.Mock;

jest.mock('expo-status-bar', () => ({ StatusBar: jest.fn(() => null) }));

type Listener = (state: string) => void;

function Probe() {
  useImmersiveMode();
  return null;
}

/** Captures the AppState listeners the hook registers, so tests can drive them. */
function captureAppState() {
  const listeners: Listener[] = [];
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    listener: Listener,
  ) => {
    listeners.push(listener);
    return { remove: () => undefined };
  }) as unknown as typeof AppState.addEventListener);
  return { listeners, spy };
}

function statusBarProps() {
  return (StatusBar as unknown as jest.Mock).mock.calls.at(-1)?.[0];
}

describe('immersive mode – Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
    setHidden.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('hides the navigation bar', () => {
    setSystemBarsHidden(true);

    expect(setHidden).toHaveBeenCalledTimes(1);
    expect(setHidden).toHaveBeenCalledWith(true);
  });

  it('shows it again when immersive mode is released', () => {
    setSystemBarsHidden(false);

    expect(setHidden).toHaveBeenCalledWith(false);
  });

  it('re-hides the bars every time the app comes back to the foreground', () => {
    const { listeners } = captureAppState();
    render(<Probe />);
    setHidden.mockClear();

    act(() => listeners.forEach((listener) => listener('active')));

    expect(listeners).toHaveLength(1);
    expect(setHidden).toHaveBeenCalledWith(true);
  });

  it('leaves the bars alone while the app is in the background', () => {
    const { listeners } = captureAppState();
    render(<Probe />);
    setHidden.mockClear();

    act(() => listeners.forEach((listener) => listener('background')));

    expect(setHidden).not.toHaveBeenCalled();
  });
});

describe('immersive mode – iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    setHidden.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('never touches the Android-only navigation bar module', () => {
    setSystemBarsHidden(true);
    setSystemBarsHidden(false);

    expect(setHidden).not.toHaveBeenCalled();
  });

  it('still hides the status bar', () => {
    render(<SystemBars />);

    expect(statusBarProps()).toMatchObject({ hidden: true, style: 'light' });
  });
});
