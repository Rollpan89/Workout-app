/**
 * End-to-end flow test: renders the real expo-router tree with the real
 * screens, stores and engine, and walks through
 *   library → workout detail → session (hands-free) → summary → history.
 *
 * Only the platform edges (TTS, haptics, AsyncStorage, fonts) are mocked.
 */
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as Speech from 'expo-speech';

import { getWorkout } from '@/content';
import { useHistoryStore } from '@/state/historyStore';
import { useSessionStore } from '@/state/sessionStore';
import { useSettingsStore } from '@/state/settingsStore';

import RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import History from '../../app/(tabs)/history';
import Library from '../../app/(tabs)/index';
import Settings from '../../app/(tabs)/settings';
import Session from '../../app/session';
import Summary from '../../app/summary';
import WorkoutDetail from '../../app/workout/[id]';

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: () => Promise.resolve(),
  hideAsync: () => Promise.resolve(),
}));

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Library,
  '(tabs)/history': History,
  '(tabs)/settings': Settings,
  'workout/[id]': WorkoutDetail,
  session: Session,
  summary: Summary,
};

beforeEach(() => {
  jest.useFakeTimers();
  useSessionStore.getState().reset();
  useHistoryStore.setState({ logs: [], hydrated: false });
  useSettingsStore.setState({ hydrated: false });
  (Speech.speak as jest.Mock).mockClear();
});

afterEach(() => {
  useSessionStore.getState().reset();
  jest.useRealTimers();
});

async function advance(ms: number, step = 500) {
  for (let t = 0; t < ms; t += step) {
    await act(async () => {
      jest.advanceTimersByTime(step);
    });
  }
}

describe('PulseCoach – core flow', () => {
  it('walks from the library through a whole session to the summary and history', async () => {
    renderRouter(routes, { initialUrl: '/' });

    // Library renders after hydration
    await waitFor(() => expect(screen.getByText(/Välj ditt pass/i)).toBeTruthy());
    expect(screen.getByText('Core Crusher')).toBeTruthy();

    // Open Core Crusher (short program – fastest to run through)
    fireEvent.press(screen.getByTestId('workout-core-crusher'));
    await waitFor(() => expect(screen.getByTestId('start-workout')).toBeTruthy());
    expect(screen.getByText(/Starta passet/i)).toBeTruthy();

    // Hands-free is the default; start the workout
    fireEvent.press(screen.getByTestId('start-workout'));
    await waitFor(() => expect(screen.getByTestId('big-number')).toBeTruthy());

    // Coach has announced the first exercise
    await waitFor(() => expect(Speech.speak).toHaveBeenCalled());
    const firstLine = (Speech.speak as jest.Mock).mock.calls[0]?.[0] as string;
    expect(firstLine).toMatch(/^Nästa: /);

    // Get-ready countdown (5 s) → working. The engine ticks every 100 ms.
    await advance(5_500);
    const snap = useSessionStore.getState().snapshot;
    expect(snap?.phase).toBe('working');

    // Bump intensity mid-set – must be announced by the coach
    fireEvent.press(screen.getByLabelText('Hårdare'));
    expect(useSessionStore.getState().snapshot?.intensity).toBe(1.2);
    const spoken = (Speech.speak as jest.Mock).mock.calls.map((c) => c[0] as string);
    expect(spoken).toContain('Intensitet: hård.');

    // Pause / resume
    fireEvent.press(screen.getByTestId('toggle-pause'));
    expect(useSessionStore.getState().snapshot?.phase).toBe('paused');
    fireEvent.press(screen.getByTestId('primary-resume'));
    expect(useSessionStore.getState().snapshot?.phase).toBe('working');

    // Fast-forward through the rest of the programme using skip (deterministic)
    let guard = 0;
    while (useSessionStore.getState().snapshot?.phase !== 'finished' && guard < 60) {
      await act(async () => {
        useSessionStore.getState().skipStep();
      });
      await advance(200);
      guard++;
    }
    expect(useSessionStore.getState().snapshot?.phase).toBe('finished');

    // Summary appears with computed metrics and the log is persisted
    await waitFor(() => expect(screen.getByTestId('summary-heading')).toBeTruthy());
    expect(screen.getByText(/Grymt jobbat!/i)).toBeTruthy();
    const result = useSessionStore.getState().result;
    expect(result).toBeDefined();
    expect(result?.completed).toBe(true);
    expect(result?.workoutId).toBe('core-crusher');
    expect(result?.estimatedCalories).toBeGreaterThanOrEqual(0);
    await waitFor(() => expect(useHistoryStore.getState().logs).toHaveLength(1));

    // Back to library, then history shows the session
    fireEvent.press(screen.getByTestId('summary-done'));
    await waitFor(() => expect(screen.getByText(/Välj ditt pass/i)).toBeTruthy());
    fireEvent.press(screen.getByText('Historik'));
    await waitFor(() => expect(screen.getByText(/Din historik/i)).toBeTruthy());
    expect(screen.getByText('Core Crusher')).toBeTruthy();
  }, 30_000);

  it('persists locale + interaction level from settings', async () => {
    renderRouter(routes, { initialUrl: '/settings' });
    await waitFor(() => expect(screen.getByText('Engelska')).toBeTruthy());

    fireEvent.press(screen.getByText('Engelska'));
    await waitFor(() => expect(screen.getByText('Swedish')).toBeTruthy());
    fireEvent.press(screen.getByTestId('interaction-assisted'));

    const { settings } = useSettingsStore.getState();
    expect(settings.locale).toBe('en');
    expect(settings.interactionLevel).toBe('assisted');
  });

  it('runs an assisted session in English: waits for a tap before every set', async () => {
    // Render first: renderRouter (re)installs fake timers and the root layout
    // hydrates settings from storage, so we must apply overrides afterwards.
    renderRouter(routes, { initialUrl: '/' });
    await waitFor(() => expect(useSettingsStore.getState().hydrated).toBe(true));
    act(() => {
      useSettingsStore.getState().setLocale('en');
      useSettingsStore.getState().setInteractionLevel('assisted');
    });

    const workout = getWorkout('mobility-reset');
    if (!workout) throw new Error('fixture missing');
    act(() => {
      useSessionStore.getState().start({ workout });
      router.replace('/session');
    });
    await waitFor(() => expect(screen.getByTestId('big-number')).toBeTruthy());

    await advance(5_500); // get-ready countdown
    expect(useSessionStore.getState().snapshot?.phase).toBe('awaitingStart');
    expect(screen.getByTestId('primary-start-set')).toBeTruthy();

    // Waiting does not start the set on its own
    await advance(10_000);
    expect(useSessionStore.getState().snapshot?.phase).toBe('awaitingStart');

    const spoken = (Speech.speak as jest.Mock).mock.calls.map((c) => c[0] as string);
    expect(spoken[0]).toMatch(/^Next: /);
    expect(spoken).toContain('Tap when you are ready.');
    const langs = new Set((Speech.speak as jest.Mock).mock.calls.map((c) => c[1]?.language));
    expect(langs).toEqual(new Set(['en-US']));

    fireEvent.press(screen.getByTestId('primary-start-set'));
    expect(useSessionStore.getState().snapshot?.phase).toBe('working');
  }, 30_000);
});
