import { lz, type Exercise, type ExerciseInstructions, type LocalizedString } from '@/core/domain';

/**
 * Exercise library. Add new exercises here – workouts reference them by id.
 * MET values are approximations based on the Compendium of Physical
 * Activities (resistance training 3.5–6, vigorous calisthenics 8, burpees ~8+).
 *
 * `instructions` drive both the tappable how-to sheet in the workout overview
 * and the coach's technique cues during a set.
 */

const steps = (...items: LocalizedString[]) => items;

/** Shared tempo words for controlled strength movements. */
const TEMPO_DOWN_UP = { down: lz('ner', 'down'), up: lz('upp', 'up') };
const TEMPO_PRESS = { down: lz('sänk', 'lower'), up: lz('pressa', 'press') };
const TEMPO_PULL = { down: lz('släpp', 'release'), up: lz('dra', 'pull') };

const instr = (i: ExerciseInstructions) => i;

export const EXERCISES: readonly Exercise[] = [
  // ---- Lower body -------------------------------------------------------
  {
    id: 'squat',
    name: lz('Knäböj', 'Squat'),
    cue: lz('Bröstet upp, knäna utåt.', 'Chest up, knees out.'),
    category: 'strength',
    equipment: ['none'],
    muscles: { quads: 1, glutes: 0.8, hamstrings: 0.4, core: 0.3 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz('Stå axelbrett med tårna lätt utåt.', 'Stand shoulder-width apart, toes slightly out.'),
        lz('Spänn magen och skjut höften bakåt som om du sätter dig på en stol.', 'Brace your core and push the hips back as if sitting on a chair.'),
        lz('Sänk dig tills låren är parallella med golvet, knäna följer tårnas riktning.', 'Lower until thighs are parallel to the floor, knees tracking over the toes.'),
        lz('Tryck ifrån genom hälarna och res dig upp.', 'Drive through your heels and stand back up.'),
      ),
      mistakes: steps(
        lz('Knäna faller inåt.', 'Knees caving inward.'),
        lz('Hälarna lyfter från golvet.', 'Heels lifting off the floor.'),
        lz('Ryggen rundas i botten.', 'Lower back rounding at the bottom.'),
      ),
      coachCues: steps(
        lz('Knäna utåt.', 'Knees out.'),
        lz('Hälarna i golvet.', 'Heels down.'),
        lz('Bröstet upp.', 'Chest up.'),
        lz('Djupt ner.', 'Go deep.'),
      ),
      tempo: TEMPO_DOWN_UP,
    }),
  },
  {
    id: 'lunge',
    name: lz('Utfall', 'Lunge'),
    cue: lz('Långt steg, sänk rakt ner.', 'Long step, drop straight down.'),
    category: 'strength',
    equipment: ['none'],
    muscles: { quads: 0.9, glutes: 0.9, hamstrings: 0.5, core: 0.3 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz('Stå höftbrett, händerna på höfterna eller framför bröstet.', 'Stand hip-width apart, hands on hips or in front of your chest.'),
        lz('Ta ett långt kliv framåt med ena benet.', 'Take a long step forward with one leg.'),
        lz('Sänk bakre knät rakt ner mot golvet tills båda knäna är i 90 grader.', 'Drop the back knee straight down until both knees are at 90 degrees.'),
        lz('Tryck ifrån med främre foten tillbaka till start. Byt ben varje rep.', 'Push off the front foot back to start. Alternate legs each rep.'),
      ),
      mistakes: steps(
        lz('Främre knät åker förbi tårna.', 'Front knee travelling past the toes.'),
        lz('Överkroppen lutar framåt.', 'Torso leaning forward.'),
        lz('För kort steg – knät får för spetsig vinkel.', 'Step too short – knee angle too sharp.'),
      ),
      coachCues: steps(
        lz('Rakt ner.', 'Straight down.'),
        lz('Långt kliv.', 'Long step.'),
        lz('Överkroppen upprätt.', 'Torso tall.'),
        lz('Byt ben.', 'Switch legs.'),
      ),
      tempo: TEMPO_DOWN_UP,
    }),
  },
  {
    id: 'glute-bridge',
    name: lz('Höftlyft', 'Glute bridge'),
    cue: lz('Kläm ihop rumpan i toppen.', 'Squeeze the glutes at the top.'),
    category: 'strength',
    equipment: ['none'],
    muscles: { glutes: 1, hamstrings: 0.6, core: 0.2 },
    met: 3.5,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz('Ligg på rygg med böjda knän, fötterna höftbrett nära rumpan.', 'Lie on your back, knees bent, feet hip-width close to your glutes.'),
        lz('Pressa hälarna i golvet och lyft höften tills kroppen bildar en rak linje från knän till axlar.', 'Press your heels down and lift the hips until you form a straight line from knees to shoulders.'),
        lz('Kläm ihop sätet i toppen i en sekund.', 'Squeeze the glutes at the top for a second.'),
        lz('Sänk kontrollerat utan att vila på golvet.', 'Lower under control without resting on the floor.'),
      ),
      mistakes: steps(
        lz('Svanken överdrivs i toppen.', 'Over-arching the lower back at the top.'),
        lz('Trycket hamnar på tårna istället för hälarna.', 'Pushing through the toes instead of the heels.'),
      ),
      coachCues: steps(lz('Kläm ihop.', 'Squeeze.'), lz('Hälarna ner.', 'Heels down.'), lz('Håll i toppen.', 'Hold at the top.')),
      tempo: { down: lz('sänk', 'lower'), up: lz('lyft', 'lift') },
    }),
  },
  {
    id: 'goblet-squat',
    name: lz('Goblet-knäböj', 'Goblet squat'),
    cue: lz('Håll vikten nära bröstet.', 'Keep the weight close to your chest.'),
    category: 'strength',
    equipment: ['dumbbells', 'kettlebell'],
    muscles: { quads: 1, glutes: 0.8, core: 0.5, back: 0.2 },
    met: 6.0,
    secondsPerRep: 3.5,
    instructions: instr({
      steps: steps(
        lz('Håll en hantel eller kettlebell med båda händerna tätt mot bröstet.', 'Hold a dumbbell or kettlebell with both hands tight against your chest.'),
        lz('Stå axelbrett, tårna lätt utåt, armbågarna pekar nedåt.', 'Stand shoulder-width apart, toes slightly out, elbows pointing down.'),
        lz('Sänk dig rakt ner tills armbågarna nuddar insidan av knäna.', 'Lower straight down until your elbows touch the inside of your knees.'),
        lz('Tryck upp genom hela foten och håll bröstet högt.', 'Drive up through the whole foot, chest high.'),
      ),
      mistakes: steps(
        lz('Vikten glider ut från kroppen.', 'Weight drifting away from the body.'),
        lz('Överkroppen fälls framåt.', 'Torso folding forward.'),
      ),
      coachCues: steps(lz('Vikten nära.', 'Weight close.'), lz('Armbågarna in.', 'Elbows in.'), lz('Bröstet högt.', 'Chest high.'), lz('Tryck upp.', 'Drive up.')),
      tempo: TEMPO_DOWN_UP,
    }),
  },
  {
    id: 'romanian-deadlift',
    name: lz('Rumänska marklyft', 'Romanian deadlift'),
    cue: lz('Skjut höften bakåt, rak rygg.', 'Push the hips back, flat back.'),
    category: 'strength',
    equipment: ['dumbbells', 'barbell'],
    muscles: { hamstrings: 1, glutes: 0.9, back: 0.5, core: 0.3 },
    met: 6.0,
    secondsPerRep: 3.5,
    instructions: instr({
      steps: steps(
        lz('Stå höftbrett med vikterna framför låren, lätt böj i knäna.', 'Stand hip-width with the weights in front of your thighs, soft knees.'),
        lz('Skjut höften rakt bakåt och låt vikterna glida längs benen.', 'Push the hips straight back and let the weights slide down your legs.'),
        lz('Sänk tills du känner en tydlig sträckning i baksida lår – ryggen är rak hela vägen.', 'Lower until you feel a clear stretch in the hamstrings – back flat the whole way.'),
        lz('Pressa höften framåt och res dig upp genom att spänna sätet.', 'Drive the hips forward and stand up by squeezing the glutes.'),
      ),
      mistakes: steps(
        lz('Ryggen rundas.', 'Rounding the back.'),
        lz('Rörelsen blir en knäböj istället för ett höftgångjärn.', 'Turning it into a squat instead of a hip hinge.'),
        lz('Vikterna åker ut framför kroppen.', 'Weights drifting away from the legs.'),
      ),
      coachCues: steps(lz('Höften bak.', 'Hips back.'), lz('Rak rygg.', 'Flat back.'), lz('Vikten nära benen.', 'Weights close.'), lz('Kläm sätet.', 'Squeeze glutes.')),
      tempo: { down: lz('höften bak', 'hips back'), up: lz('upp', 'up') },
    }),
  },
  {
    id: 'calf-raise',
    name: lz('Tåhävningar', 'Calf raise'),
    category: 'strength',
    equipment: ['none'],
    muscles: { calves: 1 },
    met: 3.0,
    secondsPerRep: 2,
    instructions: instr({
      steps: steps(
        lz('Stå höftbrett, gärna med framfoten på ett trappsteg eller en kant.', 'Stand hip-width, ideally with the balls of your feet on a step or edge.'),
        lz('Pressa upp på tårna så högt du kan.', 'Press up onto your toes as high as you can.'),
        lz('Håll en sekund i toppen.', 'Hold for a second at the top.'),
        lz('Sänk långsamt tills du känner en sträckning i vaden.', 'Lower slowly until you feel a stretch in the calf.'),
      ),
      mistakes: steps(lz('Studsar utan kontroll.', 'Bouncing without control.'), lz('Knäna böjs och hjälper till.', 'Bending the knees to help.')),
      coachCues: steps(lz('Högt upp.', 'All the way up.'), lz('Långsamt ner.', 'Slow down.'), lz('Håll i toppen.', 'Hold at the top.')),
      tempo: { down: lz('ner', 'down'), up: lz('upp', 'up') },
    }),
  },
  {
    id: 'wall-sit',
    name: lz('Jägarvila', 'Wall sit'),
    cue: lz('Lår parallella med golvet.', 'Thighs parallel to the floor.'),
    category: 'strength',
    equipment: ['none'],
    muscles: { quads: 1, glutes: 0.4 },
    met: 4.0,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Ställ dig med ryggen mot en vägg, fötterna ungefär en halvmeter ut.', 'Stand with your back against a wall, feet about half a metre out.'),
        lz('Glid ner tills knäna är i 90 grader och låren parallella med golvet.', 'Slide down until your knees are at 90 degrees and thighs parallel to the floor.'),
        lz('Pressa ländryggen mot väggen och håll positionen. Andas lugnt.', 'Press your lower back into the wall and hold. Breathe steadily.'),
      ),
      mistakes: steps(lz('Sitter för högt – för lite belastning.', 'Sitting too high – not enough load.'), lz('Händerna på låren för att avlasta.', 'Resting hands on thighs to unload.')),
      coachCues: steps(lz('Ryggen mot väggen.', 'Back on the wall.'), lz('Andas.', 'Breathe.'), lz('Håll kvar.', 'Stay there.')),
    }),
  },

  // ---- Upper body -------------------------------------------------------
  {
    id: 'push-up',
    name: lz('Armhävningar', 'Push-up'),
    cue: lz('Rak kropp, armbågarna nära.', 'Straight body, elbows tucked.'),
    category: 'strength',
    equipment: ['none'],
    muscles: { chest: 1, triceps: 0.7, shoulders: 0.5, core: 0.4 },
    met: 5.5,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz('Börja i plankposition med händerna strax bredare än axlarna.', 'Start in a plank with hands just wider than your shoulders.'),
        lz('Spänn magen och sätet så att kroppen bildar en rak linje.', 'Brace your core and glutes so your body is a straight line.'),
        lz('Sänk bröstet mot golvet med armbågarna i ungefär 45 grader från kroppen.', 'Lower your chest to the floor with elbows around 45 degrees from your body.'),
        lz('Pressa upp tills armarna är raka.', 'Press up until your arms are straight.'),
      ),
      mistakes: steps(
        lz('Höften hänger ner eller sticker upp.', 'Hips sagging or piking up.'),
        lz('Armbågarna flaxar rakt ut åt sidorna.', 'Elbows flaring straight out to the sides.'),
        lz('Halva rörelser – bröstet når inte ner.', 'Half reps – chest not reaching down.'),
      ),
      coachCues: steps(lz('Rak kropp.', 'Straight body.'), lz('Armbågarna in.', 'Elbows in.'), lz('Bröstet ner.', 'Chest down.'), lz('Pressa.', 'Press.')),
      tempo: TEMPO_PRESS,
    }),
  },
  {
    id: 'shoulder-press',
    name: lz('Axelpress', 'Shoulder press'),
    cue: lz('Spänn magen, pressa rakt upp.', 'Brace the core, press straight up.'),
    category: 'strength',
    equipment: ['dumbbells'],
    muscles: { shoulders: 1, triceps: 0.6, core: 0.2 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz('Håll hantlarna vid axlarna med handflatorna framåt, armbågarna något framför kroppen.', 'Hold the dumbbells at shoulder height, palms forward, elbows slightly in front of the body.'),
        lz('Spänn magen och sätet så att du inte svankar.', 'Brace your core and glutes so you don’t arch your back.'),
        lz('Pressa hantlarna rakt upp tills armarna är sträckta över huvudet.', 'Press the dumbbells straight up until your arms are extended overhead.'),
        lz('Sänk kontrollerat tillbaka till axelhöjd.', 'Lower under control back to shoulder height.'),
      ),
      mistakes: steps(lz('Svankar för att få upp vikten.', 'Arching the back to get the weight up.'), lz('Hantlarna åker framåt istället för rakt upp.', 'Dumbbells drifting forward instead of straight up.')),
      coachCues: steps(lz('Spänn magen.', 'Brace.'), lz('Rakt upp.', 'Straight up.'), lz('Kontrollerat ner.', 'Control it down.')),
      tempo: TEMPO_PRESS,
    }),
  },
  {
    id: 'bent-over-row',
    name: lz('Hantelrodd', 'Bent-over row'),
    cue: lz('Dra armbågarna bakåt mot höften.', 'Drive the elbows back toward the hips.'),
    category: 'strength',
    equipment: ['dumbbells'],
    muscles: { back: 1, biceps: 0.6, shoulders: 0.3, core: 0.3 },
    met: 5.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz('Fäll överkroppen framåt med rak rygg tills den är nästan parallell med golvet, lätt böj i knäna.', 'Hinge forward with a flat back until your torso is nearly parallel to the floor, knees soft.'),
        lz('Låt hantlarna hänga rakt ner under axlarna.', 'Let the dumbbells hang straight down under your shoulders.'),
        lz('Dra armbågarna bakåt och uppåt mot höften, kläm ihop skulderbladen.', 'Drive the elbows back and up toward the hips, squeezing the shoulder blades.'),
        lz('Sänk långsamt tillbaka.', 'Lower slowly back down.'),
      ),
      mistakes: steps(lz('Ryggen rundas.', 'Rounding the back.'), lz('Rycker med överkroppen.', 'Jerking the torso to lift.'), lz('Axlarna åker upp mot öronen.', 'Shoulders shrugging up to the ears.')),
      coachCues: steps(lz('Rak rygg.', 'Flat back.'), lz('Armbågarna bak.', 'Elbows back.'), lz('Kläm skulderbladen.', 'Squeeze the blades.')),
      tempo: TEMPO_PULL,
    }),
  },
  {
    id: 'bicep-curl',
    name: lz('Bicepscurl', 'Bicep curl'),
    category: 'strength',
    equipment: ['dumbbells'],
    muscles: { biceps: 1 },
    met: 3.5,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz('Stå höftbrett med hantlarna längs sidorna, handflatorna framåt.', 'Stand hip-width with the dumbbells at your sides, palms forward.'),
        lz('Håll armbågarna fast intill kroppen.', 'Keep your elbows pinned to your sides.'),
        lz('Böj armarna och lyft hantlarna mot axlarna.', 'Bend your arms and curl the dumbbells toward your shoulders.'),
        lz('Sänk långsamt tills armarna är helt raka.', 'Lower slowly until your arms are fully straight.'),
      ),
      mistakes: steps(lz('Gungar med kroppen.', 'Swinging the body.'), lz('Armbågarna åker framåt.', 'Elbows drifting forward.')),
      coachCues: steps(lz('Armbågarna still.', 'Elbows still.'), lz('Långsamt ner.', 'Slow down.'), lz('Full sträckning.', 'Full extension.')),
      tempo: { down: lz('sänk', 'lower'), up: lz('curla', 'curl') },
    }),
  },
  {
    id: 'tricep-dip',
    name: lz('Dips på bänk', 'Bench dip'),
    cue: lz('Armbågarna rakt bakåt.', 'Elbows straight back.'),
    category: 'strength',
    equipment: ['bench'],
    muscles: { triceps: 1, chest: 0.4, shoulders: 0.4 },
    met: 4.5,
    secondsPerRep: 2.5,
    instructions: instr({
      steps: steps(
        lz('Sitt på kanten av en bänk, händerna bredvid höften med fingrarna framåt.', 'Sit on the edge of a bench, hands beside your hips, fingers forward.'),
        lz('Skjut fram rumpan från bänken med benen sträckta eller böjda för lättare variant.', 'Slide your hips off the bench, legs straight (or bent for an easier version).'),
        lz('Sänk kroppen genom att böja armbågarna rakt bakåt till 90 grader.', 'Lower by bending your elbows straight back to 90 degrees.'),
        lz('Pressa upp tills armarna är raka.', 'Press up until your arms are straight.'),
      ),
      mistakes: steps(lz('Armbågarna pekar utåt.', 'Elbows pointing outward.'), lz('Sjunker för djupt – axlarna belastas.', 'Going too deep – stressing the shoulders.')),
      coachCues: steps(lz('Armbågarna bak.', 'Elbows back.'), lz('Nära bänken.', 'Stay close.'), lz('Pressa upp.', 'Press up.')),
      tempo: TEMPO_PRESS,
    }),
  },
  {
    id: 'pull-up',
    name: lz('Chins', 'Pull-up'),
    cue: lz('Hakan över stången.', 'Chin over the bar.'),
    category: 'strength',
    equipment: ['pullUpBar'],
    muscles: { back: 1, biceps: 0.8, core: 0.3 },
    met: 8.0,
    secondsPerRep: 3.5,
    instructions: instr({
      steps: steps(
        lz('Häng i räcket med greppet strax bredare än axlarna.', 'Hang from the bar with a grip just wider than your shoulders.'),
        lz('Spänn magen och dra skulderbladen ner och ihop innan du böjer armarna.', 'Brace your core and pull the shoulder blades down and together before bending the arms.'),
        lz('Dra dig upp tills hakan är över stången.', 'Pull up until your chin clears the bar.'),
        lz('Sänk kontrollerat till helt raka armar.', 'Lower under control to fully straight arms.'),
      ),
      mistakes: steps(lz('Kipping / sparkar med benen.', 'Kipping / swinging the legs.'), lz('Halva rörelser – armarna sträcks aldrig helt.', 'Half reps – never fully extending the arms.')),
      coachCues: steps(lz('Skulderbladen ner.', 'Blades down.'), lz('Hakan över.', 'Chin over.'), lz('Full sträckning.', 'Full hang.')),
      tempo: TEMPO_PULL,
    }),
  },

  // ---- Core -------------------------------------------------------------
  {
    id: 'plank',
    name: lz('Planka', 'Plank'),
    cue: lz('Rak linje från huvud till häl.', 'Straight line from head to heel.'),
    category: 'core',
    equipment: ['none'],
    muscles: { core: 1, shoulders: 0.3 },
    met: 3.5,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Stå på underarmarna med armbågarna rakt under axlarna.', 'Rest on your forearms with elbows directly under your shoulders.'),
        lz('Sträck benen bakåt och stå på tårna.', 'Extend your legs back onto your toes.'),
        lz('Spänn mage och säte så att kroppen bildar en rak linje från huvud till häl.', 'Brace your core and glutes so your body is a straight line from head to heels.'),
        lz('Håll positionen och andas lugnt.', 'Hold the position and breathe steadily.'),
      ),
      mistakes: steps(lz('Höften sjunker.', 'Hips sagging.'), lz('Rumpan sticker upp.', 'Hips piking up.'), lz('Håller andan.', 'Holding your breath.')),
      coachCues: steps(lz('Höften i linje.', 'Hips in line.'), lz('Spänn magen.', 'Brace.'), lz('Andas.', 'Breathe.'), lz('Håll kvar.', 'Stay there.')),
    }),
  },
  {
    id: 'crunch',
    name: lz('Situps', 'Crunch'),
    category: 'core',
    equipment: ['none'],
    muscles: { core: 1 },
    met: 3.8,
    secondsPerRep: 2,
    instructions: instr({
      steps: steps(
        lz('Ligg på rygg med böjda knän och fötterna i golvet.', 'Lie on your back, knees bent, feet flat on the floor.'),
        lz('Händerna lätt bakom huvudet eller korsade över bröstet.', 'Hands lightly behind your head or crossed over your chest.'),
        lz('Rulla upp överkroppen så att skulderbladen lämnar golvet.', 'Curl your upper body so the shoulder blades leave the floor.'),
        lz('Sänk kontrollerat tillbaka utan att släppa spänningen.', 'Lower under control without losing tension.'),
      ),
      mistakes: steps(lz('Drar i nacken med händerna.', 'Pulling on the neck with the hands.'), lz('Använder svung för att komma upp.', 'Using momentum to come up.')),
      coachCues: steps(lz('Hakan från bröstet.', 'Chin off the chest.'), lz('Rulla upp.', 'Curl up.'), lz('Kontrollerat ner.', 'Control it down.')),
      tempo: { down: lz('ner', 'down'), up: lz('upp', 'up') },
    }),
  },
  {
    id: 'russian-twist',
    name: lz('Ryska vridningar', 'Russian twist'),
    category: 'core',
    equipment: ['none'],
    muscles: { core: 1 },
    met: 4.0,
    secondsPerRep: 1.5,
    instructions: instr({
      steps: steps(
        lz('Sitt med böjda knän och luta överkroppen bakåt cirka 45 grader, rak rygg.', 'Sit with bent knees and lean back about 45 degrees, back straight.'),
        lz('Lyft gärna fötterna från golvet för mer utmaning.', 'Lift your feet off the floor for more challenge.'),
        lz('Vrid överkroppen åt ena sidan och nudda golvet bredvid höften med händerna.', 'Rotate your torso to one side and touch the floor beside your hip.'),
        lz('Vrid till andra sidan. Varje sida räknas som en repetition.', 'Rotate to the other side. Each side counts as one rep.'),
      ),
      mistakes: steps(lz('Ryggen rundas.', 'Rounding the back.'), lz('Bara armarna rör sig – inte bålen.', 'Only the arms move – not the torso.')),
      coachCues: steps(lz('Vrid från bålen.', 'Twist from the core.'), lz('Rak rygg.', 'Back straight.'), lz('Byt sida.', 'Switch.')),
    }),
  },
  {
    id: 'leg-raise',
    name: lz('Benlyft', 'Leg raise'),
    cue: lz('Pressa ländryggen mot golvet.', 'Press your lower back into the floor.'),
    category: 'core',
    equipment: ['none'],
    muscles: { core: 1 },
    met: 4.0,
    secondsPerRep: 3,
    instructions: instr({
      steps: steps(
        lz('Ligg på rygg med raka ben och händerna under rumpan eller längs sidorna.', 'Lie on your back, legs straight, hands under your glutes or by your sides.'),
        lz('Pressa ländryggen mot golvet.', 'Press your lower back into the floor.'),
        lz('Lyft benen raka upp mot taket till 90 grader.', 'Raise your straight legs toward the ceiling to 90 degrees.'),
        lz('Sänk långsamt utan att låta hälarna nudda golvet.', 'Lower slowly without letting the heels touch the floor.'),
      ),
      mistakes: steps(lz('Ländryggen lyfter från golvet.', 'Lower back lifting off the floor.'), lz('Benen faller ner utan kontroll.', 'Legs dropping without control.')),
      coachCues: steps(lz('Ryggen i golvet.', 'Back on the floor.'), lz('Långsamt ner.', 'Slow down.'), lz('Inte ända ner.', 'Don’t touch down.')),
      tempo: { down: lz('sänk', 'lower'), up: lz('lyft', 'lift') },
    }),
  },
  {
    id: 'side-plank',
    name: lz('Sidoplanka', 'Side plank'),
    category: 'core',
    equipment: ['none'],
    muscles: { core: 1, shoulders: 0.3 },
    met: 3.5,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Ligg på sidan med underarmen i golvet, armbågen rakt under axeln.', 'Lie on your side, forearm on the floor, elbow directly under your shoulder.'),
        lz('Stapla fötterna på varandra eller sätt den övre foten framför.', 'Stack your feet or place the top foot in front.'),
        lz('Lyft höften så att kroppen bildar en rak linje.', 'Lift your hips so your body forms a straight line.'),
        lz('Håll positionen. Byt sida nästa set.', 'Hold the position. Switch sides next set.'),
      ),
      mistakes: steps(lz('Höften sjunker mot golvet.', 'Hips dropping toward the floor.'), lz('Överkroppen vrids framåt.', 'Torso rotating forward.')),
      coachCues: steps(lz('Höften upp.', 'Hips up.'), lz('Rak linje.', 'Straight line.'), lz('Andas.', 'Breathe.')),
    }),
  },

  // ---- Cardio / full body ----------------------------------------------
  {
    id: 'burpee',
    name: lz('Burpees', 'Burpee'),
    cue: lz('Explosivt upp, mjukt ner.', 'Explode up, land soft.'),
    category: 'cardio',
    equipment: ['none'],
    muscles: { fullBody: 1, quads: 0.6, chest: 0.5, core: 0.5, shoulders: 0.4 },
    met: 8.0,
    secondsPerRep: 4,
    instructions: instr({
      steps: steps(
        lz('Stå höftbrett. Sätt händerna i golvet framför fötterna.', 'Stand hip-width. Place your hands on the floor in front of your feet.'),
        lz('Hoppa tillbaka med fötterna till plankposition.', 'Jump your feet back into a plank.'),
        lz('Gör en armhävning (eller sänk bröstet till golvet).', 'Do a push-up (or lower your chest to the floor).'),
        lz('Hoppa fram med fötterna och hoppa explosivt upp med armarna över huvudet.', 'Jump your feet forward and explode up with your arms overhead.'),
      ),
      mistakes: steps(lz('Ryggen svankar i plankan.', 'Back arching in the plank.'), lz('Landar med raka ben.', 'Landing with straight legs.')),
      coachCues: steps(lz('Ner.', 'Down.'), lz('Bröstet i golvet.', 'Chest down.'), lz('Upp och hoppa!', 'Up and jump!'), lz('Mjuk landning.', 'Soft landing.')),
    }),
  },
  {
    id: 'mountain-climber',
    name: lz('Mountain climbers', 'Mountain climbers'),
    category: 'cardio',
    equipment: ['none'],
    muscles: { core: 0.9, quads: 0.5, shoulders: 0.5, fullBody: 0.6 },
    met: 8.0,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Börja i plankposition på raka armar, händerna under axlarna.', 'Start in a high plank, hands under your shoulders.'),
        lz('Dra ena knät mot bröstet.', 'Drive one knee toward your chest.'),
        lz('Byt ben snabbt, som om du springer på stället.', 'Switch legs quickly, as if running in place.'),
        lz('Håll höften låg och ryggen rak hela tiden.', 'Keep your hips low and back flat throughout.'),
      ),
      mistakes: steps(lz('Rumpan sticker upp.', 'Hips piking up.'), lz('Axlarna åker bakom händerna.', 'Shoulders drifting behind the hands.')),
      coachCues: steps(lz('Höften låg.', 'Hips low.'), lz('Knäna in.', 'Knees in.'), lz('Snabba fötter.', 'Fast feet.'), lz('Håll tempot!', 'Keep the pace!')),
    }),
  },
  {
    id: 'jumping-jack',
    name: lz('Sprattelgubbe', 'Jumping jacks'),
    category: 'cardio',
    equipment: ['none'],
    muscles: { fullBody: 1, calves: 0.5, shoulders: 0.4 },
    met: 7.0,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Stå med fötterna ihop och armarna längs sidorna.', 'Stand with your feet together and arms at your sides.'),
        lz('Hoppa ut med benen brett och för samtidigt armarna över huvudet.', 'Jump your legs out wide while raising your arms overhead.'),
        lz('Hoppa tillbaka till start. Landa mjukt på framfoten.', 'Jump back to start. Land softly on the balls of your feet.'),
      ),
      mistakes: steps(lz('Landar tungt på hälarna.', 'Landing heavily on the heels.'), lz('Armarna når inte över huvudet.', 'Arms not reaching overhead.')),
      coachCues: steps(lz('Lätt på fötterna.', 'Light on your feet.'), lz('Armarna högt.', 'Arms high.'), lz('Håll rytmen.', 'Keep the rhythm.')),
    }),
  },
  {
    id: 'high-knees',
    name: lz('Höga knän', 'High knees'),
    category: 'cardio',
    equipment: ['none'],
    muscles: { fullBody: 0.8, quads: 0.6, core: 0.5, calves: 0.4 },
    met: 8.0,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Spring på stället och lyft knäna till höfthöjd.', 'Run in place, lifting your knees to hip height.'),
        lz('Pumpa med armarna som i löpning.', 'Pump your arms as in running.'),
        lz('Landa på framfoten och håll överkroppen upprätt.', 'Land on the balls of your feet, torso upright.'),
      ),
      mistakes: steps(lz('Lutar bakåt.', 'Leaning back.'), lz('Knäna kommer inte upp.', 'Knees not coming up.')),
      coachCues: steps(lz('Knäna upp!', 'Knees up!'), lz('Snabbare.', 'Faster.'), lz('Upprätt.', 'Stay tall.')),
    }),
  },
  {
    id: 'jump-squat',
    name: lz('Upphopp', 'Jump squat'),
    cue: lz('Landa mjukt, direkt ner igen.', 'Land soft, straight back down.'),
    category: 'cardio',
    equipment: ['none'],
    muscles: { quads: 1, glutes: 0.8, calves: 0.6, fullBody: 0.5 },
    met: 8.0,
    secondsPerRep: 2,
    instructions: instr({
      steps: steps(
        lz('Stå axelbrett och sänk dig till en knäböj.', 'Stand shoulder-width and lower into a squat.'),
        lz('Explodera upp och hoppa så högt du kan, armarna hjälper till.', 'Explode up and jump as high as you can, arms assisting.'),
        lz('Landa mjukt med böjda knän och gå direkt ner i nästa knäböj.', 'Land softly with bent knees and go straight into the next squat.'),
      ),
      mistakes: steps(lz('Landar med raka ben.', 'Landing with straight legs.'), lz('Knäna faller inåt vid landning.', 'Knees caving on landing.')),
      coachCues: steps(lz('Ner.', 'Down.'), lz('Hoppa!', 'Jump!'), lz('Mjukt.', 'Soft.'), lz('Knäna utåt.', 'Knees out.')),
    }),
  },
  {
    id: 'kettlebell-swing',
    name: lz('Kettlebellsving', 'Kettlebell swing'),
    cue: lz('Kraften kommer från höften.', 'The power comes from the hips.'),
    category: 'cardio',
    equipment: ['kettlebell'],
    muscles: { glutes: 1, hamstrings: 0.8, back: 0.5, core: 0.5, shoulders: 0.3 },
    met: 9.0,
    secondsPerRep: 1.5,
    instructions: instr({
      steps: steps(
        lz('Stå axelbrett med kettlebellen en bit framför dig. Fäll fram med rak rygg och grip handtaget med båda händerna.', 'Stand shoulder-width with the kettlebell a bit in front of you. Hinge with a flat back and grab the handle with both hands.'),
        lz('Sväng kulan bakåt mellan benen.', 'Hike the bell back between your legs.'),
        lz('Pressa höften explosivt framåt och låt kulan flyga upp till bröst-höjd. Armarna är bara ett rep.', 'Snap the hips forward explosively and let the bell float up to chest height. Arms are just a rope.'),
        lz('Låt kulan falla tillbaka mellan benen och fäll höften igen.', 'Let the bell fall back between your legs and hinge again.'),
      ),
      mistakes: steps(lz('Lyfter med armarna istället för höften.', 'Lifting with the arms instead of the hips.'), lz('Knäböjer istället för att fälla.', 'Squatting instead of hinging.'), lz('Ryggen rundas i botten.', 'Rounding the back at the bottom.')),
      coachCues: steps(lz('Höften fram!', 'Hips forward!'), lz('Rak rygg.', 'Flat back.'), lz('Kläm sätet.', 'Squeeze.'), lz('Armarna slappa.', 'Loose arms.')),
    }),
  },

  // ---- Mobility ---------------------------------------------------------
  {
    id: 'arm-circles',
    name: lz('Armcirklar', 'Arm circles'),
    category: 'mobility',
    equipment: ['none'],
    muscles: { shoulders: 0.6 },
    met: 2.5,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Stå upprätt med armarna rakt ut åt sidorna.', 'Stand tall with your arms straight out to the sides.'),
        lz('Gör små cirklar framåt, öka gradvis storleken.', 'Make small circles forward, gradually increasing the size.'),
        lz('Byt riktning halvvägs.', 'Switch direction halfway.'),
      ),
      coachCues: steps(lz('Större cirklar.', 'Bigger circles.'), lz('Byt håll.', 'Switch direction.')),
    }),
  },
  {
    id: 'hip-circles',
    name: lz('Höftcirklar', 'Hip circles'),
    category: 'mobility',
    equipment: ['none'],
    muscles: { glutes: 0.3, core: 0.3 },
    met: 2.5,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Stå höftbrett med händerna på höfterna.', 'Stand hip-width with your hands on your hips.'),
        lz('Rita stora cirklar med höften, som med en rockring.', 'Draw big circles with your hips, like using a hula hoop.'),
        lz('Byt riktning halvvägs.', 'Switch direction halfway.'),
      ),
      coachCues: steps(lz('Stora cirklar.', 'Big circles.'), lz('Byt håll.', 'Switch direction.')),
    }),
  },
  {
    id: 'cat-cow',
    name: lz('Katt-ko', 'Cat-cow'),
    category: 'mobility',
    equipment: ['none'],
    muscles: { back: 0.4, core: 0.3 },
    met: 2.3,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Stå på alla fyra med händerna under axlarna och knäna under höfterna.', 'Start on all fours, hands under shoulders, knees under hips.'),
        lz('Andas in: sänk magen, lyft blicken och svanka (ko).', 'Inhale: drop the belly, lift the gaze and arch (cow).'),
        lz('Andas ut: skjut rygg, dra in hakan och pressa golvet ifrån dig (katt).', 'Exhale: round the spine, tuck the chin and push the floor away (cat).'),
        lz('Växla långsamt i takt med andningen.', 'Alternate slowly with your breath.'),
      ),
      coachCues: steps(lz('Andas in, svanka.', 'Inhale, arch.'), lz('Andas ut, runda.', 'Exhale, round.'), lz('Långsamt.', 'Slowly.')),
    }),
  },
  {
    id: 'hamstring-stretch',
    name: lz('Baksida lår-stretch', 'Hamstring stretch'),
    category: 'mobility',
    equipment: ['none'],
    muscles: { hamstrings: 0.3 },
    met: 2.3,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Sitt med ena benet rakt fram och det andra böjt med fotsulan mot insidan låret.', 'Sit with one leg straight and the other bent, sole against the inner thigh.'),
        lz('Fäll fram från höften med rak rygg mot det raka benet.', 'Hinge forward from the hips with a flat back toward the straight leg.'),
        lz('Håll där du känner en sträckning, andas lugnt. Byt ben halvvägs.', 'Hold where you feel a stretch, breathe steadily. Switch legs halfway.'),
      ),
      coachCues: steps(lz('Rak rygg.', 'Flat back.'), lz('Andas ut, sjunk djupare.', 'Exhale, sink deeper.'), lz('Byt ben.', 'Switch legs.')),
    }),
  },
  {
    id: 'child-pose',
    name: lz('Barnets position', 'Child’s pose'),
    category: 'mobility',
    equipment: ['none'],
    muscles: { back: 0.3 },
    met: 2.0,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Sitt på knä med stortårna ihop och knäna isär.', 'Kneel with your big toes together and knees apart.'),
        lz('Sänk överkroppen framåt och sträck armarna långt fram i golvet.', 'Lower your torso forward and reach your arms long on the floor.'),
        lz('Låt pannan vila mot golvet och andas djupt in i ryggen.', 'Rest your forehead on the floor and breathe deeply into your back.'),
      ),
      coachCues: steps(lz('Sträck långt fram.', 'Reach long.'), lz('Djupa andetag.', 'Deep breaths.'), lz('Slappna av.', 'Relax.')),
    }),
  },
  {
    id: 'quad-stretch',
    name: lz('Framsida lår-stretch', 'Quad stretch'),
    category: 'mobility',
    equipment: ['none'],
    muscles: { quads: 0.3 },
    met: 2.3,
    secondsPerRep: 1,
    instructions: instr({
      steps: steps(
        lz('Stå på ett ben, ta tag i motsatt fotled bakom dig.', 'Stand on one leg and grab the opposite ankle behind you.'),
        lz('Dra hälen mot rumpan och pressa höften lätt framåt.', 'Pull the heel toward your glutes and push the hips gently forward.'),
        lz('Håll knäna nära varandra. Byt ben halvvägs.', 'Keep your knees close together. Switch legs halfway.'),
      ),
      coachCues: steps(lz('Höften fram.', 'Hips forward.'), lz('Knäna ihop.', 'Knees together.'), lz('Byt ben.', 'Switch legs.')),
    }),
  },
];

const EXERCISE_MAP: ReadonlyMap<string, Exercise> = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_MAP.get(id);
}
