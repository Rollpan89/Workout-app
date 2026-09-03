/**
 * End-to-end flow test: renders the real expo-router tree with the real
 * screens, stores and engine, and walks through
 *   library → workout detail → session (hands-free) → summary → history.
 *
 * Only the platform edges (TTS, haptics, AsyncStorage, fonts) are mocked.
 */
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import { getWorkout } from '@/content';
import { useCustomWorkoutStore } from '@/state/customWorkoutStore';
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
import WorkoutBuilder from '../../app/builder/[id]';
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
  'builder/[id]': WorkoutBuilder,
  session: Session,
  summary: Summary,
};

beforeEach(async () => {
  await AsyncStorage.clear(); // each test starts from a fresh device
  jest.useFakeTimers();
  useSessionStore.getState().reset();
  useHistoryStore.setState({ logs: [], hydrated: false });
  useCustomWorkoutStore.setState({ drafts: [], workouts: [], hydrated: false });
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
    expect(firstLine).toMatch(/^Dags för Core Crusher\. Jag räknar, du kör\. Nästa: /);

    // Get-ready countdown (5 s) → working. The engine ticks every 100 ms.
    await advance(5_500);
    const snap = useSessionStore.getState().snapshot;
    expect(snap?.phase).toBe('working');

    // Bump intensity mid-set – must be announced by the coach
    fireEvent.press(screen.getByLabelText('Hårdare'));
    expect(useSessionStore.getState().snapshot?.intensity).toBe(1.25);
    const spoken = (Speech.speak as jest.Mock).mock.calls.map((c) => c[0] as string);
    // (first step is a timed warm-up, so the coach states the level only – rep sets
    // additionally get "Vi ökar. N repetitioner nu.", covered in Coach.test.ts)
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

  it('rescales reps in the overview when starting intensity changes', async () => {
    renderRouter(routes, { initialUrl: '/workout/full-body-blast' });
    await waitFor(() => expect(screen.getByTestId('start-workout')).toBeTruthy());

    // BODYWEIGHT_FULL: squat 3 × 15 at intensity 1.0
    const row = () => screen.getByTestId('overview-squat-0');
    expect(within(row()).getByText('3 × 15')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Hårdare')); // 1.25 → round(15 × 1.25) = 19
    expect(within(row()).getByText('3 × 19')).toBeTruthy();
    expect(within(row()).getByText('(15)')).toBeTruthy(); // base shown for reference

    fireEvent.press(screen.getByLabelText('Hårdare')); // 1.5 → 23
    expect(within(row()).getByText('3 × 23')).toBeTruthy();

    // "Trött" readiness drops to 0.75 → round(15 × 0.75) = 11
    fireEvent.press(screen.getByText('Trött'));
    expect(within(row()).getByText('3 × 11')).toBeTruthy();

    // Time-based rows scale too: plank 3 × 40 s → 30 s at 0.75
    expect(within(screen.getByTestId('overview-plank-4')).getByText('3 × 30s')).toBeTruthy();

    // Starting the workout carries the chosen intensity into the engine
    fireEvent.press(screen.getByTestId('start-workout'));
    await waitFor(() => expect(useSessionStore.getState().snapshot).toBeDefined());
    expect(useSessionStore.getState().snapshot?.intensity).toBe(0.75);
  });

  it('opens step-by-step instructions when an exercise in the overview is tapped', async () => {
    renderRouter(routes, { initialUrl: '/workout/full-body-blast' });
    await waitFor(() => expect(screen.getByTestId('start-workout')).toBeTruthy());
    expect(screen.queryByTestId('exercise-sheet')).toBeNull();

    fireEvent.press(screen.getByTestId('overview-squat-0'));
    const sheet = await screen.findByTestId('exercise-sheet');
    expect(within(sheet).getByText('Så gör du')).toBeTruthy();
    expect(within(sheet).getByText('Vanliga fel')).toBeTruthy();
    expect(within(sheet).getByText('Coachen säger')).toBeTruthy();
    expect(within(sheet).getByText(/^3 × 15/)).toBeTruthy(); // this workout's prescription
    // Numbered steps + a coach cue chip from the exercise data
    expect(within(sheet).getByText('1')).toBeTruthy();
    expect(within(sheet).getAllByText(/Knäna/).length).toBeGreaterThanOrEqual(2); // step + coach cue

    fireEvent.press(screen.getByTestId('exercise-sheet-close'));
    await waitFor(() => expect(screen.queryByTestId('exercise-sheet')).toBeNull());
  });

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
    expect(spoken[0]).toMatch(/^Time for Mobility Reset\. I count, you move\. Next: /);
    expect(spoken).toContain('Tap when you are ready.');
    const langs = new Set((Speech.speak as jest.Mock).mock.calls.map((c) => c[1]?.language));
    expect(langs).toEqual(new Set(['en-US']));

    fireEvent.press(screen.getByTestId('primary-start-set'));
    expect(useSessionStore.getState().snapshot?.phase).toBe('working');
  }, 30_000);
});

describe('PulseCoach – custom workouts', () => {
  it('builds a workout from scratch, saves it, runs it and deletes it', async () => {
    renderRouter(routes, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByText(/Välj ditt pass/i)).toBeTruthy());
    expect(screen.queryByText('Mina pass')).toBeNull();

    // Library → builder
    fireEvent.press(screen.getByTestId('create-workout'));
    await waitFor(() => expect(screen.getByTestId('builder-name')).toBeTruthy());

    // Validation: nothing filled in yet
    fireEvent.press(screen.getByTestId('builder-save'));
    expect(within(screen.getByTestId('builder-errors')).getByText('Ge passet ett namn.')).toBeTruthy();
    expect(within(screen.getByTestId('builder-errors')).getByText('Lägg till minst en övning.')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('builder-name'), 'Måndagsben');

    // Add two exercises from the library picker (search narrows the list)
    fireEvent.press(screen.getByTestId('builder-add-exercise'));
    await waitFor(() => expect(screen.getByTestId('exercise-picker')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('picker-search'), 'knäb');
    expect(screen.queryByTestId('pick-plank')).toBeNull();
    fireEvent.press(screen.getByTestId('pick-squat'));
    await waitFor(() => expect(screen.getByTestId('draft-row-0')).toBeTruthy());

    fireEvent.press(screen.getByTestId('builder-add-exercise'));
    await waitFor(() => expect(screen.getByTestId('exercise-picker')).toBeTruthy());
    fireEvent.press(screen.getByTestId('pick-plank'));
    await waitFor(() => expect(screen.getByTestId('draft-row-1')).toBeTruthy());

    // Tweak: squat 3 × 10 → 4 × 12, rest 60 → 50
    expect(screen.getByTestId('draft-row-0-sets-value').props.children).toBe(3);
    fireEvent.press(screen.getByTestId('draft-row-0-sets-inc'));
    fireEvent.press(screen.getByTestId('draft-row-0-value-inc'));
    fireEvent.press(screen.getByTestId('draft-row-0-value-inc'));
    fireEvent.press(screen.getByTestId('draft-row-0-rest-dec'));
    fireEvent.press(screen.getByTestId('draft-row-0-rest-dec'));
    expect(screen.getByTestId('draft-row-0-sets-value').props.children).toBe(4);
    expect(screen.getByTestId('draft-row-0-value-value').props.children).toBe(12);
    expect(screen.getByTestId('draft-row-0-rest-value').props.children).toBe(50);

    // Reorder: plank first
    fireEvent.press(screen.getByTestId('draft-row-1-up'));
    expect(within(screen.getByTestId('draft-row-0')).getByText('Planka')).toBeTruthy();

    // Save → lands on the detail page of the new workout
    fireEvent.press(screen.getByTestId('builder-save'));
    await waitFor(() => expect(screen.getByTestId('start-workout')).toBeTruthy());
    expect(screen.getByText('Måndagsben')).toBeTruthy();
    expect(screen.getByTestId('edit-workout')).toBeTruthy();
    const saved = useCustomWorkoutStore.getState().workouts[0];
    expect(saved?.custom).toBe(true);
    expect(saved?.blocks[0]?.exercises.map((e) => e.exerciseId)).toEqual(['plank', 'squat']);
    expect(saved?.blocks[0]?.exercises[1]).toMatchObject({ sets: 4, prescription: { kind: 'reps', reps: 12 }, restSeconds: 50 });

    // Overview shows the custom prescription and scales with intensity
    expect(within(screen.getByTestId('overview-squat-1')).getByText('4 × 12')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Hårdare'));
    expect(within(screen.getByTestId('overview-squat-1')).getByText('4 × 15')).toBeTruthy();

    // It is runnable end-to-end: plank first (reordered, default 3 × 30 s), then 4 squat sets → 7 steps
    fireEvent.press(screen.getByTestId('start-workout'));
    await waitFor(() => expect(screen.getByTestId('big-number')).toBeTruthy());
    expect(useSessionStore.getState().snapshot?.step?.exercise.id).toBe('plank');
    expect(useSessionStore.getState().snapshot?.totalSteps).toBe(7);
    let guard = 0;
    while (useSessionStore.getState().snapshot?.phase !== 'finished' && guard < 20) {
      await act(async () => {
        useSessionStore.getState().skipStep();
      });
      await advance(200);
      guard++;
    }
    await waitFor(() => expect(screen.getByTestId('summary-heading')).toBeTruthy());
    expect(screen.getByText('Måndagsben')).toBeTruthy(); // summary resolves custom workouts too
    fireEvent.press(screen.getByTestId('summary-done'));

    // Back in the library: listed under "Mina pass" with the custom tag
    await waitFor(() => expect(screen.getByText('Mina pass')).toBeTruthy());
    expect(screen.getByText('Eget pass')).toBeTruthy();
    fireEvent.press(screen.getByTestId(`workout-${saved!.id}`));
    await waitFor(() => expect(screen.getByTestId('delete-workout')).toBeTruthy());

    // Delete: native confirm dialog (Platform.OS is ios under jest) → press the destructive button
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });
    fireEvent.press(screen.getByTestId('delete-workout'));
    await waitFor(() => expect(useCustomWorkoutStore.getState().workouts).toHaveLength(0));
    alertSpy.mockRestore();
    await waitFor(() => expect(screen.queryByText('Mina pass')).toBeNull());
  });

  it('copies a built-in workout into an editable draft and persists edits', async () => {
    renderRouter(routes, { initialUrl: '/workout/core-crusher' });
    await waitFor(() => expect(screen.getByTestId('duplicate-workout')).toBeTruthy());
    expect(screen.queryByTestId('edit-workout')).toBeNull(); // built-ins can't be edited in place

    fireEvent.press(screen.getByTestId('duplicate-workout'));
    await waitFor(() => expect(screen.getByTestId('builder-name')).toBeTruthy());
    expect(screen.getByTestId('builder-name').props.value).toBe('Core Crusher (kopia)');
    // Core Crusher = warm-up (2) + 2 rounds × 5 core moves + cooldown (3) → flattened
    const sourceSteps = getWorkout('core-crusher')!.blocks.reduce(
      (n, b) => n + b.exercises.length * Math.max(1, b.rounds ?? 1),
      0,
    );
    await waitFor(() => expect(screen.getByTestId(`draft-row-${sourceSteps - 1}`)).toBeTruthy());

    // Rename + drop the first exercise, then save
    fireEvent.changeText(screen.getByTestId('builder-name'), 'Min core');
    fireEvent.press(screen.getByTestId('draft-row-0-remove'));
    fireEvent.press(screen.getByTestId('builder-save'));
    await waitFor(() => expect(screen.getByText('Min core')).toBeTruthy());

    const mine = useCustomWorkoutStore.getState();
    expect(mine.drafts).toHaveLength(1);
    expect(mine.drafts[0]?.sourceId).toBe('core-crusher');
    expect(mine.drafts[0]?.exercises).toHaveLength(sourceSteps - 1);
    expect(mine.workouts[0]?.accent).not.toBe(getWorkout('core-crusher')!.accent); // gets its own colour

    // Edit again: the builder loads the saved draft
    fireEvent.press(screen.getByTestId('edit-workout'));
    await waitFor(() => expect(screen.getByTestId('builder-name')).toBeTruthy());
    expect(screen.getByTestId('builder-name').props.value).toBe('Min core');
    expect(screen.getByText('Redigera pass')).toBeTruthy();
  });
});
