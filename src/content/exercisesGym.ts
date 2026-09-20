import { lz, type Exercise, type ExerciseInstructions, type LocalizedString } from '@/core/domain';

/**
 * Gym & conditioning exercises added to support the Muscle & Strength
 * program library (see ./workouts.ts). Same shape as the core catalog in
 * ./exercises.ts: full bilingual technique instructions, MET values and a
 * per-rep cadence used by the coach for counting.
 */

const steps = (...items: LocalizedString[]) => items;

const TEMPO_DOWN_UP = { down: lz('ner', 'down'), up: lz('upp', 'up') };
const TEMPO_PRESS = { down: lz('sänk', 'lower'), up: lz('pressa', 'press') };
const TEMPO_PULL = { down: lz('släpp', 'release'), up: lz('dra', 'pull') };
const TEMPO_HINGE = { down: lz('fäll', 'hinge'), up: lz('res dig', 'stand') };

const instr = (i: ExerciseInstructions) => i;

/** Shared press setup cues for flat/incline/decline bench patterns. */
const benchSetup = (angle: string, angleEn: string) =>
  instr({
    steps: steps(
      lz(
        `Ligg på ${angle}, fötterna i golvet (eller hängda i fotände), greppet strax bredare än axlarna.`,
        `Lie on the ${angleEn}, feet planted or hooked at the end, grip just wider than shoulder-width.`,
      ),
      lz(
        'Lyft ut stången och håll den ovanför bröstkorgen med spända handleder.',
        'Unrack the bar and hold it over your chest with firm wrists.',
      ),
      lz(
        'Sänk kontrollerat mot bröstkorgen, armbågarna i cirka 45 grader.',
        'Lower under control to the chest, elbows around 45 degrees.',
      ),
      lz(
        'Pressa upp tills armarna är raka utan att låsa axlarna.',
        'Press up until your arms are straight without flaring the shoulders.',
      ),
    ),
    mistakes: steps(
      lz('Handlederna böjs bakåt.', 'Wrists bending back.'),
      lz('Armbågarna flaxar rakt utåt.', 'Elbows flaring straight out.'),
      lz('Studsa stången mot bröstet.', 'Bouncing the bar off the chest.'),
    ),
    coachCues: steps(
      lz('Spänn ryggen.', 'Set the back.'),
      lz('Kontrollat ner.', 'Down with control.'),
      lz('Pressa.', 'Press.'),
    ),
    tempo: TEMPO_PRESS,
  });

export const EXERCISES_GYM: readonly Exercise[] = [
  // ---- Barbell basics -----------------------------------------------------
  {
    id: 'barbell-squat',
    name: lz('Knäböj med skivstång', 'Barbell back squat'),
    cue: lz('Stången på axlarna, bröstet upp.', 'Bar on the traps, chest up.'),
    category: 'strength',
    equipment: ['barbell'],
    muscles: { quads: 1, glutes: 0.9, hamstrings: 0.5, core: 0.5, back: 0.3 },
    met: 6.5,
    secondsPerRep: 3.5,
    instructions: instr({
      steps: steps(
        lz(
          'Lyft stången från stativen och ställ dig med fötterna axelbrett, tårna lätt utåt.',
          'Unrack the bar and stand with feet shoulder-width, toes slightly out.',
        ),
        lz(
          'Brace: spänn mage, svank och övre rygg innan du böjer dig.',
          'Brace: tighten core, lower back and upper back before you descend.',
        ),
        lz(
          'Sänk dig tills låren är parallella, knäna följer tårna.',
          'Sit down until the thighs are parallel, knees tracking over the toes.',
        ),
        lz(
          'Tryck upp genom hela foten och stå högt i toppen.',
          'Drive up through the whole foot and finish tall.',
        ),
      ),
      mistakes: steps(
        lz('Rundan i ländryggen i botten.', 'Rounding the lower back at the bottom.'),
        lz('Hälarna lyfter.', 'Heels lifting off the floor.'),
        lz('Halva knäböj av vana.', 'Habitual half squats.'),
      ),
      coachCues: steps(
        lz('Brace.', 'Brace.'),
        lz('Knäna utåt.', 'Knees out.'),
        lz('Djupt.', 'Deep.'),
        lz('Tryck upp.', 'Drive up.'),
      ),
      tempo: TEMPO_DOWN_UP,
    }),
  },
  {
    id: 'bench-press',
    name: lz('Bänkpress', 'Bench press'),
    cue: lz('Låt stången nudda bröstkorgen.', 'Touch the bar to your chest.'),
    category: 'strength',
    equipment: ['barbell', 'bench'],
    muscles: { chest: 1, triceps: 0.7, shoulders: 0.5 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: benchSetup('platt bänk', 'flat bench'),
  },
  {
    id: 'incline-bench-press',
    name: lz('Lutande bänkpress', 'Incline bench press'),
    cue: lz('Lutning cirka 30 grader, bröstet högt.', 'About 30 degrees of incline, chest proud.'),
    category: 'strength',
    equipment: ['barbell', 'bench'],
    muscles: { chest: 0.9, shoulders: 0.6, triceps: 0.6 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: benchSetup('lutande bänk', 'incline bench'),
  },
  {
    id: 'decline-bench-press',
    name: lz('Bänkpress – decline', 'Decline bench press'),
    cue: lz(
      'Kroppen låst, stången mot underkanten av bröstkorgen.',
      'Body locked in, bar to the lower chest.',
    ),
    category: 'strength',
    equipment: ['barbell', 'bench'],
    muscles: { chest: 1, triceps: 0.6, shoulders: 0.3 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: benchSetup('decline-bänken', 'decline bench'),
  },
  {
    id: 'close-grip-bench-press',
    name: lz('Sluten grepp bänkpress', 'Close-grip bench press'),
    cue: lz('Grepp axelbrett, armbågarna nära kroppen.', 'Shoulder-width grip, elbows tucked.'),
    category: 'strength',
    equipment: ['barbell', 'bench'],
    muscles: { triceps: 1, chest: 0.6, shoulders: 0.4 },
    met: 4.5,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Greppa stången axelbrett eller närmare, handlederna raka.',
          'Take a shoulder-width or narrower grip with straight wrists.',
        ),
        lz(
          'Sänk stången mot underkanten av bröstkorgen med armbågarna intill kroppen.',
          'Lower to the lower chest with elbows tracking close to the body.',
        ),
        lz(
          'Pressa upp utan att låsa ut armbågarna åt sidan.',
          'Press up without letting the elbows flare out.',
        ),
      ),
      mistakes: steps(
        lz('Greppet för smalt – handlederna vrids.', 'Grip too narrow – wrists twist.'),
        lz('Armbågarna hamnar 90 grader ut.', 'Elbows drift out to 90 degrees.'),
      ),
      coachCues: steps(
        lz('Armbågarna in.', 'Elbows in.'),
        lz('Raka handleder.', 'Wrists stacked.'),
      ),
      tempo: TEMPO_PRESS,
    }),
  },
  {
    id: 'overhead-press',
    name: lz('Military press', 'Overhead press'),
    cue: lz(
      'Spenna magen och sätet, pressa i en linje.',
      'Brace core and glutes, press in one line.',
    ),
    category: 'strength',
    equipment: ['barbell'],
    muscles: { shoulders: 1, triceps: 0.6, core: 0.4 },
    met: 4.5,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Håll stången vid nyckelbenet, greppet strax bredare än axlarna, armbågarna under stången.',
          'Hold the bar at the collarbone, grip just outside shoulder width, elbows under the bar.',
        ),
        lz('Spänn mage och set som en bur.', 'Brace your core and glutes like a cage.'),
        lz(
          'Pressa rakt upp och nicka lätt bakåt för att passera ansiktet.',
          'Press straight up and move the head back slightly to clear the face.',
        ),
        lz(
          'Slut med stången över nacken, inte framför.',
          'Finish with the bar over mid-foot to neck, not drifting forward.',
        ),
      ),
      mistakes: steps(
        lz('Svanken ersätter styrkan i axlarna.', 'Arching the back to replace shoulder strength.'),
        lz('Stången åker framåt som en kastbana.', 'Bar travelling forward like a javelin.'),
      ),
      coachCues: steps(
        lz('Brace.', 'Brace.'),
        lz('Genom huvudet.', 'Through the window.'),
        lz('Raka armar.', 'Lock out.'),
      ),
      tempo: TEMPO_PRESS,
    }),
  },
  {
    id: 'deadlift',
    name: lz('Marklyft', 'Deadlift'),
    cue: lz(
      'Lyft golvet iväg – dra inte stången upp.',
      "Push the floor away – don't pull the bar.",
    ),
    category: 'strength',
    equipment: ['barbell'],
    muscles: { hamstrings: 1, glutes: 1, back: 0.8, core: 0.6, quads: 0.4 },
    met: 6.0,
    secondsPerRep: 4,
    instructions: instr({
      steps: steps(
        lz(
          'Ställ mittfoten under stången, grepp strax utanför knäna.',
          'Mid-foot under the bar, grip just outside the knees.',
        ),
        lz(
          'Sänk höften, spänn ryggen, skulderbladen över stången.',
          'Drop the hips, brace the back, shoulder blades over the bar.',
        ),
        lz(
          'Tryck isär golvet med fötterna tills du står rak.',
          'Push the floor away until you stand tall.',
        ),
        lz(
          'Häng händerna i armarna på vägen ner – böj höften först.',
          'On the way down, hinge at the hips first and keep the bar against the legs.',
        ),
      ),
      mistakes: steps(
        lz('Rund rygg under belastning.', 'Rounding the back under load.'),
        lz('Stången svajar ut från benen.', 'Bar drifting away from the legs.'),
        lz('Höften far upp före bröstet.', 'Hips shooting up before the chest.'),
      ),
      coachCues: steps(
        lz('Spänn.', 'Brace.'),
        lz('Tryck golvet.', 'Push the floor.'),
        lz('Vikten nära.', 'Bar close.'),
        lz('Axlar bak, raka ben.', 'Shoulders back, stand tall.'),
      ),
      tempo: TEMPO_HINGE,
    }),
  },
  {
    id: 'barbell-row',
    name: lz('Stångrodd', 'Barbell row'),
    cue: lz('Dra mot magen, armbågarna bakåt.', 'Row to the belly, elbows back.'),
    category: 'strength',
    equipment: ['barbell'],
    muscles: { back: 1, biceps: 0.5, hamstrings: 0.3, core: 0.4 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Fäll överkroppen framåt, rak rygg, kroppen cirka parallell med golvet.',
          'Hinge forward, back flat, torso close to parallel with the floor.',
        ),
        lz(
          'Låt stången hänga rak under axlarna.',
          'Let the bar hang directly under the shoulders.',
        ),
        lz(
          'Dra stången mot naveln och för armbågarna bakåt.',
          'Row to the navel, driving the elbows behind you.',
        ),
        lz(
          'Sänk kontrollerat – kroppen rör sig inte.',
          'Lower with control – the torso stays still.',
        ),
      ),
      mistakes: steps(
        lz(
          'Rumpa och kropp gungar för att flytta vikten.',
          'Leg-drive cheating with a rocking torso.',
        ),
        lz('Ryggens position tappas.', 'Losing the flat-back position.'),
      ),
      coachCues: steps(lz('Till magen.', 'To the belly.'), lz('Still kropp.', 'Quiet torso.')),
      tempo: TEMPO_PULL,
    }),
  },
  {
    id: 'barbell-shrug',
    name: lz('Shrugs med skivstång', 'Barbell shrug'),
    cue: lz('Lyft axlarna rakt upp – svanka inte.', "Shrug straight up – don't bounce."),
    category: 'strength',
    equipment: ['barbell'],
    muscles: { back: 0.8, shoulders: 0.4 },
    met: 4.0,
    secondsPerRep: 2,
    instructions: instr({
      steps: steps(
        lz(
          'Stå rakt med stången vid låren, armarna raka.',
          'Stand tall with the bar at your thighs, arms straight.',
        ),
        lz(
          'Lyft axlarna mot öronen utan att vrida armarna.',
          'Elevate the shoulders toward the ears without rolling.',
        ),
        lz(
          'Håll en sekund i toppen och sänk långsamt.',
          'Hold a second at the top and lower slowly.',
        ),
      ),
      mistakes: steps(
        lz('Rullar med axlarna.', 'Rolling the shoulders.'),
        lz('Böjer armarna för att hjälpa.', 'Bending the arms to help.'),
      ),
      coachCues: steps(lz('Rakt upp.', 'Straight up.'), lz('Håll.', 'Hold.')),
      tempo: { down: lz('sänk', 'lower'), up: lz('lyft', 'lift') },
    }),
  },
  {
    id: 'upright-row',
    name: lz('Drag till hakan', 'Upright row'),
    cue: lz('Stången nära kroppen, armbågarna högst.', 'Bar close, elbows lead.'),
    category: 'strength',
    equipment: ['barbell'],
    muscles: { shoulders: 0.9, back: 0.6, biceps: 0.3 },
    met: 4.0,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz(
          'Greppa stången smalare än axelbrett vid låren.',
          'Take a narrower-than-shoulder-width grip at the thighs.',
        ),
        lz(
          'Dra stången uppför kroppen med armbågen först, upp till brösthöjd.',
          'Lead with the elbows and drag the bar up to chest height.',
        ),
        lz('Sänk kontrollerat till raka armar.', 'Lower with control to straight arms.'),
      ),
      mistakes: steps(
        lz('Greppet för smalt, handlederna smärtar.', 'Grip too narrow, wrists hurt.'),
        lz('Stången åker över axelhöjd.', 'Bar climbing past shoulder height.'),
      ),
      coachCues: steps(lz('Armbågen högst.', 'Elbows high.'), lz('Nära kroppen.', 'Stay close.')),
      tempo: TEMPO_PULL,
    }),
  },
  {
    id: 'barbell-curl',
    name: lz('Stångcurl', 'Barbell curl'),
    cue: lz('Armbågarna stilla vid kroppen.', 'Elbows pinned to your sides.'),
    category: 'strength',
    equipment: ['barbell'],
    muscles: { biceps: 1 },
    met: 3.5,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Stå rakt med stången i undergrepp, axelbrett.',
          'Stand tall with the bar in a shoulder-width underhand grip.',
        ),
        lz(
          'Böj armarna utan att flytta armbågarna.',
          'Curl without letting the elbows travel forward.',
        ),
        lz('Sänk tills armarna är helt raka.', 'Lower to a full stretch.'),
      ),
      mistakes: steps(
        lz('Svankar för att svänga upp vikten.', 'Arching to swing the weight up.'),
        lz('Armbågarna åker fram.', 'Elbows drifting forward.'),
      ),
      coachCues: steps(
        lz('Still armbåge.', 'Quiet elbows.'),
        lz('Hela vägen ner.', 'All the way down.'),
      ),
      tempo: { down: lz('sänk', 'lower'), up: lz('curla', 'curl') },
    }),
  },
  {
    id: 'skullcrusher',
    name: lz('Skullcrushers', 'Skullcrusher'),
    cue: lz('Armbågarna pekar mot taket.', 'Elbows point to the ceiling.'),
    category: 'strength',
    equipment: ['barbell', 'bench'],
    muscles: { triceps: 1, chest: 0.2 },
    met: 4.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Ligg på bänken, håll stången (eller EZ/hantlar) ovanför pannan med raka armar.',
          'Lie on the bench and hold the bar (or EZ bar / dumbbells) over your forehead, arms straight.',
        ),
        lz(
          'Böj i armbågarna och sänk till pannan/huvudets baksida.',
          'Bend at the elbows and lower toward your forehead.',
        ),
        lz(
          'Pressa tillbaka utan att armbågarna glider isär.',
          'Press back without letting the elbows drift apart.',
        ),
      ),
      mistakes: steps(
        lz('Armbågarna svänger fram och bak.', 'Elbows swinging forward and back.'),
        lz('För långt bak – axeln belastas.', 'Lowering too far back – strains the shoulder.'),
      ),
      coachCues: steps(lz('Låsta armbågar.', 'Fixed elbows.'), lz('Kontrollat ner.', 'Slow down.')),
      tempo: TEMPO_PRESS,
    }),
  },
  {
    id: 'ab-wheel-rollout',
    name: lz('Abwheel-utrullning', 'Ab wheel rollout'),
    cue: lz('Runda inte ländryggen.', "Don't let the lower back sag."),
    category: 'core',
    equipment: ['none'],
    muscles: { core: 1, shoulders: 0.5, back: 0.3 },
    met: 5.0,
    secondsPerRep: 4,
    instructions: instr({
      steps: steps(
        lz(
          'Knä stående på alla fyra med hjulet under axlarna, svansen in.',
          'Start on all fours with the wheel under the shoulders, tail tucked.',
        ),
        lz(
          'Rulla framåt så långt du kan håla kroppen hård.',
          'Roll forward as far as you can while bracing hard.',
        ),
        lz('Dra tillbaka med magen, inte höften.', 'Pull back with the abs, not the hips.'),
      ),
      mistakes: steps(
        lz('Svankar i botten.', 'Lower back sagging.'),
        lz('Rullar längre än hållbarheten.', 'Going further than you can control.'),
      ),
      coachCues: steps(lz('Spänn magen.', 'Brace.'), lz('Raka rygg.', 'Flat back.')),
      tempo: { down: lz('rulla ut', 'roll out'), up: lz('dra in', 'pull in') },
    }),
  },
  {
    id: 'hyperextension',
    name: lz('Ryggresningar', 'Back extension'),
    cue: lz(
      'Lyft med rumpan och ryggen – inte svanken.',
      'Lift with glutes and back – not a hyper-arch.',
    ),
    category: 'core',
    equipment: ['none', 'bench'],
    muscles: { hamstrings: 0.7, glutes: 0.8, core: 0.6 },
    met: 3.5,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz(
          'Lås fötterna, höften vid paddsryggen, kroppen rakt ner.',
          'Lock your feet, hips at the pad, torso hanging straight down.',
        ),
        lz(
          'Res kroppen till rak linje med marken och kläm sätet.',
          'Raise to a straight line with the floor and squeeze the glutes.',
        ),
        lz(
          'Sänk med kontroll, andas ut på vägen upp.',
          'Lower with control, exhale on the way up.',
        ),
      ),
      mistakes: steps(
        lz('Rundar ryggen i start.', 'Rounding on the way down.'),
        lz('Stannar i överkors och slappar.', 'Slumping instead of neutral.'),
      ),
      coachCues: steps(lz('Kläm sätet.', 'Squeeze glutes.'), lz('Rak linje.', 'Straight line.')),
      tempo: TEMPO_DOWN_UP,
    }),
  },
  {
    id: 'barbell-hip-thrust',
    name: lz('Höftthrust med skivstång', 'Barbell hip thrust'),
    cue: lz('Haka in, kläm rumpan i toppen.', 'Chin tucked, squeeze the glutes at the top.'),
    category: 'strength',
    equipment: ['barbell', 'bench'],
    muscles: { glutes: 1, hamstrings: 0.7, core: 0.3 },
    met: 5.0,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz(
          'Luta övre ryggen mot bänk kanten, rulla stången över höften.',
          'Lean your upper back on the bench edge and roll the bar over your hips.',
        ),
        lz(
          'Böj knäna, fötterna i golvet höftbrett.',
          'Bend the knees, feet hip-width and planted.',
        ),
        lz(
          'Pressa höften upp tills knä-höft-axel är en rak linje, hakan in.',
          'Drive the hips up until knee-hip-shoulder form a straight line, chin tucked.',
        ),
        lz(
          'Sänk tills rumpan nästan nuddar golvet.',
          'Lower until the glutes nearly touch the floor.',
        ),
      ),
      mistakes: steps(
        lz(
          'Svankar i svanken istället för att klamma rumpan.',
          'Arching the low back instead of squeezing glutes.',
        ),
        lz('Huvudet svajar fram och tillbaka.', 'Head flopping with each rep.'),
      ),
      coachCues: steps(lz('Haka in.', 'Chin in.'), lz('Kläm högt.', 'Squeeze up high.')),
      tempo: { down: lz('sänk', 'lower'), up: lz('lyft', 'thrust') },
    }),
  },

  // ---- Dumbbell & bench companions ---------------------------------------
  {
    id: 'dumbbell-bench-press',
    name: lz('Hantelpress på bänk', 'Dumbbell bench press'),
    cue: lz(
      'Hantlarna ovanför bröstkorgen, handleder raka.',
      'Dumbbells over the chest, wrists stacked.',
    ),
    category: 'strength',
    equipment: ['dumbbells', 'bench'],
    muscles: { chest: 1, triceps: 0.6, shoulders: 0.5 },
    met: 4.5,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Ligg platt på bänken, hantlarna ovanför bröstkorgen, Handflatorna framåt.',
          'Lie flat, dumbbells over the chest, palms forward.',
        ),
        lz(
          'Öppna armarna tills överarmarna är i linje med kroppen eller strax bakåt.',
          'Lower until the upper arms are in line with the torso or slightly behind.',
        ),
        lz(
          'Pressa upp och in utan att knocka hantlarna.',
          'Press up without clanging the dumbbells.',
        ),
      ),
      mistakes: steps(
        lz('Armbågarna rakt ut i T.', 'Elbows flared straight out.'),
        lz('Hantlarna sjunker mot magen.', 'Dumbbells drifting down to the belly.'),
      ),
      coachCues: steps(lz('Raka handleder.', 'Wrists stacked.'), lz('Tryck upp.', 'Press.')),
      tempo: TEMPO_PRESS,
    }),
  },
  {
    id: 'incline-dumbbell-press',
    name: lz('Hantelpress i lutande bänk', 'Incline dumbbell press'),
    cue: lz('20–30 graders lutning, bröstet högt.', '20–30 degree incline, chest up.'),
    category: 'strength',
    equipment: ['dumbbells', 'bench'],
    muscles: { chest: 0.8, shoulders: 0.8, triceps: 0.5 },
    met: 4.5,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Ställ bänken i 20–30 graders lutning, hantlarna vid nyckelbenen.',
          'Set the bench to 20–30 degrees and hold the dumbbells by the collarbone.',
        ),
        lz(
          'Pres upp längs axellinjen, inte över ansiktet.',
          'Press up along the shoulder line, not over the face.',
        ),
        lz(
          'Sänk långsamt tills du känner en sträckning i bröstmuskeln.',
          'Lower until you feel a stretch across the chest.',
        ),
      ),
      mistakes: steps(
        lz('Bänken för hög – axlarna tar över.', 'Bench too steep – shoulders take over.'),
        lz('Nacken spänns.', 'Neck braced.'),
      ),
      coachCues: steps(lz('Bröstet upp.', 'Chest proud.'), lz('Armbågarna i 45.', 'Elbows at 45.')),
      tempo: TEMPO_PRESS,
    }),
  },
  {
    id: 'dumbbell-fly',
    name: lz('Hantelflys', 'Dumbbell fly'),
    cue: lz('Lätta armbågar, breda armarna.', 'Soft elbows, wide arms.'),
    category: 'strength',
    equipment: ['dumbbells', 'bench'],
    muscles: { chest: 1, shoulders: 0.3 },
    met: 3.5,
    secondsPerRep: 3.5,
    instructions: instr({
      steps: steps(
        lz(
          'Ligg på bänken, hantlarna ovanför bröstkorgen, armbågarna lätt böjda hela passet.',
          'Lie on the bench, dumbbells over the chest, elbows softly bent the whole way.',
        ),
        lz(
          'Öppna armarna i en båge tills du känner en rejäl bröstssträckning.',
          'Open the arms in an arc until you feel a deep chest stretch.',
        ),
        lz(
          'Slut som om du kramar ett träd – händerna över bröstet.',
          "Close like you're hugging a tree, hands back over the chest.",
        ),
      ),
      mistakes: steps(
        lz(
          'Rak arm, låst armbåge – axeln får jobbet.',
          'Straight locked arms – the shoulders do the work.',
        ),
        lz('Sänker för djupt med tyngd.', 'Going too deep under load.'),
      ),
      coachCues: steps(lz('Krama.', 'Hug it.'), lz('Mjuka armbågar.', 'Soft elbows.')),
      tempo: { down: lz('öppna', 'open'), up: lz('krama', 'hug') },
    }),
  },
  {
    id: 'one-arm-dumbbell-row',
    name: lz('Enarmsrodd med hantel', 'One-arm dumbbell row'),
    cue: lz(
      'Dra armbågen mot höften, axeln nära kroppen.',
      'Row the elbow to the hip, close to the body.',
    ),
    category: 'strength',
    equipment: ['dumbbells', 'bench'],
    muscles: { back: 1, biceps: 0.5, core: 0.2 },
    met: 4.5,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Stöd ena handen och knät mot bänken, rygg som ett bord.',
          'Brace hand and knee on the bench, back flat as a table.',
        ),
        lz(
          'Hantelen rakt under axeln, armbågen nära kroppen.',
          'Dumbbell directly under the shoulder, elbow close.',
        ),
        lz(
          'Dra armbågen bakåt mot höften och håll toppen kort.',
          'Row the elbow back to the hip and pause at the top.',
        ),
        lz('Sänk långsamt, kroppen snurrar inte.', 'Lower slowly without twisting the torso.'),
      ),
      mistakes: steps(
        lz('Dra med armen – rodda med armbågen.', 'Pulling with the arm instead of the back.'),
        lz('Ryggen roterar vid varje rep.', 'Torso rotating each rep.'),
      ),
      coachCues: steps(lz('Mot höften.', 'To the hip.'), lz('Still kropp.', 'Quiet torso.')),
      tempo: TEMPO_PULL,
    }),
  },
  {
    id: 'dumbbell-pullover',
    name: lz('Hantelpullover', 'Dumbbell pullover'),
    cue: lz(
      'Känns i bröstkorgen – lås armbågarna i vinkel.',
      'Feel it in the ribcage – keep a fixed elbow angle.',
    ),
    category: 'strength',
    equipment: ['dumbbells', 'bench'],
    muscles: { back: 0.7, chest: 0.7, triceps: 0.3 },
    met: 4.0,
    secondsPerRep: 3.5,
    instructions: instr({
      steps: steps(
        lz(
          'Ligg över bänken, håll en hantel i båda händerna ovanför bröstet.',
          'Lie across the bench holding one dumbbell in both hands over your chest.',
        ),
        lz(
          'Sänk sträckta armar bakåt mot huvudet tills armar och kropp bildar en rak linje.',
          'Lower in an arc behind your head until your arms align with your body.',
        ),
        lz(
          'Känn bröstkorgen vidgas – för hanteln tillbaka till bröstet.',
          'Feel the ribcage expand and bring the weight back over the chest.',
        ),
      ),
      mistakes: steps(
        lz('Armbågarna böjs och ändras varje rep.', 'Elbows bending mid-rep.'),
        lz('Bara axeln rör sig, inte bröstet.', 'Only the shoulders feel it.'),
      ),
      coachCues: steps(
        lz('Mjuka armbågar.', 'Soft elbows.'),
        lz('Känn bröstkorgen.', 'Stretch the chest.'),
      ),
      tempo: { down: lz(' bakåt', 'back'), up: lz('upp', 'over') },
    }),
  },
  {
    id: 'dumbbell-lateral-raise',
    name: lz('Sidolyft med hantlar', 'Dumbbell lateral raise'),
    cue: lz('Lugna armar, lyft till axelhöjd.', 'Quiet arms, raise to shoulder height.'),
    category: 'strength',
    equipment: ['dumbbells'],
    muscles: { shoulders: 1, back: 0.2 },
    met: 3.0,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz(
          'Stå med lätt böjda armar längs sidorna, tummen något nedåt.',
          'Stand with a soft bend at the elbow, thumbs slightly down.',
        ),
        lz(
          'Lyft utåt i en båge tills armarna är i axelhöjd.',
          'Raise out to the sides until your arms are at shoulder height.',
        ),
        lz('Sänk långsamt – släpp inte hantlarna ner.', "Lower slowly – don't drop the weight."),
      ),
      mistakes: steps(
        lz('Axlingen lyfter med.', 'Shoulders shrugging into the lift.'),
        lz('Sväng med kroppen.', 'Swinging from the torso.'),
      ),
      coachCues: steps(
        lz('Tummen ner.', 'Pour the pitcher.'),
        lz('Lugna axlar.', 'Shoulders down.'),
      ),
      tempo: { down: lz('sänk', 'lower'), up: lz('lyft', 'raise') },
    }),
  },
  {
    id: 'dumbbell-step-up',
    name: lz('Steg upp med hantlar', 'Dumbbell step-up'),
    cue: lz(
      'Hela foten på kassen – tryck upp med överbenet.',
      'Full foot on the box – drive through the top leg.',
    ),
    category: 'strength',
    equipment: ['dumbbells', 'bench'],
    muscles: { quads: 1, glutes: 0.9, hamstrings: 0.5, core: 0.3 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Ställ en fot på ett kasst / bänk, hantlarna längs sidorna.',
          'Place one foot on a box or bench, dumbbells at your sides.',
        ),
        lz(
          'Tryck genom hela foten och res dig upp – underbenet bara doppar.',
          'Stand up through the whole top foot; the trailing leg just tips down.',
        ),
        lz(
          'Sänk kontrollerat och repa om, byt ben efter halva.',
          'Lower with control and alternate legs at the halfway mark.',
        ),
      ),
      mistakes: steps(
        lz('Sparkar ifrån med markfoten.', 'Pushing off the floor with the bottom foot.'),
        lz('Knät viker inåt.', 'Knee collapsing inward.'),
      ),
      coachCues: steps(lz('Hela foten.', 'Whole foot.'), lz('Rak kropp.', 'Tall torso.')),
      tempo: TEMPO_DOWN_UP,
    }),
  },
  {
    id: 'overhead-tricep-extension',
    name: lz('Overhead tricep extension', 'Overhead tricep extension'),
    cue: lz('Armbågarna nära huvudet.', 'Elbows close to the head.'),
    category: 'strength',
    equipment: ['dumbbells'],
    muscles: { triceps: 1 },
    met: 3.5,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz(
          'Håll en hantel i båda händerna (eller en i varje) över huvudet.',
          'Hold one dumbbell in both hands (or one per hand) overhead.',
        ),
        lz(
          'Sänk genom att böja armbågarna bakom huvudet, överarmarna stilla.',
          'Lower by bending the elbows behind the head; upper arms stay fixed.',
        ),
        lz(
          'Sträck ut igen utan att armbågarna glider isär.',
          'Extend again without letting the elbows flare.',
        ),
      ),
      mistakes: steps(
        lz('Armbågarna pekar framåt.', 'Elbows pointing forward.'),
        lz('Svankar i ländryggen.', 'Arching through the lower back.'),
      ),
      coachCues: steps(lz('Nära huvudet.', 'Close to the head.'), lz('Högt upp.', 'Lock tall.')),
      tempo: TEMPO_PRESS,
    }),
  },

  // ---- Conditioning & core -------------------------------------------------
  {
    id: 'sprint-interval',
    name: lz('Sprintintervall', 'Sprint intervals'),
    cue: lz(
      'På toppfart – landa på främre delen av foten.',
      'Top speed – land on the balls of your feet.',
    ),
    category: 'cardio',
    equipment: ['none'],
    muscles: { quads: 0.8, glutes: 0.7, hamstrings: 0.6, core: 0.4 },
    met: 12.5,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz(
          'Hitta en rak yta: gräs, elljusspår eller löpband.',
          'Find a straight lane: field, track or treadmill.',
        ),
        lz(
          'Bygg upp fort, håll 90–100 % fart, armbågarna pumpar.',
          'Reach near-max speed quickly and drive the arms.',
        ),
        lz(
          'Sakta ned över några steg – stanna inte tvärt.',
          "Decelerate over several steps – don't stop dead.",
        ),
      ),
      coachCues: steps(lz('Högt tempo.', 'Fast hands.'), lz('Lätta fötter.', 'Light feet.')),
    }),
  },
  {
    id: 'shadow-boxing',
    name: lz('Skuggboxning', 'Shadow boxing'),
    cue: lz('Lätta händer, hakan bak.', 'Light hands, chin down.'),
    category: 'cardio',
    equipment: ['none'],
    muscles: { shoulders: 0.6, core: 0.5, quads: 0.3 },
    met: 6.0,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz(
          'Steg till boxningsställning: knän mjuka, händer vid hakan.',
          'Get into a boxing stance: soft knees, hands by the chin.',
        ),
        lz(
          'Slå kombinationer: jab–raka–huk och rotera genom höften.',
          'Throw jab–cross–hook combinations, rotating through the hips.',
        ),
        lz(
          'Håll fötterna i rörelse mellan slagserierna.',
          'Keep the feet moving between combinations.',
        ),
      ),
      mistakes: steps(
        lz('Sänker händerna mellan slag.', 'Dropping the hands.'),
        lz('Flaxar med armarna utan rotation.', 'Arm-flailing without hip rotation.'),
      ),
      coachCues: steps(lz('Händerna upp.', 'Hands up.'), lz('Rotera.', 'Rotate.')),
    }),
  },
  {
    id: 'superman',
    name: lz('Superman', 'Superman hold'),
    cue: lz('Lyft bröstkorg och lår samtidigt.', 'Lift chest and thighs at once.'),
    category: 'core',
    equipment: ['none'],
    muscles: { back: 1, glutes: 0.7, core: 0.4 },
    met: 3.0,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz(
          'Bukplank på golvet, armar sträckta framför huvudet.',
          'Lie face down, arms extended overhead.',
        ),
        lz(
          'Lyft bröst, armar och lår från golvet – kroppen spänd.',
          'Float your chest, arms and thighs off the floor.',
        ),
        lz('Håll en sekund, sänk och repa om.', 'Hold a second, lower and repeat.'),
      ),
      coachCues: steps(lz('Längd först.', 'Reach long.'), lz('Kläm bak.', 'Squeeze the back.')),
      tempo: { down: lz('sänk', 'lower'), up: lz('lyft', 'lift') },
    }),
  },
  {
    id: 'renegade-row',
    name: lz('Renegade row', 'Renegade row'),
    cue: lz('Höfterna stilla – rodda utan att gunga.', 'Hips quiet – row without rocking.'),
    category: 'core',
    equipment: ['dumbbells', 'kettlebell'],
    muscles: { back: 0.9, core: 0.8, shoulders: 0.5 },
    met: 5.5,
    secondsPerRep: 3.5,
    instructions: instr({
      steps: steps(
        lz(
          'Plank med en hantel/kula i varje hand, fötterna breda.',
          'Plank on a dumbbell or kettlebell in each hand, feet wide.',
        ),
        lz(
          'Rota bort armbågen och dra vikten till revbenen.',
          'Punch through and row the weight to your ribs.',
        ),
        lz('Sänk och repa om på andra sidan.', 'Lower and alternate sides.'),
      ),
      mistakes: steps(
        lz('Höften roterar upp.', 'Hips rotating open.'),
        lz('Draget rycks med axeln.', 'Yanking with the shoulder.'),
      ),
      coachCues: steps(lz('Stilla höfter.', 'Quiet hips.'), lz('Dra lågt.', 'Row low.')),
      tempo: TEMPO_PULL,
    }),
  },
  {
    id: 'turkish-get-up',
    name: lz('Turkish get-up', 'Turkish get-up'),
    cue: lz(
      'En punkt mot taket, ögonen på vikten.',
      'One point to the ceiling, eyes on the weight.',
    ),
    category: 'strength',
    equipment: ['kettlebell'],
    muscles: { shoulders: 0.8, core: 0.8, glutes: 0.6 },
    met: 6.0,
    secondsPerRep: 6,
    instructions: instr({
      steps: steps(
        lz(
          'Ligg på rygg, vikten rakt upp över ena axeln, armen låst.',
          'Lie on your back with the weight locked out over one shoulder.',
        ),
        lz(
          'Rulla upp på armbågen och handen, lyft sedan höften i en brygga.',
          'Roll onto your forearm, then your hand, then lift the hips.',
        ),
        lz(
          'Dra knät under kroppen, res dig upp och stå rak med armen låst mot taket.',
          'Pull the knee under you, stand up tall with the arm locked to the ceiling.',
        ),
        lz(
          'Gå ner samma väg, baklänges och långsamt, i kontroll i varje steg.',
          'Reverse the steps exactly and slowly.',
        ),
      ),
      mistakes: steps(
        lz('Tappar vikten ur linjen över armbågen.', 'Weight drifting off the elbow line.'),
        lz('Skyndar – stegen flyter ihop.', 'Rushing and blurring the positions.'),
      ),
      coachCues: steps(
        lz('Ögonen upp.', 'Eyes up.'),
        lz('Långsamt.', 'Slow.'),
        lz('Stabila händer.', 'Stack it.'),
      ),
    }),
  },
  {
    id: 'kb-figure-eight',
    name: lz('Kettlebell figure 8', 'Kettlebell figure 8'),
    cue: lz('Höftgångjärn, kulan runt benen.', 'Hip hinge, circle it through.'),
    category: 'cardio',
    equipment: ['kettlebell'],
    muscles: { core: 0.8, glutes: 0.6, shoulders: 0.3 },
    met: 6.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz(
          'Bred fotställning, kulan hänger på armen framför golvet.',
          'Wide stance, kettlebell in one hand in front of the floor.',
        ),
        lz(
          'Fäll höften och för kulan i en 8:a under benet och runt ryggen.',
          'Hinge and snake the bell through and around the legs.',
        ),
        lz(
          'Byt hand vid varje varv, kroppen stabil.',
          'Switch hands each pass with a steady torso.',
        ),
      ),
      mistakes: steps(
        lz('Rundad rygg i bytet.', 'Rounding the back at the hand-off.'),
        lz('Kulan slår mot benen.', 'Bell banging the legs.'),
      ),
      coachCues: steps(lz('Höften bak.', 'Hinge.'), lz('Mjuka byten.', 'Smooth hand-offs.')),
    }),
  },
];
