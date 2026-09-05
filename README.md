# PulseCoach — röstguidad personlig tränare

> En träningsapp som räknar dina repetitioner och vilointervaller **med rösten**, så att du aldrig behöver titta på skärmen under passet.

PulseCoach är byggd med **Expo / React Native + TypeScript** och en medvetet modulär arkitektur: träningsmotorn, röst-coachen och mätvärdesberäkningen är ren TypeScript utan React-beroenden, medan UI:t är ett tunt lager ovanpå. Allt kan bytas ut och byggas vidare på oberoende av varandra.

**Innehåll**

1. [Funktioner](#funktioner)
2. [Kom igång](#kom-igång)
3. [Arkitektur – översikt](#arkitektur--översikt)
4. [Modulerna i detalj](#modulerna-i-detalj)
5. [Hur ett pass körs – dataflödet](#hur-ett-pass-körs--dataflödet)
6. [Innehållsmodellen: övningar, block och program](#innehållsmodellen-övningar-block-och-program)
7. [Intensitet & dagsform](#intensitet--dagsform)
8. [Kalorier & muskelpåverkan](#kalorier--muskelpåverkan)
9. [Interaktionsnivåer](#interaktionsnivåer)
10. [Datalagring & backend-förberedelse](#datalagring--backend-förberedelse)
11. [Designsystem](#designsystem)
12. [Språk (i18n)](#språk-i18n)
13. [Testning](#testning)
14. [Bygga vidare – kokbok](#bygga-vidare--kokbok)
15. [Kända begränsningar & nästa steg](#kända-begränsningar--nästa-steg)

---

## Funktioner

| Flöde | Status |
|---|---|
| Välj pass ur ett bibliotek av modulära program (7 färdiga, varje med egen färg) | ✅ |
| **Skapa egna pass** i en enkel byggare, eller **kopiera & anpassa** ett färdigt program – redigera och radera direkt från korten i biblioteket, från detaljvyn eller inne i byggaren | ✅ |
| Röstcoach räknar reps och vila i stadig takt, på svenska eller engelska | ✅ |
| Coachen är **involverad**: teknik-cues mellan reps, tempo-ord på långsamma lyft, pepp mot slutet av setet (med ditt namn), varierat beröm, "X set kvar", vilo-prat | ✅ |
| Coachen **annonserar nästa övning (med mål) innan vilan startar** och ger **teknik-tips inför nästa övning under vilan** – ett tips eller alla nyckelpunkter, valbart | ✅ |
| **Levande röst**: energi-förval (Lugn / Energisk / Full gas), automatiskt val av bästa röst på enheten (premium > förbättrad > standard), röstväljare med provlyssning | ✅ |
| Tre interaktionsnivåer: **hands-free**, **assisterad**, **manuell** | ✅ |
| Justera intensitet upp/ner **under** passet – reps, tid och vila skalas direkt, coachen säger vad det innebär ("13 repetitioner nu") | ✅ |
| Dagsform-check innan start som föreslår startintensitet; **översikten räknar om reps/tid/vila live** | ✅ |
| Tryck på en övning i översikten → **steg-för-steg-instruktioner**, vanliga fel, coachens cues, tempo, muskler | ✅ |
| Automatisk beräkning av kalorier (MET-baserad) och muskelpåverkan vid avslut | ✅ |
| Historik med streak, totaler och muskelbalans | ✅ |
| Inställningar: språk, röst (energi, röstval, tempo, räkna varje rep, pepp, teknik-cues, tempo-räkning, annonsera nästa, tips under vilan), haptik, profil | ✅ |
| Håller skärmen tänd under pass; **sessionsskärmen får roteras** (liggande: display till vänster, kontroller till höger) | ✅ |
| **Audiosession under passet** (v4): rösten fortsätter med släckt skärm, spelar i ljudlöst läge och *duckar* musik i stället för att stoppa den | ✅ |
| **Bakgrunds-tålig räkning** (v4): efter ett samtal/appbyte hoppar motorn över tiden du inte kunde höra och coachen säger var ni är – aldrig 15 siffror i en klump | ✅ |
| **Justerbart räknetempo** (v4): Lugnt / Normalt / Snabbt före start, ± under setet, **minns per övning** | ✅ |
| **Fortsätt passet?** (v4): pågående pass checkpointas var 5:e sekund – krasch, app-död eller tomt batteri förlorar inte passet | ✅ |
| **Blind paus** (v4): dubbeltryck var som helst på den stora displayen | ✅ |
| Historik med streak, totaler, muskelbalans, **detaljvy per pass, radera enskilt pass och "jämfört med förra gången"** (v4) | ✅ |
| Kalorier visas som **ärligt intervall** (±20 %) och märks "uppskattning" (v4) | ✅ |
| **Sök** i biblioteket (titel, tagline, övningsnamn) och **varv/cirklar** i byggaren (v4) | ✅ |
| **Introduktion** vid första start (3 steg), **ErrorBoundary** med lugn felsida, **opt-in felrapporter** (av som standard) (v4) | ✅ |
| Data sparas lokalt (max 365 loggar), med repository-lager förberett för backend | ✅ |

---

## Kom igång

```bash
npm install
npm start          # Expo dev-server – tryck i för iOS, a för Android, w för web
npm run web        # Direkt till webbläsaren
npm test           # Jest (enhetstester + end-to-end-flödestest)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint (expo-config)
```

**Krav:** Node 20+, npm 10+. För iOS/Android: Expo Go-appen på telefonen eller en simulator/emulator.

> **Om röst på web:** Web Speech API kräver ofta en användarinteraktion innan ljud får spelas. Tryck "Testa rösten" i Inställningar en gång så är det aktiverat.
>
> **Om `expo install` i låsta nätverk:** kommandot ringer `api.expo.dev` för versionsdata. Om det blockeras, slå upp versionerna i `node_modules/expo/bundledNativeModules.json` och installera med vanlig `npm install pkg@version`.

---

## Arkitektur – översikt

Appen är uppdelad i **lager** med strikt beroenderiktning: pilarna pekar alltid inåt mot `core`, aldrig utåt.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  app/               expo-router – filbaserade routes (tunna wrappers)     │
├──────────────────────────────────────────────────────────────────────────┤
│  src/features/      Skärmar (Library, WorkoutDetail, WorkoutBuilder,    │
│                     Session, Summary, History, Settings)                 │
├──────────────────────────────────────────────────────────────────────────┤
│  src/ui/            Designsystem: primitives (Text, Button, ProgressBar…) │
│                     + domänkomponenter (WorkoutCard, IntensityMeter…)    │
├──────────────────────────────────────────────────────────────────────────┤
│  src/state/         Zustand-stores: settings, history, customWorkouts,  │
│                     session (session-storen äger motor + coach)          │
├─────────────────────────────┬────────────────────────────────────────────┤
│  src/adapters/              │  src/data/                                 │
│  Plattformsbryggor:         │  Repository-gränssnitt + lokala            │
│  ExpoSpeech (TTS), haptics  │  implementationer (AsyncStorage)           │
├─────────────────────────────┴────────────────────────────────────────────┤
│  src/core/          REN TYPESCRIPT – inga React/Expo-imports              │
│    domain/          Typer: Exercise, Workout, Session, Settings,         │
│                     CustomWorkoutDraft (+ kompilering till Workout)      │
│    engine/          Planner + SessionEngine (tillståndsmaskin)           │
│    coach/           Coach (event → tal), skript per språk, SpeechPort    │
│    intensity/       Intensitetsskala och skalningsregler                 │
│    metrics/         Kalorier, muskelpåverkan, historik-summering         │
├──────────────────────────────────────────────────────────────────────────┤
│  src/content/       Övningsbibliotek, block och färdiga program          │
│  src/i18n/          UI-texter sv/en                                      │
│  src/theme/         Design-tokens (färg, typografi, spacing, slant)      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Designprinciper

1. **Kärnan är ramverksoberoende.** `src/core` importerar varken React, Expo eller React Native. Den kan köras i Node, testas med en fejkad klocka och i princip återanvändas i en webbapp eller på en server.
2. **Motorn äger inga timers.** `SessionEngine.tick(now)` drivs utifrån. I appen är det ett `setInterval` på 100 ms; i tester är det en manuell klocka. Det gör hela passlogiken deterministisk.
3. **Events, inte anrop.** Motorn publicerar semantiska händelser (`rep`, `restTick`, `intensityChanged`…). Coachen lyssnar och pratar. UI:t lyssnar och ritar. Ingen av dem känner till den andra.
4. **Portar & adaptrar.** Coachen pratar med ett `SpeechPort`-gränssnitt, inte med `expo-speech`. Data går via `Repositories`-gränssnitt, inte via `AsyncStorage`. Byt implementation utan att röra kärnan.
5. **Innehåll är data.** Program byggs av återanvändbara block som refererar övningar via id. Att lägga till ett pass är att skriva ett objekt.

---

## Modulerna i detalj

### `src/core/domain` – domänmodellen

Utöver grundtyperna finns:

- `ExerciseInstructions` på varje övning: `steps` (så gör du), `mistakes` (vanliga fel), `coachCues` (korta cues coachen roterar mellan), `tempo { down, up }` för tempo-räkning. Allt tvåspråkigt via `lz(sv, en)`.
- `WorkoutAccent` (7 färger) + `Workout.custom`/`createdAt` för egna pass.
- `customWorkout.ts` – **utkastmodellen för egna pass** (`CustomWorkoutDraft`): en platt, redigerbar lista av övningar med set, reps-eller-sekunder och vila. `compileDraft()` kompilerar utkastet till en vanlig `Workout` (ett `main`-block, härledd utrustning/muskelfokus/tid, `custom: true`), så planner, motor, coach, mätvärden och summering behöver inte veta om att passet är egenbyggt. `draftFromWorkout()` plattar ut vilket pass som helst (varv expanderas) för "kopiera & anpassa". `validateDraft()` + `DRAFT_LIMITS` sätter gränserna.

| Fil | Innehåll |
|---|---|
| `localized.ts` | `Locale` (`'sv' \| 'en'`), `LocalizedString`, `lz()`-hjälpare, BCP-47-taggar för TTS |
| `exercise.ts` | `Exercise` med `muscles` (last per muskelgrupp 0–1), `met` (metabol ekvivalent), `secondsPerRep` (räknetakt) |
| `workout.ts` | `Workout` → `WorkoutBlock[]` → `WorkoutExercise[]` med `SetPrescription` (`reps` eller `time`) |
| `session.ts` | `SessionLog` – det som persisteras när ett pass är klart. `ReadinessLevel` för dagsform |
| `settings.ts` | `AppSettings`, `InteractionLevel`, `VoiceSettings` (inkl. `announceNext`, `restTips`, `energy`, `voiceId`), `VOICE_ENERGY_PRESETS` + `effectiveVoiceParams()`, `UserProfile`, `DEFAULT_SETTINGS`. Sparade inställningar från äldre versioner djup-mergas över defaults, så nya fält får vettiga värden. |

### `src/core/engine` – motorn

**`planner.ts` – `buildSessionPlan(workout, lookup)`**
Plattar ut den hierarkiska strukturen (block → varv → övningar → set) till en linjär lista av `PlanStep`. Varje steg vet sin basvila (set-vila, övergångsvila eller 0 för sista steget). Efter det behöver motorn bara tänka på "nuvarande steg" och "nästa steg".

**`SessionEngine.ts` – tillståndsmaskinen**

```
idle ──start()──▶ announcing ──(5 s)──▶ working ──(mål nått)──▶ resting ──(vila slut)──┐
                      ▲                    ▲                                         │
                      │                    │  handsFree & samma övning               │
                      │                    └─────────────────────────────────────────┤
                      │  handsFree & ny övning                                       │
                      └──────────────────────────────────────────────────────────────┤
                                                                                     │
                  awaitingStart ◀──── assisted / manual (alla set) ◀─────────────────┘
                       │ confirmStart()
                       └──▶ working

   valfri fas ──pause()──▶ paused ──resume()──▶ (tillbaka, klockan skjuts fram)
   valfri fas ──stop()───▶ finished
```

Publik API-yta:

| Metod | Beskrivning |
|---|---|
| `start()` / `tick(now)` | Starta och driva klockan |
| `pause()` / `resume()` / `togglePause()` | Pausar utan att förlora fas-progress |
| `confirmStart()` | Assisterad/manuell: användaren startar nästa set |
| `markRep()` / `completeSet()` | Manuell: användaren räknar själv |
| `skipRest()` / `skipStep()` | Hoppa över vila / helt steg |
| `adjustIntensity(±1)` | Skalar om pågående mål och vila direkt |
| `stop()` | Avbryt – statistik behålls |
| `events.on(...)` / `subscribe(...)` | Prenumerera på händelser / snapshots |

Motorn hanterar även *glesa ticks* (appen låg i bakgrunden): missade reps "hinns ikapp" i en loop så att räkningen hamnar rätt när skärmen vaknar.

**`types.ts`** – `PlanStep`, `SessionSnapshot` (allt UI:t behöver rendera), `SessionEvents` (den typade händelsekartan), `SessionStats`.

**Nytt i v4 – motorns tålighet**

- `maxCatchUpReps` (standard 3): en enskild `tick()` får räkna ikapp högst tre reps. Större luckor (JS-timers frusna i bakgrunden, samtal) hoppas över genom att fasklockan flyttas fram och `gapSkipped` emitteras; coachen svarar med `resumeAt`: *"Vi fortsätter. Set 2 av 3, rep 5 av 12."* Samma replik används vid manuell paus → fortsätt.
- `setTempoFactor(f)` / `snapshot.tempoFactor`: multiplikator på `exercise.secondsPerRep` (0,7–1,6). Byte mitt i ett set bevarar hur stor del av det pågående rep-fönstret som gått, så räkningen varken hackar eller hoppar. Förval: Lugnt 1,3× / Normalt 1,0× / Snabbt 0,8×; ±-knapparna stegar 0,1 och värdet sparas i `settings.tempoOverrides[exerciseId]`.
- `checkpoint()` / `restore(cp)`: serialiserar stegindex, intensitet, tempo, interaktionsnivå, starttid, förfluten tid och statistik. `restore` börjar om det avbrutna steget (att återuppta mitt i ett rep är inte meningsfullt) och bokför krasch→omstart-tiden som paus så loggens längd förblir ärlig.

### `src/core/coach` – rösten

| Fil | Roll |
|---|---|
| `SpeechPort.ts` | Gränssnittet `speak(utterance)` / `stop()` / `isSpeaking()`. Utterance bär `priority: 'interrupt' \| 'queue' \| 'drop'`. `SilentSpeech` för tester och avstängd röst. |
| `script.ts` | **Allt coachen kan säga**, per språk. Siffror stavas ut ("tre", "three") för krispig TTS. Hälsning med namn, varierat beröm, tidig/sen pepp, personliga repliker, vilo-prat, hold-cues, intensitetsförklaringar. |
| `Coach.ts` | Prenumererar på motorns events och väljer vad som sägs och med vilken prioritet. Repräkning *avbryter* (måste vara i takt), instruktioner *köas*, pepp *droppas* om upptagen. |

Prioritetsmodellen är nyckeln till att räkningen känns stadig: "sju" får aldrig vänta på att en lång mening ska talas klart.

**Involveringsmodellen för ett rep-set** (set med minst 6 reps; kortare set får bara siffror):

```
"Set 2 av 3."  "Sista setet. Ge allt!"  "Kör!"
 1  2  3 ──► teknik-cue efter var 3:e rep i första halvan ("Knäna utåt.")
             långsamma lyft (≥ 3 s/rep med tempo-data): "ner" mitt i rep-fönstret
 halvvägs ─► "Halvvägs!" + kort beröm ("Snygg form.")
 6  7  8 ──► pepp i andra halvan, ibland med namn ("Kom igen Anna!")
"Två kvar!"  "Sista!"
 beröm (varieras) ─► "Knäböj klart." ─► "Nästa: Planka, 30 sekunder." ─► "Vila 20 sekunder."
 under vilan ─► "Tips inför planka: Spänn magen." (─► "Och: Rak linje." …) ─► "Gör dig redo." två, ett
```

**Övergångar mellan övningar.** Nästa övning sägs *före* viloraden (inställning `announceNext`), så att du hinner byta plats eller hämta redskap medan klockan tickar. Målet skalas med aktuell intensitet ("Nästa: Knäböj, 15 repetitioner."). Under vilan schemalägger coachen teknik-tips för den *kommande* övningen (inställning `restTips`: `off` / `one` / `full`) hämtade ur `exercise.cue` + `instructions.coachCues`. Ett tips läggs en bit in i vilan; med `full` sprids upp till tre tips jämnt och de sista 5 sekunderna hålls fria för "Gör dig redo" + nedräkning. Vilor kortare än 8 s och vilor mellan set av *samma* övning får inga tips (där sägs "X set kvar" som förut). Tipsen ligger på **motorns klocka** (`restTick`), så de pausar med passet.

Tidsbaserade hållövningar får hold-cues var 8:e sekund och andningspåminnelser däremellan. Tempo-ordet schemaläggs på **motorns klocka** (via `snapshot`), inte `setTimeout`, så det pausar med passet och är deterministiskt i tester. Källan till cues är `exercise.instructions.coachCues`/`tempo`. Teknik-cues, tempo-räkning, annonsering av nästa övning och vilo-tips kan stängas av var för sig i Inställningar.

**Röstens energi.** `VoiceSettings.energy` (`calm` / `energetic` / `hype`) är ett förval som multipliceras med användarens tempo: `effectiveVoiceParams()` i `domain/settings.ts` ger rate/pitch som skickas med varje utterance (Energisk = 1.10× / 1.08, Full gas = 1.20× / 1.15). Standard är *Energisk*.

### `src/core/intensity` – intensitetsskalan

Fem diskreta nivåer `0.5 / 0.75 / 1.0 / 1.25 / 1.5` (lätt → max) – ett steg ska *kännas*: 10 reps blir 13 på "hård" och 15 på "max". Skalar **volym** (reps, sekunder) proportionellt och **vila** omvänt. Räknetakten (`secondsPerRep`) påverkas medvetet *inte* – en förutsägbar rytm är det som gör ljudräkning möjlig.

### `src/core/metrics` – beräkningar i bakgrunden

Rena funktioner som körs när `finished` emitteras. Se [Kalorier & muskelpåverkan](#kalorier--muskelpåverkan).

### `src/adapters` – plattformsbryggor

- **`speech/ExpoSpeech.ts`** – `SpeechPort` ovanpå `expo-speech`. Implementerar prioritetskön och har en vakthund som drar kön vidare om plattformen glömmer `onDone`. **Röstval:** vid start listas enhetens röster (`getAvailableVoicesAsync`) och rankas med `rankVoice()` – premium/neural (identifierare med `premium`, `neural`, `natural`, `siri`, `wavenet` …) > `Enhanced` > standard > legacy (`eloquence`, `espeak` …). Bästa röst per språk (sv-SE, en-US) väljs automatiskt; användaren kan låsa en specifik via `setPreferredVoice()`. `listVoices()`/`resolveVoice()` driver röstväljaren. Obs: expo-speech rapporterar iOS *premium*-röster som `quality: Default`, därför identifieras de på namnet.
- **`speech/speechInstance.ts`** – en delad `ExpoSpeech`-instans för hela appen (`getSpeech()`), så att rösten du väljer i Inställningar är den som talar i passet. `applyVoiceSettings()` anropas när inställningarna ändras.
- **`haptics/haptics.ts`** – `haptic('rep' | 'go' | 'done' | 'warn' | 'tap')`. No-op på web.
- **`audio/audioSession.ts`** (v4) – `AudioSessionPort` ovanpå `expo-audio`. `begin()` vid passstart: `setAudioModeAsync({ playsInSilentMode, shouldPlayInBackground, interruptionMode: 'duckOthers' })` + en **tyst 2-sekunders WAV i loop** (`assets/audio/silence.wav`, 32 kB) som håller iOS-audiosessionen vid liv med släckt skärm. `end()` ~4 s efter sista repliken så musiken kommer tillbaka. `NullAudioSession` för tester/web. Varför inte bara `UIBackgroundModes: audio`? Rättigheten tillåter bakgrundsljud men skapar ingen session – expo-speech river sin efter varje replik.
- **`crash/crashReporter.ts`** (v4) – `CrashReporter`-port. Standard: `ConsoleCrashReporter` (loggar bara). Sentry pluggas in med `setCrashReporter(new SentryCrashReporter())` – ingen native-dependency förrän man faktiskt vill ha den. Rapportering är **opt-in** (`settings.crashReports`, av som standard).

### `src/data` – repository-lagret

Se [Datalagring & backend-förberedelse](#datalagring--backend-förberedelse).

### `src/state` – Zustand-stores

| Store | Ansvar |
|---|---|
| `settingsStore` | `AppSettings`, hydrering från repo, persisterar vid varje ändring |
| `historyStore` | `SessionLog[]`, optimistisk uppdatering |
| `customWorkoutStore` | Användarens utkast + deras kompilerade `Workout`-versioner. `save`/`remove`/`newDraft`/`duplicate`. Exporterar `findWorkout(id)`/`useWorkout(id)` som slår upp **både** inbyggda och egna pass – används av detalj, summering och historik. |
| `sessionStore` | **Äger körtidsobjekten** (`SessionEngine`, `Coach`, `setInterval`, audiosession, `AppState`-lyssnare) utanför React-state. Exponerar `snapshot` + actions (`adjustTempo` lär in tempot per övning). När motorn blir `finished` byggs `SessionLog` och sparas via `historyStore`. **Checkpoint** (v4): skrivs vid varje steg-/fasbyte, annars max var 5:e s; rensas vid avslut, medvetet avbrott och efter 6 h. `loadPendingCheckpoint()` körs i rot-layouten → `pendingCheckpoint` → "Fortsätt passet?"-rutan i biblioteket → `start({ workout, resumeFrom })` → `engine.restore()`. |

### `src/ui` – designsystem

- **`primitives/`** – `Text` (typografivarianter), `Button` (snedställd/pill, 5 varianter, 4 storlekar), `ProgressBar` (tjock, snedställd, segment-markeringar, Reanimated), `Chip`, `Card` (med sned accentstripe; ett pressbart kort blir `<button>` på webben, därför läggs egna knappar i `footer`-propen som renderas *utanför* den pressbara ytan – HTML tillåter inte `<button>` i `<button>`), `SlantBox` (parallellogram), `Screen`, `SectionTitle`.
- **`components/`** – `WorkoutCard`, `IntensityMeter` (5 segment + stora ± knappar), `InteractionPicker`, `MuscleImpactBars`, `StatTile`, `ComparisonRow` (deltas mot förra passet), `ErrorBoundary` (klasskomponent runt hela stacken; felsida "Oj. … Ett pågående pass har sparats" + Starta om).
- **Kontrast** (v4): `contrastRatio()`/`relativeLuminance()` i `theme/tokens.ts` är riktiga WCAG-formler. `textDim` höjdes från `#6E6E78` (2,9:1) till `#92929E` (≥ 4,5:1 på alla ytor). `onAccent()` väljer mörk/vit text på uppmätt kontrast – orange och vilo-blått får därför mörk text. `theme.test.ts` låser golven så paletten inte kan regrediera.

### `src/features` – skärmar

| Skärm | Route | Roll |
|---|---|---|
| `LibraryScreen` + `ResumeBanner` + `OnboardingOverlay` | `/` | Bibliotek med **sök** + målfilter, streak/summering, sektionen **Mina pass**, "Skapa eget pass". Visar **"Avbrutet pass – Fortsätt?"** när en checkpoint finns och **intron** vid första start |
| `WorkoutDetailScreen` | `/workout/[id]` | Dagsform → startintensitet, **live-skalad översikt** (tryck på en övning → `ExerciseSheet`), **räknetempo** (Lugnt/Normalt/Snabbt), interaktionsnivå, **Starta**; "Kopiera & anpassa" på alla pass, "Redigera"/"Radera" på egna |
| `WorkoutBuilderScreen` + `ExercisePicker` + `DraftExerciseRow` | `/builder/[id]` | Byggaren: namn, färg, mål, nivå, övningslista med steppers (set / reps eller sekunder / vila), reps↔tid, ordning, info-ark, **varv** (1–5, cirkel), vila mellan övningar, validering. `id = new` (tomt), `new?from=<id>` (kopia) eller `<eget id>` (redigera) |
| `SessionScreen` + `PhaseDisplay` | `/session` | Det aktiva passet: jättesiffra, fas, progress, intensitet, **tempo ±**, kontroller; **dubbeltryck på displayen = paus**; roterbar |
| `SummaryScreen` | `/summary` | Kalorier (intervall), tid, reps, set, snittintensitet, **jämfört med förra gången**, muskelpåverkan |
| `HistoryScreen` | `/history` | Totaler, streak, muskelbalans, lista (`FlatList`) med ▲/▼ mot förra passet |
| `SessionDetailScreen` | `/history/[id]` | Ett loggat pass: alla mått, jämförelse, muskelpåverkan, **Kör igen**, **Radera passet** |
| `SettingsScreen` | `/settings` | Språk, interaktion, röst, profil, **felrapporter (opt-in)** |

### `app/` – routing

Expo Router (filbaserat). Varje fil är en enrads-wrapper som exporterar en skärm från `features/`. `_layout.tsx` laddar typsnitt, hydrerar stores och håller splash-skärmen tills allt är klart.

---

## Hur ett pass körs – dataflödet

```
 WorkoutDetailScreen                         sessionStore.start()
 ─────────────────── ──▶ { workout, intensity, interactionLevel } ──▶ ┌──────────────────────────────┐
                                                                     │ buildSessionPlan(workout)     │
                                                                     │ new SessionEngine({plan,...}) │
                                                                     │ new Coach({speech, locale})   │
                                                                     │ coach.attach(engine)          │
                                                                     │ setInterval(engine.tick, 100) │
                                                                     └──────────────┬───────────────┘
                                                                                    │
                     ┌──────────────────────────────────────────────────────────────┤
                     │ events                                                       │ snapshot
                     ▼                                                              ▼
              ┌────────────┐   speak({text, priority})   ┌────────────┐     ┌───────────────┐
              │   Coach    │ ───────────────────────────▶│ ExpoSpeech │     │ SessionScreen │
              │ (script sv)│                             │  (TTS)     │     │  re-renders   │
              └────────────┘                             └────────────┘     └───────────────┘
                     │ haptic('rep')
                     ▼
                 expo-haptics

 …  engine emits 'finished' ──▶ buildSessionLog(plan, snapshot, profile) ──▶ historyStore.add()
                                        (kalorier + muskelpåverkan)               │
                                                                                  ▼
                                                                     AsyncStorage / framtida API
```

Konkret exempel, hands-free, *Knäböj 2×5*:

| t (s) | Motor-event | Coachen säger | Skärmen visar |
|---|---|---|---|
| 0.0 | `exerciseAnnounced` | "Nästa: Knäböj. 5 repetitioner. Gör dig redo." + "Set 1 av 2." + cue | KNÄBÖJ · 5 |
| 2–4 | `countdownTick` 3,2,1 | "tre" "två" "ett" | 3 → 2 → 1 |
| 5.0 | `setStarted` | "Kör!" | 0 / 5 reps |
| 8, 11, 14, 17 | `rep` 1–4 | "ett" "två" "tre" "fyra" | 1…4 |
| 20 | `rep` 5 → `setCompleted` → `restStarted` | "Sista!" "Bra jobbat." "Vila 60 sekunder." | VILA 60 |
| 70 | `restTick` 10 … 3,2,1 | "10 kvar." … "Gör dig redo." "två" "ett" | 10 … 1 |
| 80 | `setStarted` (samma övning → ingen ny annonsering) | "Set 2 av 2." "Kör!" | 0 / 5 |

Om användaren trycker **+** vid t = 10: `intensityChanged 1.0→1.25`, målet blir 6 reps direkt, coachen säger "Intensitet: hård. Vi ökar. 6 repetitioner nu.", nästa vila blir 48 s istället för 60.

---

## Innehållsmodellen: övningar, block och program

```ts
// src/content/exercises.ts
{
  id: 'squat',
  name: lz('Knäböj', 'Squat'),
  cue: lz('Bröstet upp, knäna utåt.', 'Chest up, knees out.'),
  category: 'strength',
  equipment: ['none'],
  muscles: { quads: 1, glutes: 0.8, hamstrings: 0.4, core: 0.3 },
  met: 5.0,           // kcal-beräkning
  secondsPerRep: 3,   // räknetakt
}

// src/content/blocks.ts – återanvändbara byggstenar
export const HIIT_CIRCUIT: WorkoutBlock = {
  id: 'hiit-circuit', kind: 'main', rounds: 3,
  restSeconds: 15, transitionSeconds: 15,
  exercises: [
    { exerciseId: 'burpee', sets: 1, prescription: { kind: 'time', seconds: 30 } },
    …
  ],
};

// src/content/workouts.ts – program = ordnad lista av block
{
  id: 'hiit-inferno',
  blocks: [WARMUP_SHORT, HIIT_CIRCUIT, FINISHER_BURN, COOLDOWN_STRETCH],
  …
}
```

Regler:
- Ett block kan ingå i flera program.
- `rounds` upprepar hela blocket (cirkelträning).
- `restSeconds` på en `WorkoutExercise` överrider blockets standardvila.
- Sista steget i hela passet får alltid 0 s vila (planern sköter det).

Färdiga program: **Full Body Blast**, **Lower Power**, **Upper Armour**, **HIIT Inferno**, **Core Crusher**, **Kettlebell Engine**, **Mobility Reset**. 30 övningar i biblioteket.

---

## Intensitet & dagsform

```
Dagsform (readiness)   →   Startintensitet
  Trött                →   0.75 (lugn)
  Normal               →   1.0  (normal)
  Laddad               →   1.25 (hård)
```

Under passet: **±** på `IntensityMeter`. Regler i `core/intensity/intensity.ts`:

| | Formel | Exempel (1.25) | Exempel (1.5) |
|---|---|---|---|
| Reps | `round(reps × i)`, min 1 | 10 → 13 | 10 → 15 |
| Tid | `round(s × i)`, min 5 | 30 → 38 s | 30 → 45 s |
| Vila | `round(s / i)`, 5–600 s | 60 → 48 s | 60 → 40 s |

Samma funktioner (`resolvePrescription`, `resolveRestSeconds`) används av detaljskärmens **översikt**, så listan visar exakt det motorn kommer att köra: `3 × 13 (10)` med grundvärdet i parentes när det skiljer sig.

Motorn räknar aldrig ner ett mål under det antal reps som redan är gjorda, och förkortar aldrig en pågående vila till mindre än vad som redan gått.

---

## Kalorier & muskelpåverkan

Beräknas i `core/metrics/metrics.ts`, i bakgrunden direkt när `finished` emitteras.

**Kalorier** – standardformeln för MET:

```
kcal = MET × 3.5 × kroppsvikt(kg) / 200 × minuter
MET_effektiv = MET_övning × (0.7 + 0.3 × intensitet)
```
Vila räknas med MET 1.8. Kroppsvikt kommer från profilen (standard 75 kg).

**Muskelpåverkan** – för varje genomfört set:

```
volym  = reps (rep-baserat)  eller  sekunder / secondsPerRep (tid-baserat)
bidrag[muskel] += volym × last[muskel] × intensitet
```
Resultatet normaliseras så att den hårdast belastade gruppen = 1.0, vilket gör det trivialt att rita staplar. Historiken summerar över alla pass för en "muskelbalans".

**Snittintensitet** är tidsviktad: `Σ(sekunder × intensitet) / Σ sekunder`.

---

## Interaktionsnivåer

| Nivå | Vad appen gör | Vad användaren gör |
|---|---|---|
| **Hands-free** | Annonserar, räknar ner, räknar reps, vilar, går vidare – allt på egen klocka | Ingenting. Lyssnar. |
| **Assisterad** | Räknar reps och vila, men stannar i `awaitingStart` innan varje set | Trycker "Starta set" (t.ex. efter viktbyte) |
| **Manuell** | Annonserar övning och set; visar mål | Trycker "Rep +1" / "Set klart" själv |

Nivån väljs som standard i Inställningar och kan överridas per pass på detaljskärmen. Den skickas in i `SessionEngine` och styr `advance()`-logiken.

---

## Datalagring & backend-förberedelse

Nycklar under `pulsecoach:v1:`: `settings`, `sessions` (max **365** loggar, äldst kastas först – håller JSON-blobben och varje hydrering begränsad), `sessionCheckpoint` (pågående pass) och `customWorkouts`. Egna pass lagras som *utkast* (`CustomWorkoutDraft`) – inte som kompilerade `Workout` – så att redigeringsmodellen kan utvecklas utan att gamla data blir oläsbara. `CustomWorkoutRepository` (`listDrafts/getDraft/saveDraft/deleteDraft`) är det fjärde gränssnittet i `Repositories`.

Appen använder **inget API idag** – all data ligger lokalt i AsyncStorage under namnrymden `pulsecoach:v1:`. Men UI och stores pratar aldrig direkt med lagringen; de går via gränssnitt i `src/data/repositories/types.ts`:

```ts
interface WorkoutRepository  { listWorkouts(); getWorkout(id); getExercise(id); exerciseLookup(); }
interface SessionRepository  { listSessions(); saveSession(log); deleteSession(id); clear();
                               loadCheckpoint(); saveCheckpoint(cp); clearCheckpoint(); }
interface SettingsRepository { load(); save(settings); }
```

**Byta till en backend** = skriv tre klasser som implementerar gränssnitten och injicera dem:

```ts
// t.ex. i app/_layout.tsx innan första render
import { setRepositories } from '@/data';
setRepositories({
  workouts: new RemoteWorkoutRepository(apiClient),
  sessions: new RemoteSessionRepository(apiClient),
  settings: new LocalSettingsRepository(new AsyncStorageStore()), // kan blandas
});
```

`KeyValueStore` är i sin tur abstraherat (`AsyncStorageStore` i appen, `MemoryStore` i tester), så även lokala repositories är testbara utan native-moduler.

Rekommenderad väg när backend kommer: behåll de lokala repositories som cache/offline-lager och lägg en synk-tjänst ovanpå (`SessionLog` har redan stabila id:n och ISO-tidsstämplar för konfliktfri merge).

---

## Designsystem

**Färgpalett för kort:** sju accenter – röd, orange, gul, lime, cyan, violett, magenta – var och en med `main`/`deep`/`soft` och en `on`-färg (mörk text på gul/lime/cyan, vit på övriga). `onAccent(hex)` i `theme/tokens.ts` väljer läsbar textfärg för valfri färg; `Chip` och `Button color=` använder den automatiskt. Varje färdigt program har sin egen färg; egna pass får den minst använda färgen (`nextAccent`) men kan bytas i byggaren.

Tema: **Hög energi.** Mörkgrå bas, explosiva accenter, snedställda former, kursiv sportig typografi, tjocka progressbars.

| Token | Värde |
|---|---|
| Bakgrund | `#121214` / ytor `#232328` |
| Signalröd | `#FF2A2A` |
| Orange | `#FF7A00` |
| Vila (blå) | `#2A9DFF` |
| Slant | `skewX(-12deg)` – används på knappar, badges, staplar, accentstripes |
| Display-typsnitt | Barlow Condensed 900 Black *Italic* |
| Brödtext | Barlow 400/500/700 |
| Progressbars | 10–18 px höga, snedställda, segmentmarkeringar per set |

Allt bor i `src/theme/tokens.ts`. Primitiverna i `src/ui/primitives` tar tokens – skärmar hårdkodar inga färger.

Session-skärmen är designad för att fungera **utan att man tittar**: en siffra på 168 px, ett ord, en tjock stapel, och ± knappar på fasta positioner längst ner.

---

## Språk (i18n)

Två parallella system, med avsikt:

1. **UI-texter** – `src/i18n/sv.ts` (källa) och `en.ts` (typad mot samma form). Hämtas via `useI18n()` → `t.session.rest`. Interpolation med `f(t.session.setOf, { set: 1, total: 3 })`.
2. **Coach-repliker** – `src/core/coach/script.ts`. Separata eftersom talat språk ska vara kortare, rytmiskt och otvetydigt i gymbrus ("Sista!" snarare än "Sista repetitionen").
3. **Innehåll** – `LocalizedString` (`{ sv, en }`) direkt på övningar och program, så coachen kan säga övningsnamnet på rätt språk.

Lägg till ett språk: utöka `Locale`, lägg till en fil i `i18n/`, ett skript i `script.ts`, en TTS-tagg i `SPEECH_LANGUAGE_TAG`, och komplettera `LocalizedString`-objekten.

---

## Testning

```bash
npm test
```

| Svit | Vad den täcker |
|---|---|
| `core/__tests__/planner.test.ts` | Utplattning, varv, vila-regler, felhantering |
| `core/__tests__/intensity.test.ts` | Skala, klämning, readiness-mappning |
| `core/__tests__/SessionEngine.test.ts` | Hela tillståndsmaskinen med fejkad klocka: räkning, ikapp-räkning, **begränsad ikapp-räkning efter bakgrundsluckor**, paus, intensitet mitt i set, **tempo mitt i set (bevarat rep-fönster, klämning)**, **checkpoint/restore**, alla tre interaktionsnivåer |
| `core/__tests__/Coach.test.ts` | Exakt vad som sägs, i vilken ordning, med vilken prioritet, på båda språken – inkl. teknik-cues, tempo-ord, pepp med namn, set-kvar, sista set/övning, intensitetsförklaringar, **nästa-övning-före-vila** (på/av, intensitetsskalat mål) och **vilo-tips** (`off`/`one`/`full`, inga tips mellan set av samma övning) |
| `core/__tests__/voice.test.ts` | Röstrankningen (premium > enhanced > standard > legacy) och energi-förvalens rate/pitch |
| `core/__tests__/metrics.test.ts` | MET-formel, normalisering, snittintensitet, streak-logik, **jämförelse med förra passet**, **kaloriintervall** |
| `core/__tests__/customWorkout.test.ts` | Utkast: validering, defaults per kategori, färgrotation, kompilering till körbar `Workout`, **varv/cirklar** (kompilering, klämning, kopiering behåller varv), repository-CRUD, **historik-tak (365) + checkpoint-rundtur** |
| `core/__tests__/theme.test.ts` | Paletten är komplett, `onAccent` väljer rätt textfärg, **WCAG-golv**: text ≥ 7:1, muted/dim ≥ 4,5:1 på alla ytor, text-på-accent ≥ 3:1 |
| `ui/__tests__/ErrorBoundary.test.tsx` | Fångar renderfel, visar svensk felsida, lämnar felet till `CrashReporter`, återhämtar sig på "Starta om" |
| `ui/__tests__/dom-nesting.web.test.tsx` | Renderar `Card`/`WorkoutCard` via **react-native-web** till HTML och verifierar att ingen `<button>` hamnar i en `<button>` (körs med `npm run test:web`) |
| `__tests__/flow.e2e.test.tsx` | **Hela appen** via expo-routers testbibliotek: bibliotek → detalj → session → summering → historik; live-skalad översikt; instruktionsark; assisterat läge på engelska; bygg eget pass → kör → radera; kopiera färdigt pass → redigera; **redigera/radera direkt från bibliotekskorten** (med ångra); **röstinställningarna** (annonsera nästa, tips-nivå, energi, röstväljare med premium-rankning och provlyssning); v4: **tempo före/under set + minne per övning**, **krasch → omstart → "Fortsätt passet?"**, **blind paus via dubbeltryck**, **jämförelse + detaljvy + radera enskilt pass**, **intro vid första start**, **sök i biblioteket**, **varv i byggaren**, **opt-in felrapporter**. Endast TTS/haptik/ljud/orientering/lagring/typsnitt mockas. |

119 tester, ~9 s, plus 5 webb-DOM-tester (`npm run test:web`, separat Jest-projekt med `jest-expo/web` eftersom de renderar riktig HTML). Kärnan testas helt utan React eller native-moduler tack vare den injicerbara klockan (`now`) och `SilentSpeech`.

---

## Verifiering på riktig enhet – protokoll

Det som gör appen värd något – att rösten fortsätter räkna med skärmen släckt – går **inte** att testa i Jest, i webbläsaren eller i simulatorn. Protokollet nedan är det minsta som ska köras på fysisk hårdvara före varje release. Bocka av i PR-beskrivningen.

**Förutsättningar**

- **Dev-build**, inte Expo Go: `npx expo run:ios` / `npx expo run:android` (eller EAS `development`-profil). Expo Go saknar `UIBackgroundModes: audio`-rättigheten och `expo-audio`-konfigurationen, så bakgrundsljud *kan* fungera ojämnt där utan att det säger något om produktionsbygget.
- En fysisk iPhone (iOS 17+) och en Android-telefon (Android 12+, gärna en tillverkare med aggressiv batterihantering – Samsung/Xiaomi).
- Ett pass med minst tre övningar och rep-baserade set, t.ex. *Full Body Blast*, hands-free.

**Testmatris**

| # | Scenario | Gör så här | Förväntat |
|---|---|---|---|
| A1 | Låst skärm, iOS | Starta passet, lås telefonen efter första övningen, lägg den i fickan i 5 min | Räkning, vila, "Nästa: …" och nedräkning hörs hela tiden. Ingen tystnad efter 30 s (typiskt symptom på att audiosessionen dött). |
| A2 | Låst skärm, Android | Som A1. Upprepa med batterisparläge **på**. | Som A1. Med batterisparläge kan enskilda repliker komma något sent; räkningen får inte hoppa >1 rep. |
| B1 | Musik i bakgrunden | Starta Spotify/Apple Music, starta sedan passet | Musiken **duckas** (sänks) när coachen pratar och kommer tillbaka mellan replikerna. Musiken stoppas *inte*. När passet avslutas återgår volymen helt inom ~5 s. |
| B2 | Ljudlös-knapp / DND | iPhone med ljudlös-läge på; Android med "Stör ej" | Coachen hörs ändå (`playsInSilentMode`). Haptik fortsätter. |
| C1 | Inkommande samtal | Ring telefonen mitt i ett set, svara, lägg på efter 30 s | Under samtalet är coachen tyst. Efteråt hörs "Vi fortsätter. Set 2 av 3, rep N av M." och räkningen fortsätter – inte 15 siffror i en klump. |
| C2 | Missat samtal / notis | Låt det ringa utan att svara | Kort avbrott, sedan fortsätter räkningen med rätt position. |
| D1 | Hörlurar | Bluetooth-hörlurar in före start; dra ut/koppla ifrån mitt i passet | Ljudet går till hörlurarna. När de kopplas ifrån går ljudet **inte** ut i högtalaren av misstag (iOS pausar sessionen – appen ska läsa upp positionen när du trycker Fortsätt). |
| E1 | App-död | Tvångsstäng appen (svep bort) under övning 3, öppna igen | Biblioteket visar "Avbrutet pass – du var på steg 3 av N". *Fortsätt passet* startar på steg 3 med "Välkommen tillbaka…". *Kasta* tar bort rutan och checkpointen. |
| E2 | Omstart av telefonen | Som E1 men starta om telefonen | Samma som E1 (checkpointen ligger i AsyncStorage). |
| F1 | Lång bakgrund | Lägg appen i bakgrunden (inte låst skärm – byt app) i 10 min | Vid återgång: ingen skur av repliker; coachen säger var ni är. Passtiden i summeringen exkluderar inte bakgrundstiden (den räknas som träning om ljudet fortsatte, som paus om OS:et frös JS). |
| G1 | Tempo | Under ett rep-set tryck *Långsammare* två gånger | "Lugnare tempo." sägs direkt; nästa rep kommer märkbart senare; värdet visas som t.ex. `Tempo 1.2×`. Starta samma pass igen: övningen startar på 1.2×. |
| H1 | Batteri | 30 min pass med skärm på (`Håll skärmen tänd`) | < 10 % batteri på moderna telefoner. Om mer: kontrollera att `TICK_MS` inte sänkts och att inga animationer körs i bakgrunden. |

**Så här felsöker du om A1/A2 fallerar**

1. `npx expo config --type introspect | grep -A3 UIBackgroundModes` → ska innehålla `audio`.
2. Kontrollera att `getAudioSession().begin()` körs (lägg en `console.log` i `ExpoAudioSession.begin`) och att `setAudioModeAsync` inte kastar.
3. iOS: i Xcode → *Signing & Capabilities* måste *Background Modes → Audio* vara ikryssat i det genererade projektet (prebuild gör det via `app.json`).
4. Android 13+: `expo-audio` behöver notis-behörighet för långvarig bakgrundsuppspelning om passet är längre än ~3 min; följ `expo-audio`-dokumentationen för `setActiveForLockScreen` om det behövs (medvetet inte påslaget – kräver ett notisdesign-beslut).

---

## Bygga vidare – kokbok

**Lägg till en övning**
`src/content/exercises.ts` → nytt objekt med `id`, namn på båda språken, `muscles`, `met`, `secondsPerRep`. Klart – kan användas i block direkt.

**Lägg till ett program**
`src/content/blocks.ts` (om nya block behövs) → `src/content/workouts.ts` → nytt `Workout` med `blocks: [...]`. Dyker upp i biblioteket automatiskt.

**Ändra vad coachen säger**
`src/core/coach/script.ts`. Vill du ändra *när* något sägs: `Coach.ts` (en `events.on(...)` per händelse).

**Ny röstkälla (inspelade klipp, moln-TTS)**
Implementera `SpeechPort` i `src/adapters/speech/`, byt i `sessionStore.getSpeech()`.

**Ny händelse från motorn**
Lägg till i `SessionEvents` (`core/engine/types.ts`), emit i `SessionEngine`, lyssna i `Coach` och/eller skärmen.

**Byt lagring / koppla API**
Se [Datalagring & backend-förberedelse](#datalagring--backend-förberedelse).

**Ny skärm**
Skapa i `src/features/<namn>/`, exportera från en enrads-fil i `app/`, lägg till i `Stack`/`Tabs` i respektive `_layout.tsx`.

**Justera designen**
`src/theme/tokens.ts`. `SLANT_DEG` styr all snedställning globalt.

---

## Kända begränsningar & nästa steg

- **Bakgrundsljud** – appen håller nu en audiosession (`expo-audio`, tyst loop + `shouldPlayInBackground`) så länge passet pågår. Det måste ändå verifieras på riktig hårdvara enligt [protokollet ovan](#verifiering-på-riktig-enhet--protokoll); Expo Go är inte representativt. Android kan stoppa bakgrundsljud efter ~3 min utan låsskärmskontroller (`setActiveForLockScreen`) – inte påslaget ännu.
- **Röstkvalitet** beror på enhetens TTS. Appen väljer nu den bästa installerade rösten och Inställningar visar en hänvisning om bara standardröster finns (iOS: *Hjälpmedel → Talat innehåll → Röster*, ladda ner t.ex. *Klara (Premium)*; Android: *Text-till-tal → Google-motor → Installera röstdata*). Vill man längre än så finns tre vägar, alla bakom det befintliga `SpeechPort`-gränssnittet utan att röra `Coach`:
  1. **Moln-TTS** (ElevenLabs, Azure Neural, Google WaveNet) – klart mest levande, kräver API-nyckel, nätverk under passet och förcachning av de ~200 fasta replikerna (siffror, cues) för att räkningen inte ska släpa. En `CloudSpeech implements SpeechPort` med lokal cache (`expo-file-system` + `expo-av`) är den naturliga formen.
  2. **Förinspelad röstpack** – en riktig coach spelar in skriptet i `script.ts`; dynamiska delar (övningsnamn, siffror) sätts ihop av klipp. Bäst kvalitet offline, men allt nytt innehåll kräver ny inspelning.
  3. **Hybrid** – klipp/moln för fasta repliker, enhets-TTS som reserv för dynamisk text.
- **Kalorier** är uppskattningar (MET-modell); ingen pulsdata.
- **Egna pass är enkla:** en platt lista (inga block/varv) – medvetet, för att byggaren ska vara snabb att använda. Modellen kompileras till samma `Workout`-form som de färdiga programmen, så block/varv kan läggas till i utkastet senare utan att röra motorn.
- **Egna övningar** kan inte skapas ännu – byggaren väljer ur biblioteket (30 övningar).
- **Blind paus via volymknapp** kräver en native-modul utanför Expo SDK (t.ex. `react-native-volume-manager`) – dubbeltryck är implementerat; skak-paus valdes bort eftersom burpees och jumping jacks skulle utlösa den.
- **Android bakgrundsljud > 3 min** kan kräva `setActiveForLockScreen` (låsskärmskontroller + notis); se protokollet ovan.
- **Kandidater för nästa iteration:** egna övningar, ljudsignaler utöver tal, Apple Health/Google Fit-export, molnsynk via repository-lagret (utkasten är redan JSON), widgets/Live Activities för vilotimern.

---

## Projektstruktur (kort)

```
app/                      expo-router routes
  _layout.tsx             fonts, hydrering, Stack
  (tabs)/                 index (bibliotek), history, settings
  workout/[id].tsx        detalj
  builder/[id].tsx        byggare för egna pass (new | new?from=<id> | <eget id>)
  session.tsx  summary.tsx
src/
  core/                   ren TS: domain, engine, coach, intensity, metrics, utils
  content/                exercises, blocks, workouts
  data/                   repositories (types, local), storage (KeyValueStore, AsyncStorage)
  adapters/               speech/ExpoSpeech + speechInstance, haptics
  state/                  settingsStore, historyStore, customWorkoutStore, sessionStore
  hooks/                  useI18n, useAppFonts
  i18n/                   sv, en, format-hjälpare
  theme/                  tokens
  ui/                     primitives, components (WorkoutCard, ExerciseSheet, IntensityMeter, …)
  features/               library, workout-detail, workout-builder, session, summary, history, settings (+ VoicePicker)
  __tests__/              flow.e2e.test.tsx
jest.config.js  jest.setup.ts  babel.config.js  metro.config.js  tsconfig.json  app.json
```
