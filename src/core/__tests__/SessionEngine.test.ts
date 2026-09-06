import { SessionEngine } from '../engine/SessionEngine';
import type { SessionEvents } from '../engine/types';
import { FakeClock, plan } from '../testing/fixtures';

type EventName = keyof SessionEvents;

function record(engine: SessionEngine, names: EventName[]) {
  const log: string[] = [];
  engine.events.onAny((event, payload) => {
    if (!names.includes(event)) return;
    const p = payload as Record<string, unknown>;
    switch (event) {
      case 'rep':
        log.push(`rep:${p.rep}/${p.total}`);
        break;
      case 'restStarted':
        log.push(`restStarted:${p.seconds}`);
        break;
      case 'restTick':
        log.push(`restTick:${p.remaining}`);
        break;
      case 'countdownTick':
        log.push(`countdown:${p.remaining}`);
        break;
      case 'workTick':
        log.push(`workTick:${p.elapsed}/${p.total}`);
        break;
      case 'exerciseAnnounced':
        log.push(`announced:${(p.step as { exercise: { id: string } }).exercise.id}`);
        break;
      case 'setStarted':
        log.push(`setStarted:${(p.step as { setNumber: number }).setNumber}`);
        break;
      case 'setCompleted':
        log.push(`setCompleted:${(p.step as { setNumber: number }).setNumber}`);
        break;
      case 'intensityChanged':
        log.push(`intensity:${p.from}->${p.to}`);
        break;
      case 'finished':
        log.push(`finished:${p.completed}`);
        break;
      default:
        log.push(String(event));
    }
  });
  return log;
}

/** Drive the clock in `stepMs` increments for `totalMs`. */
function run(engine: SessionEngine, clock: FakeClock, totalMs: number, stepMs = 100) {
  for (let t = 0; t < totalMs; t += stepMs) {
    clock.advance(stepMs);
    engine.tick(clock.now());
  }
}

describe('SessionEngine – hands-free', () => {
  it('starts in idle and moves to announcing on start()', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({ plan: plan(), interactionLevel: 'handsFree', now: clock.now });
    expect(engine.snapshot.phase).toBe('idle');
    engine.start();
    expect(engine.snapshot.phase).toBe('announcing');
    expect(engine.snapshot.target).toEqual({ kind: 'reps', reps: 5 });
    expect(engine.snapshot.announceRemainingSeconds).toBe(5);
  });

  it('counts down 3-2-1 and then starts working', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({ plan: plan(), interactionLevel: 'handsFree', now: clock.now });
    const log = record(engine, ['countdownTick', 'setStarted']);
    engine.start();
    run(engine, clock, 5_000);
    expect(log).toEqual(['countdown:3', 'countdown:2', 'countdown:1', 'setStarted:1']);
    expect(engine.snapshot.phase).toBe('working');
  });

  it('emits reps at the exercise cadence and completes the set', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    const log = record(engine, ['rep', 'setCompleted', 'restStarted']);
    engine.start();
    engine.tick(clock.now()); // announcing → working (0 s get-ready)
    expect(engine.snapshot.phase).toBe('working');

    run(engine, clock, 10_000); // 5 reps × 2 s
    expect(log).toEqual([
      'rep:1/5',
      'rep:2/5',
      'rep:3/5',
      'rep:4/5',
      'rep:5/5',
      'setCompleted:1',
      'restStarted:10',
    ]);
    expect(engine.snapshot.phase).toBe('resting');
    expect(engine.snapshot.stats.completedSets).toHaveLength(1);
    expect(engine.snapshot.stats.completedSets[0]?.reps).toBe(5);
  });

  it('catches up on missed reps when ticks are sparse (e.g. backgrounded)', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    const log = record(engine, ['rep']);
    engine.start();
    engine.tick(clock.now());
    clock.advance(6_100); // 3 reps due at once
    engine.tick(clock.now());
    expect(log).toEqual(['rep:1/5', 'rep:2/5', 'rep:3/5']);
  });

  it('walks the whole plan and finishes', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    const log = record(engine, ['exerciseAnnounced', 'setStarted', 'setCompleted', 'finished']);
    engine.start();
    // squat set 1: 10 s work + 10 s rest; set 2: 10 s + 20 s transition; plank 10 s
    run(engine, clock, 70_000);
    expect(engine.snapshot.phase).toBe('finished');
    expect(log).toEqual([
      'announced:squat',
      'setStarted:1',
      'setCompleted:1',
      'setStarted:2', // same exercise → no re-announce
      'setCompleted:2',
      'announced:plank', // new exercise → announced
      'setStarted:1',
      'setCompleted:1',
      'finished:true',
    ]);
    expect(engine.snapshot.stats.completedSets).toHaveLength(3);
    expect(engine.snapshot.stats.workSeconds).toBeCloseTo(30, 0);
    expect(engine.snapshot.stats.restSeconds).toBeCloseTo(30, 0);
  });

  it('emits workTick every second for time-based sets', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    engine.start();
    engine.tick(clock.now());
    // Fast-forward to the plank
    engine.skipStep();
    engine.skipStep();
    expect(engine.snapshot.step?.exercise.id).toBe('plank');
    engine.tick(clock.now()); // announcing → working
    expect(engine.snapshot.phase).toBe('working');
    const log = record(engine, ['workTick', 'setCompleted']);
    run(engine, clock, 10_000);
    // First tick inside 'working' is at 0.1 s → whole second 0 is emitted as workTick:0
    expect(log.slice(0, 4)).toEqual(['workTick:0/10', 'workTick:1/10', 'workTick:2/10', 'workTick:3/10']);
    expect(log.at(-1)).toBe('setCompleted:1');
  });

  it('pauses and resumes without losing phase progress', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    const log = record(engine, ['rep', 'paused', 'resumed']);
    engine.start();
    engine.tick(clock.now());
    run(engine, clock, 2_100); // 1 rep
    engine.pause();
    expect(engine.snapshot.phase).toBe('paused');
    expect(engine.snapshot.pausedFrom).toBe('working');
    run(engine, clock, 30_000); // nothing should happen while paused
    engine.resume();
    run(engine, clock, 2_000); // 1 more rep
    expect(log).toEqual(['rep:1/5', 'paused', 'resumed', 'rep:2/5']);
    expect(engine.snapshot.stats.pausedSeconds).toBeCloseTo(30, 0);
  });

  it('adjusts intensity mid-set and re-resolves the target', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    const log = record(engine, ['intensityChanged']);
    engine.start();
    engine.tick(clock.now());
    expect(engine.snapshot.target).toEqual({ kind: 'reps', reps: 5 });
    engine.adjustIntensity(1);
    expect(engine.snapshot.intensity).toBe(1.25);
    expect(engine.snapshot.target).toEqual({ kind: 'reps', reps: 6 }); // round(5 × 1.25)
    engine.adjustIntensity(1);
    expect(engine.snapshot.target).toEqual({ kind: 'reps', reps: 8 }); // round(5 × 1.5)
    expect(log).toEqual(['intensity:1->1.25', 'intensity:1.25->1.5']);
  });

  it('never lowers the target below reps already done', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
      intensity: 1.5,
    });
    engine.start();
    engine.tick(clock.now());
    expect(engine.snapshot.target).toEqual({ kind: 'reps', reps: 8 });
    run(engine, clock, 10_100); // 5 reps done
    expect(engine.snapshot.repsDone).toBe(5);
    engine.adjustIntensity(-1); // 1.25 → 6 reps
    engine.adjustIntensity(-1); // 1.0 → 5 reps, equals done
    engine.adjustIntensity(-1); // 0.75 → 4, clamped to 5
    expect(engine.snapshot.target).toEqual({ kind: 'reps', reps: 5 });
  });

  it('shortens rest when intensity goes up while resting', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    engine.start();
    engine.tick(clock.now());
    run(engine, clock, 10_000); // set 1 done → resting 10 s
    expect(engine.snapshot.phase).toBe('resting');
    expect(engine.snapshot.restTotalSeconds).toBe(10);
    engine.adjustIntensity(1);
    expect(engine.snapshot.restTotalSeconds).toBe(8); // round(10 / 1.25)
  });

  it('skipRest jumps straight to the next set', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    engine.start();
    engine.tick(clock.now());
    run(engine, clock, 10_000);
    expect(engine.snapshot.phase).toBe('resting');
    engine.skipRest();
    expect(engine.snapshot.phase).toBe('working');
    expect(engine.snapshot.step?.setNumber).toBe(2);
  });

  it('stop() finishes early and keeps stats', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'handsFree',
      now: clock.now,
      getReadySeconds: 0,
    });
    const log = record(engine, ['finished']);
    engine.start();
    engine.tick(clock.now());
    run(engine, clock, 12_000);
    engine.stop();
    expect(engine.snapshot.phase).toBe('finished');
    expect(log).toEqual(['finished:false']);
    expect(engine.snapshot.stats.completedSets).toHaveLength(1);
  });

  it('finishes immediately on an empty plan', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: { ...plan(), steps: [] },
      interactionLevel: 'handsFree',
      now: clock.now,
    });
    engine.start();
    expect(engine.snapshot.phase).toBe('finished');
  });
});

describe('SessionEngine – assisted', () => {
  it('waits for confirmStart before every set', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'assisted',
      now: clock.now,
      getReadySeconds: 0,
    });
    const log = record(engine, ['awaitingUser', 'setStarted']);
    engine.start();
    engine.tick(clock.now());
    expect(engine.snapshot.phase).toBe('awaitingStart');
    run(engine, clock, 60_000); // stays put
    expect(engine.snapshot.phase).toBe('awaitingStart');
    engine.confirmStart();
    expect(engine.snapshot.phase).toBe('working');
    run(engine, clock, 10_000); // set done → rest 10 s
    run(engine, clock, 10_000); // rest done → awaiting again
    expect(engine.snapshot.phase).toBe('awaitingStart');
    expect(log).toEqual(['awaitingUser', 'setStarted:1', 'awaitingUser']);
  });
});

describe('SessionEngine – manual', () => {
  it('lets the user drive reps and completes when target is reached', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'manual',
      now: clock.now,
      getReadySeconds: 0,
    });
    const log = record(engine, ['rep', 'setCompleted']);
    engine.start();
    engine.tick(clock.now());
    engine.confirmStart();
    run(engine, clock, 30_000); // time passes, no auto reps
    expect(log).toEqual([]);
    for (let i = 0; i < 5; i++) engine.markRep();
    expect(log).toEqual(['rep:1/5', 'rep:2/5', 'rep:3/5', 'rep:4/5', 'rep:5/5', 'setCompleted:1']);
    expect(engine.snapshot.phase).toBe('resting');
  });

  it('completeSet() ends the set early with the reps done so far', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({
      plan: plan(),
      interactionLevel: 'manual',
      now: clock.now,
      getReadySeconds: 0,
    });
    engine.start();
    engine.tick(clock.now());
    engine.confirmStart();
    engine.markRep();
    engine.markRep();
    engine.completeSet();
    expect(engine.snapshot.stats.completedSets[0]?.reps).toBe(2);
  });
});

describe('SessionEngine – background gaps and tempo', () => {
  function make(opts: Partial<ConstructorParameters<typeof SessionEngine>[0]> = {}) {
    const clock = new FakeClock();
    const engine = new SessionEngine({ plan: plan(), interactionLevel: 'handsFree', now: clock.now, getReadySeconds: 3, ...opts });
    const reps: number[] = [];
    const gaps: number[] = [];
    engine.events.on('rep', ({ rep }) => reps.push(rep));
    engine.events.on('gapSkipped', ({ seconds }) => gaps.push(seconds));
    engine.start();
    clock.advance(3_000);
    engine.tick(clock.now()); // countdown done → working (squat, 5 reps @ 2 s)
    return { engine, clock, reps, gaps };
  }

  it('catches up at most maxCatchUpReps after a long gap and reports the skipped time', () => {
    const { engine, clock, reps, gaps } = make({ maxCatchUpReps: 2 });
    clock.advance(60_000); // app was in the background for a minute
    engine.tick(clock.now());
    expect(reps).toEqual([1, 2]); // not 5
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toBeCloseTo(56, 0); // 60 s − 2 reps × 2 s
    expect(engine.snapshot.phase).toBe('working');
    // the count continues at the normal cadence from here
    clock.advance(2_000);
    engine.tick(clock.now());
    expect(reps).toEqual([1, 2, 3]);
  });

  it('keeps the old unbounded behaviour when maxCatchUpReps is Infinity', () => {
    const { engine, clock, reps, gaps } = make({ maxCatchUpReps: Infinity });
    clock.advance(60_000);
    engine.tick(clock.now());
    expect(reps).toEqual([1, 2, 3, 4, 5]);
    expect(gaps).toEqual([]);
    expect(engine.snapshot.phase).toBe('resting');
  });

  it('slows the count when the tempo factor is raised, preserving the current rep window', () => {
    const { engine, clock, reps } = make();
    clock.advance(2_000);
    engine.tick(clock.now()); // rep 1 at 2.0 s
    clock.advance(1_000); // halfway into rep 2's window (2 s cadence)
    engine.tick(clock.now());
    expect(engine.setTempoFactor(1.5)).toBe(1.5); // cadence becomes 3 s
    // half of the new window has elapsed → next rep in 1.5 s, not 1 s
    clock.advance(1_000);
    engine.tick(clock.now());
    expect(reps).toEqual([1]);
    clock.advance(600);
    engine.tick(clock.now());
    expect(reps).toEqual([1, 2]);
    clock.advance(3_000);
    engine.tick(clock.now());
    expect(reps).toEqual([1, 2, 3]);
    expect(engine.snapshot.tempoFactor).toBe(1.5);
  });

  it('clamps the tempo factor to a sane range', () => {
    const { engine } = make();
    expect(engine.setTempoFactor(0.1)).toBe(0.7);
    expect(engine.setTempoFactor(9)).toBe(1.6);
    expect(engine.setTempoFactor(Number.NaN)).toBe(1);
  });
});

describe('SessionEngine – checkpoint / restore', () => {
  it('serialises progress and resumes at the start of the interrupted step, booking the gap as pause', () => {
    const clock = new FakeClock();
    const a = new SessionEngine({ plan: plan(), interactionLevel: 'handsFree', now: clock.now, getReadySeconds: 3 });
    expect(a.checkpoint()).toBeUndefined(); // idle → nothing to save
    a.start();
    clock.advance(3_000);
    a.tick(clock.now()); // working, step 0
    a.adjustIntensity(1);
    a.setTempoFactor(1.2);
    a.completeSet(); // → resting, one set recorded
    clock.advance(1_000);
    a.tick(clock.now());
    const cp = a.checkpoint();
    expect(cp).toBeDefined();
    expect(cp?.stepIndex).toBe(0);
    expect(cp?.intensity).toBe(1.25);
    expect(cp?.tempoFactor).toBe(1.2);
    expect(cp?.stats.completedSets).toHaveLength(1);
    expect(cp?.elapsedSeconds).toBeCloseTo(4, 0);

    // …app dies; 10 minutes later a fresh engine restores from the checkpoint
    clock.advance(10 * 60_000);
    const b = new SessionEngine({ plan: plan(), interactionLevel: 'handsFree', now: clock.now, getReadySeconds: 3 });
    const log = record(b, ['started', 'restored', 'exerciseAnnounced']);
    b.restore(cp!);
    expect(log).toEqual(['started', 'restored', 'announced:squat']);
    const snap = b.snapshot;
    expect(snap.phase).toBe('announcing');
    expect(snap.stepIndex).toBe(0);
    expect(snap.intensity).toBe(1.25);
    expect(snap.tempoFactor).toBe(1.2);
    expect(snap.stats.completedSets).toHaveLength(1);
    expect(snap.stats.pausedSeconds).toBeCloseTo(600, 0); // the gap, not training time
    expect(snap.sessionElapsedSeconds).toBeCloseTo(4, 0);
  });

  it('refuses to restore a checkpoint from another workout', () => {
    const clock = new FakeClock();
    const engine = new SessionEngine({ plan: plan(), interactionLevel: 'handsFree', now: clock.now });
    engine.start();
    const cp = engine.checkpoint()!;
    const other = new SessionEngine({ plan: plan(), interactionLevel: 'handsFree', now: clock.now });
    expect(() => other.restore({ ...cp, workoutId: 'someone-else' })).toThrow(/workout mismatch/);
  });
});
