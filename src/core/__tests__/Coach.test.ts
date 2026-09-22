import { Coach } from '../coach/Coach';
import { restDurationText } from '../coach/script';
import { SilentSpeech, type SpeechPort, type SpeechUtterance } from '../coach/SpeechPort';
import { DEFAULT_SETTINGS, lz, type Exercise, type Workout, type WorkoutBlock } from '../domain';
import type { InteractionLevel } from '../domain/settings';
import { buildSessionPlan } from '../engine/planner';
import { SessionEngine } from '../engine/SessionEngine';
import { BLOCK_MAIN, EX_PLANK, EX_SQUAT, FakeClock, plan } from '../testing/fixtures';

interface SetupOptions {
  locale?: 'sv' | 'en';
  voice?: Partial<typeof DEFAULT_SETTINGS.voice>;
  userName?: string;
  interactionLevel?: InteractionLevel;
  workout?: Workout;
  lookup?: (id: string) => Exercise | undefined;
  random?: () => number;
}

function setup(options: SetupOptions = {}) {
  const clock = new FakeClock();
  const engine = new SessionEngine({
    plan: options.workout ? buildSessionPlan(options.workout, options.lookup ?? (() => undefined)) : plan(),
    interactionLevel: options.interactionLevel ?? 'handsFree',
    now: clock.now,
    getReadySeconds: 3,
  });
  const speech = new SilentSpeech();
  const coach = new Coach({
    speech,
    locale: options.locale ?? 'sv',
    voice: { ...DEFAULT_SETTINGS.voice, motivation: false, ...options.voice },
    userName: options.userName,
    random: options.random ?? (() => 0.99),
  });
  coach.attach(engine);
  const texts = () => speech.spoken.map((u) => u.text);
  const run = (ms: number, step = 100) => {
    for (let t = 0; t < ms; t += step) {
      clock.advance(step);
      engine.tick(clock.now());
    }
  };
  return { engine, speech, coach, texts, run, clock };
}

/** A slow squat with technique cues + tempo words, 10 reps × 2 sets. */
const EX_SLOW_SQUAT: Exercise = {
  ...EX_SQUAT,
  id: 'slow-squat',
  secondsPerRep: 3,
  instructions: {
    steps: [lz('Stå höftbrett.', 'Stand hip width.')],
    coachCues: [lz('Knäna utåt.', 'Knees out.'), lz('Hela foten i golvet.', 'Whole foot down.')],
    tempo: { down: lz('ner', 'down'), up: lz('upp', 'up') },
  },
};

const BLOCK_SLOW: WorkoutBlock = {
  id: 'slow',
  title: lz('Styrka', 'Strength'),
  kind: 'main',
  restSeconds: 10,
  transitionSeconds: 0,
  exercises: [{ exerciseId: 'slow-squat', sets: 2, prescription: { kind: 'reps', reps: 10 } }],
};

const WORKOUT_SLOW: Workout = {
  id: 'slow',
  title: lz('Långsamt', 'Slow'),
  tagline: lz('', ''),
  description: lz('', ''),
  goal: 'strength',
  difficulty: 'beginner',
  equipment: ['none'],
  primaryMuscles: ['quads'],
  blocks: [BLOCK_SLOW],
  estimatedMinutes: 3,
  accent: 'violet',
};

const slowLookup = (id: string) => [EX_SLOW_SQUAT, EX_PLANK].find((e) => e.id === id);

/** A squat workout whose rest is `seconds` long – for the rest-speech tests. */
function restWorkout(seconds: number): Workout {
  return {
    ...WORKOUT_SLOW,
    id: `rest-${seconds}`,
    blocks: [
      {
        ...BLOCK_SLOW,
        restSeconds: seconds,
        exercises: [{ exerciseId: 'slow-squat', sets: 2, prescription: { kind: 'reps', reps: 5 } }],
      },
    ],
  };
}

/** Plank with a key cue and how-to step for pre-countdown guidance tests. */
const EX_PLANK_CUED: Exercise = {
  ...EX_PLANK,
  cue: lz('Spänn magen.', 'Brace the core.'),
  instructions: {
    steps: [lz('Underarmarna i golvet.', 'Forearms on the floor.')],
    coachCues: [lz('Rak linje.', 'Straight line.'), lz('Spänn magen.', 'Brace the core.'), lz('Andas lugnt.', 'Breathe calmly.')],
  },
};
const cuedLookup = (id: string) => [EX_SQUAT, EX_PLANK_CUED].find((e) => e.id === id);
const WORKOUT_CUED: Workout = { ...WORKOUT_SLOW, id: 'cued', blocks: [BLOCK_MAIN] };

class DeferredSpeech implements SpeechPort {
  readonly spoken: SpeechUtterance[] = [];
  private onDone?: () => void;

  speak(utterance: SpeechUtterance): void {
    this.spoken.push(utterance);
    this.onDone = utterance.onDone;
  }

  stop(): void {
    this.onDone = undefined;
  }

  isSpeaking(): boolean {
    return this.onDone !== undefined;
  }

  finish(): void {
    const done = this.onDone;
    this.onDone = undefined;
    done?.();
  }
}

describe('Coach – announcements', () => {
  it('greets, then introduces the exercise with target, set number and brief guidance in Swedish', () => {
    const { engine, texts } = setup();
    engine.start();
    expect(texts()).toEqual([
      'Dags för Test. Jag räknar, du kör. Nästa: Knäböj. 5 repetitioner. Set 1 av 2. Bröstet upp.',
    ]);
  });

  it('greets the user by name when a profile name is set', () => {
    const { engine, texts } = setup({ userName: '  Anna ' });
    engine.start();
    expect(texts()[0]).toMatch(/^Hej Anna! Dags för Test\. Jag räknar, du kör\. Nästa: /);
  });

  it('speaks English when locale is en', () => {
    const { engine, texts, speech } = setup({ locale: 'en' });
    engine.start();
    expect(texts()[0]).toBe('Time for Test. I count, you move. Next: Squat. 5 reps. Set 1 of 2. Chest up.');
    expect(speech.spoken[0]?.language).toBe('en-US');
  });

  it('keeps the introduction and guidance in one interrupting utterance', () => {
    const { engine, speech } = setup();
    engine.start();
    expect(speech.spoken.map((u) => u.priority)).toEqual(['interrupt']);
  });
});

describe('Coach – counting', () => {
  it('counts down, says go, then counts each rep and "last"', () => {
    const { engine, texts, run, speech } = setup();
    engine.start();
    speech.spoken.length = 0;
    run(3_000); // countdown + start
    run(10_000); // 5 reps @ 2 s
    expect(texts()).toEqual([
      'tre',
      'två',
      'ett',
      'Kör!',
      'ett',
      'två',
      'tre',
      'fyra',
      'Sista!',
      'Där satt den.', // varied praise (random = 0.99 → last variant)
      'Vila 10 sekunder.',
      'Ett set kvar.',
    ]);
  });

  it('only counts milestones when countEveryRep is off', () => {
    const { engine, texts, run, speech } = setup({ voice: { countEveryRep: false } });
    engine.start();
    run(3_000);
    speech.spoken.length = 0;
    run(10_000);
    expect(texts()).toEqual(['ett', 'Sista!', 'Där satt den.', 'Vila 10 sekunder.', 'Ett set kvar.']);
  });

  it('rep numbers always interrupt so the count is never late', () => {
    const { engine, speech, run } = setup();
    engine.start();
    run(3_000);
    speech.spoken.length = 0;
    run(10_000);
    const numbers = speech.spoken.filter((u) => ['ett', 'två', 'tre', 'fyra', 'Sista!'].includes(u.text));
    expect(numbers.every((u) => u.priority === 'interrupt')).toBe(true);
  });

  it('announces set 2 and "last set" in hands-free mode', () => {
    const { engine, texts, run, speech } = setup();
    engine.start();
    run(3_000 + 10_000 + 9_900); // countdown, set 1, most of the rest
    speech.spoken.length = 0;
    run(200); // rest ends → set 2 starts straight away (no re-announce in hands-free)
    expect(texts().slice(0, 3)).toEqual(['Okej, vilan är över. Set 2 av 2.', 'Sista setet. Ge allt!', 'Kör!']);
  });
});

describe('Coach – instructions before countdown', () => {
  it('waits for the spoken introduction to finish before starting 3-2-1', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({ plan: plan(), interactionLevel: 'handsFree', now: clock.now, getReadySeconds: 3 });
    const speech = new DeferredSpeech();
    const coach = new Coach({
      speech,
      locale: 'sv',
      voice: { ...DEFAULT_SETTINGS.voice, motivation: false, nextExerciseInstructions: 'brief' },
      random: () => 0.99,
    });
    coach.attach(engine);

    engine.start();
    expect(speech.spoken.map((u) => u.text)).toEqual([
      'Dags för Test. Jag räknar, du kör. Nästa: Knäböj. 5 repetitioner. Set 1 av 2. Bröstet upp.',
    ]);

    clock.advance(10_000);
    engine.tick(clock.now());
    expect(speech.spoken).toHaveLength(1); // countdown remains held

    speech.finish();
    engine.tick(clock.now());
    expect(speech.spoken.map((u) => u.text)).toEqual([
      'Dags för Test. Jag räknar, du kör. Nästa: Knäböj. 5 repetitioner. Set 1 av 2. Bröstet upp.',
      'tre',
    ]);
  });
});

describe('Coach – involvement during a set', () => {
  it('drops technique cues after every third rep in the first half, then pushes in the second half', () => {
    const { engine, texts, run, speech } = setup({
      workout: WORKOUT_SLOW,
      lookup: slowLookup,
      voice: { motivation: true, tempoCues: false },
      random: () => 0.5,
    });
    engine.start();
    run(3_000);
    speech.spoken.length = 0;
    run(30_000); // 10 reps @ 3 s
    expect(texts()).toEqual([
      'ett',
      'två',
      'tre',
      'Knäna utåt.', // technique cue, first half
      'fyra',
      'fem',
      'Halvvägs!',
      'Snygg form.', // short early praise
      'sex',
      'sju',
      'Pressa på!', // push, second half
      'åtta',
      'Två kvar!',
      'Sista!',
      'Så ska det se ut.',
      'Vila 10 sekunder.',
      'Ett set kvar.',
      'Fokus. Andas.', // rest-time motivation (first one in the session)
    ]);
  });

  it('uses the user’s name in late-set pushes', () => {
    const { engine, texts, run } = setup({
      workout: WORKOUT_SLOW,
      lookup: slowLookup,
      voice: { motivation: true, tempoCues: false, techniqueCues: false },
      userName: 'Anna',
      random: () => 0.1, // < 0.4 → personal line
    });
    engine.start();
    run(3_000 + 30_000);
    expect(texts()).toContain('Kom igen Anna!');
  });

  it('speaks the tempo word halfway through each rep window on slow lifts', () => {
    const { engine, texts, run, speech } = setup({
      workout: WORKOUT_SLOW,
      lookup: slowLookup,
      voice: { techniqueCues: false },
    });
    engine.start();
    run(3_000);
    speech.spoken.length = 0;
    run(4_600); // rep 1 at t=3.0 s → "ner" due at 4.5 s; rep 2 not until 6.0 s
    expect(texts()).toEqual(['ett', 'ner']);
    const tempo = speech.spoken.find((u) => u.text === 'ner');
    expect(tempo?.priority).toBe('drop'); // never fights the count
  });

  it('never speaks tempo words for quick movements or when disabled', () => {
    const quick = setup({ voice: { tempoCues: true } }); // fixture squat = 2 s/rep, no tempo data
    quick.engine.start();
    quick.run(13_000);
    expect(quick.texts()).not.toContain('ner');

    const disabled = setup({ workout: WORKOUT_SLOW, lookup: slowLookup, voice: { tempoCues: false } });
    disabled.engine.start();
    disabled.run(33_000);
    expect(disabled.texts()).not.toContain('ner');
  });

  it('keeps short sets clean: only numbers, no chatter', () => {
    const { engine, texts, run, speech } = setup({ voice: { motivation: true, techniqueCues: true } });
    engine.start();
    run(3_000);
    speech.spoken.length = 0;
    run(10_000); // 5 reps
    expect(texts().slice(0, 5)).toEqual(['ett', 'två', 'tre', 'fyra', 'Sista!']);
  });

  it('respects techniqueCues=false', () => {
    const { engine, texts, run } = setup({
      workout: WORKOUT_SLOW,
      lookup: slowLookup,
      voice: { techniqueCues: false, tempoCues: false },
    });
    engine.start();
    run(3_000 + 30_000);
    expect(texts()).not.toContain('Knäna utåt.');
  });
});

describe('Coach – rest and transitions', () => {
  it('announces the next exercise with its target BEFORE the rest line', () => {
    const { engine, texts, run, speech } = setup();
    engine.start();
    run(3_000 + 10_000 + 10_000 + 9_900); // countdown, set 1, rest, most of set 2
    speech.spoken.length = 0;
    run(200); // set 2 completes → transition rest starts
    const said = texts();
    expect(said).toContain('Knäböj klart.');
    expect(said).toContain('Nästa: Planka, 10 sekunder.');
    expect(said.indexOf('Nästa: Planka, 10 sekunder.')).toBeLessThan(said.indexOf('Vila 20 sekunder.'));
    // no duplicate "Nästa övning" once it was announced up front
    expect(said).not.toContain('Nästa övning: Planka.');
  });

  it('announces a target scaled by the current intensity', () => {
    const { engine, texts, run } = setup({ workout: WORKOUT_CUED, lookup: cuedLookup });
    engine.start();
    engine.adjustIntensity(1);
    engine.adjustIntensity(1); // 1.0 → 1.25 → 1.5
    run(60_000);
    // plank is time-based: 10 s × 1.5 = 15 s
    expect(texts()).toContain('Nästa: Planka, 15 sekunder.');
    expect(texts()).not.toContain('Nästa: Planka, 10 sekunder.');
  });

  it('falls back to the old order when announceNext is off', () => {
    const { engine, texts, run, speech } = setup({ voice: { announceNext: false } });
    engine.start();
    run(3_000 + 10_000 + 10_000 + 9_900);
    speech.spoken.length = 0;
    run(200);
    const said = texts();
    expect(said).not.toContain('Nästa: Planka, 10 sekunder.');
    expect(said.indexOf('Vila 20 sekunder.')).toBeLessThan(said.indexOf('Nästa övning: Planka.'));
  });

  it('reads brief execution guidance before the countdown for the next exercise', () => {
    const { engine, texts, run, speech } = setup({
      workout: WORKOUT_CUED,
      lookup: cuedLookup,
      voice: { nextExerciseInstructions: 'brief' },
    });
    engine.start();
    run(3_000 + 10_000 + 10_000 + 10_000 + 20_000); // transition rest ends → plank is introduced
    const announcement = texts().at(-1);
    expect(announcement).toBe(
      'Okej, vilan är över. Sista övningen. Nu avslutar vi starkt. Nästa: Planka. 10 sekunder. Spänn magen.',
    );
    // The instruction is spoken as part of the announcement, before the next
    // engine tick can emit 3-2-1.
    expect(speech.spoken.at(-1)?.priority).toBe('interrupt');
  });

  it('reads all how-to steps in detailed mode and none when guidance is off', () => {
    const detailed = setup({
      workout: WORKOUT_SLOW,
      lookup: slowLookup,
      voice: { nextExerciseInstructions: 'detailed' },
    });
    detailed.engine.start();
    expect(detailed.texts()[0]).toContain('Stå höftbrett.');
    expect(detailed.texts()[0]).not.toContain('Bröstet upp.');

    const off = setup({
      workout: WORKOUT_SLOW,
      lookup: slowLookup,
      voice: { nextExerciseInstructions: 'off' },
    });
    off.engine.start();
    expect(off.texts()[0]).toContain('Nästa: Knäböj. 10 repetitioner. Set 1 av 2.');
    expect(off.texts()[0]).not.toContain('Stå höftbrett.');
    expect(off.texts()[0]).not.toContain('Bröstet upp.');
  });

  it('flags the last exercise of the workout when it is announced', () => {
    const { engine, texts, run } = setup();
    engine.start();
    run(3_000 + 10_000 + 10_000 + 10_000 + 20_000); // through both squat sets + transition
    expect(texts().some((line) => line.includes('Sista övningen. Nu avslutar vi starkt.'))).toBe(true);
  });

  it('never counts a rest down – one line at the start, one when it is over', () => {
    const { engine, texts, run, speech } = setup();
    engine.start();
    run(3_000 + 10_000); // into rest (10 s)
    expect(texts()).toContain('Vila 10 sekunder.');
    speech.spoken.length = 0;
    run(9_900); // the whole rest, second by second
    expect(texts()).toEqual([]); // silence: no numbers, no "get ready"
    run(400); // rest ends
    expect(texts().join(' ')).toMatch(/^Okej, vilan är över\./);
  });

  it('says whole minutes as minutes and 90 s as one and a half minutes', () => {
    expect(restDurationText(30, 'sv')).toBe('30 sekunder');
    expect(restDurationText(60, 'sv')).toBe('en minut');
    expect(restDurationText(90, 'sv')).toBe('en och en halv minut');
    expect(restDurationText(120, 'sv')).toBe('två minuter');
    expect(restDurationText(180, 'sv')).toBe('tre minuter');
    expect(restDurationText(150, 'sv')).toBe('150 sekunder');

    expect(restDurationText(45, 'en')).toBe('45 seconds');
    expect(restDurationText(60, 'en')).toBe('one minute');
    expect(restDurationText(90, 'en')).toBe('one and a half minutes');
    expect(restDurationText(120, 'en')).toBe('two minutes');

    // A 90 s rest in a real session: the line is spoken once, at the start.
    const { engine, texts, run } = setup({ workout: restWorkout(90), lookup: slowLookup });
    engine.start();
    run(3_000 + 15_000 + 1_000); // countdown + 5 reps @ 3 s → rest starts
    expect(texts()).toContain('Vila en och en halv minut.');
  });

  it('speaks the English rest lines in English', () => {
    const { engine, texts, run } = setup({ locale: 'en', workout: restWorkout(60), lookup: slowLookup });
    engine.start();
    run(3_000 + 15_000 + 1_000); // countdown + 5 reps @ 3 s → rest starts
    expect(texts()).toContain('Rest for one minute.');
    run(60_000);
    expect(texts().join(' ')).toContain('Alright, rest over.');
  });
});

describe('Coach – intensity', () => {
  it('explains what an intensity change means for the current rep target', () => {
    const { engine, texts, run, speech } = setup({ locale: 'en' });
    engine.start();
    run(3_000); // working, 5 reps
    speech.spoken.length = 0;
    engine.adjustIntensity(1); // 1.25 → round(5 × 1.25) = 6
    expect(texts()).toEqual(['Intensity: hard. Stepping up. 6 reps now.']);
    speech.spoken.length = 0;
    engine.adjustIntensity(-1);
    engine.adjustIntensity(-1); // 0.75 → 4
    expect(texts()).toEqual(['Intensity: normal. Easing off. 5 reps will do.', 'Intensity: easy. Easing off. 4 reps will do.']);
  });

  it('just states the level when no rep set is active', () => {
    const { engine, texts, speech } = setup({ locale: 'en' });
    engine.start();
    speech.spoken.length = 0;
    engine.adjustIntensity(1); // still announcing
    expect(texts()).toEqual(['Intensity: hard.']);
  });
});

describe('Coach – lifecycle', () => {
  it('says nothing when voice is disabled', () => {
    const { engine, texts, run } = setup({ voice: { enabled: false } });
    engine.start();
    run(5_000);
    expect(texts()).toEqual([]);
  });

  it('celebrates the finish by name', () => {
    const { engine, texts, run } = setup({ userName: 'Anna' });
    engine.start();
    run(120_000);
    expect(engine.snapshot.phase).toBe('finished');
    expect(texts().at(-1)).toBe('Passet är klart. Grymt jobbat, Anna!');
  });

  it('picks up a name set mid-session via updateSettings', () => {
    const { engine, texts, run, coach } = setup();
    engine.start();
    coach.updateSettings('sv', { ...DEFAULT_SETTINGS.voice, motivation: false }, 'Erik');
    run(120_000);
    expect(texts().at(-1)).toBe('Passet är klart. Grymt jobbat, Erik!');
  });

  it('detaches cleanly', () => {
    const { engine, texts, coach, run, speech } = setup();
    engine.start();
    coach.detach();
    speech.spoken.length = 0;
    run(5_000);
    expect(texts()).toEqual([]);
  });
});
