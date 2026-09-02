import { Coach } from '../coach/Coach';
import { SilentSpeech } from '../coach/SpeechPort';
import { DEFAULT_SETTINGS } from '../domain';
import { SessionEngine } from '../engine/SessionEngine';
import { FakeClock, plan } from '../testing/fixtures';

function setup(locale: 'sv' | 'en' = 'sv', voiceOverrides = {}) {
  const clock = new FakeClock();
  const engine = new SessionEngine({
    plan: plan(),
    interactionLevel: 'handsFree',
    now: clock.now,
    getReadySeconds: 3,
  });
  const speech = new SilentSpeech();
  const coach = new Coach({
    speech,
    locale,
    voice: { ...DEFAULT_SETTINGS.voice, motivation: false, ...voiceOverrides },
    random: () => 0.99,
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

describe('Coach', () => {
  it('introduces the exercise with target, set number and cue in Swedish', () => {
    const { engine, texts } = setup('sv');
    engine.start();
    expect(texts()).toEqual([
      'Nästa: Knäböj. 5 repetitioner. Gör dig redo.',
      'Set 1 av 2.',
      'Bröstet upp.',
    ]);
  });

  it('speaks English when locale is en', () => {
    const { engine, texts, speech } = setup('en');
    engine.start();
    expect(texts()[0]).toBe('Next: Squat. 5 reps. Get ready.');
    expect(speech.spoken[0]?.language).toBe('en-US');
  });

  it('counts down, says go, then counts each rep and "last"', () => {
    const { engine, texts, run, speech } = setup('sv');
    engine.start();
    speech.spoken.length = 0;
    run(3_000); // countdown + start
    run(10_000); // 5 reps
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
      'Bra jobbat.',
      'Vila 10 sekunder.',
    ]);
  });

  it('rep counts interrupt, cues queue', () => {
    const { engine, speech } = setup('sv');
    engine.start();
    const priorities = speech.spoken.map((u) => u.priority);
    expect(priorities).toEqual(['interrupt', 'queue', 'queue']);
  });

  it('only counts milestones when countEveryRep is off', () => {
    const { engine, texts, run, speech } = setup('sv', { countEveryRep: false });
    engine.start();
    run(3_000);
    speech.spoken.length = 0;
    run(10_000);
    // rep 1 announced, 5 is the last → "Sista!"
    expect(texts()).toEqual(['ett', 'Sista!', 'Bra jobbat.', 'Vila 10 sekunder.']);
  });

  it('announces intensity changes', () => {
    const { engine, texts, speech } = setup('en');
    engine.start();
    speech.spoken.length = 0;
    engine.adjustIntensity(1);
    expect(texts()).toEqual(['Intensity: hard.']);
  });

  it('says nothing when voice is disabled', () => {
    const { engine, texts, run } = setup('sv', { enabled: false });
    engine.start();
    run(5_000);
    expect(texts()).toEqual([]);
  });

  it('announces the next exercise during the transition rest', () => {
    const { engine, texts, run, speech } = setup('sv');
    engine.start();
    run(3_000 + 10_000 + 10_000 + 9_900); // countdown, set 1, rest, most of set 2
    speech.spoken.length = 0;
    run(200); // set 2 completes → transition rest starts
    expect(texts()).toContain('Nästa övning: Planka.');
  });

  it('detaches cleanly', () => {
    const { engine, texts, coach, run, speech } = setup('sv');
    engine.start();
    coach.detach();
    speech.spoken.length = 0;
    run(5_000);
    expect(texts()).toEqual([]);
  });
});
