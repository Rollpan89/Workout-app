import { Coach } from '../coach/Coach';
import { SilentSpeech } from '../coach/SpeechPort';
import { DEFAULT_SETTINGS, lz, type Exercise, type Workout, type WorkoutBlock } from '../domain';
import type { InteractionLevel } from '../domain/settings';
import { buildSessionPlan } from '../engine/planner';
import { SessionEngine } from '../engine/SessionEngine';
import { EX_PLANK, EX_SQUAT, FakeClock, plan } from '../testing/fixtures';

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

describe('Coach – announcements', () => {
  it('greets, then introduces the exercise with target, set number and cue in Swedish', () => {
    const { engine, texts } = setup();
    engine.start();
    expect(texts()).toEqual([
      'Dags för Test. Jag räknar, du kör. Nästa: Knäböj. 5 repetitioner. Gör dig redo.',
      'Set 1 av 2.',
      'Bröstet upp.',
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
    expect(texts()[0]).toBe('Time for Test. I count, you move. Next: Squat. 5 reps. Get ready.');
    expect(speech.spoken[0]?.language).toBe('en-US');
  });

  it('intro interrupts, set number + cue queue behind it', () => {
    const { engine, speech } = setup();
    engine.start();
    expect(speech.spoken.map((u) => u.priority)).toEqual(['interrupt', 'queue', 'queue']);
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
    expect(texts().slice(0, 3)).toEqual(['Set 2 av 2.', 'Sista setet. Ge allt!', 'Kör!']);
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
  it('announces the next exercise during the transition rest', () => {
    const { engine, texts, run, speech } = setup();
    engine.start();
    run(3_000 + 10_000 + 10_000 + 9_900); // countdown, set 1, rest, most of set 2
    speech.spoken.length = 0;
    run(200); // set 2 completes → transition rest starts
    expect(texts()).toContain('Knäböj klart.');
    expect(texts()).toContain('Nästa övning: Planka.');
  });

  it('flags the last exercise of the workout when it is announced', () => {
    const { engine, texts, run } = setup();
    engine.start();
    run(3_000 + 10_000 + 10_000 + 10_000 + 20_000); // through both squat sets + transition
    expect(texts()).toContain('Sista övningen. Nu avslutar vi starkt.');
  });

  it('says "get ready" three seconds before a rest ends', () => {
    const { engine, texts, run, speech } = setup();
    engine.start();
    run(3_000 + 10_000); // into rest (10 s)
    speech.spoken.length = 0;
    run(9_000);
    expect(texts()).toEqual(['Gör dig redo.', 'två', 'ett']);
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
