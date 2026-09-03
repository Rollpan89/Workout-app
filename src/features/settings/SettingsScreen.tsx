import Constants from 'expo-constants';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { getSpeech } from '@/adapters';
import {
  effectiveVoiceParams,
  REST_TIPS_LEVELS,
  SPEECH_LANGUAGE_TAG,
  VOICE_ENERGIES,
  type Locale,
  type RestTipsLevel,
  type VoiceEnergy,
  type WorkoutGoal,
} from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, fonts, radius, spacing } from '@/theme';
import { InteractionPicker } from '@/ui/components';
import { Button, Card, Chip, Screen, SectionTitle, Text } from '@/ui/primitives';

import { VoicePicker } from './VoicePicker';

const GOALS: readonly WorkoutGoal[] = ['strength', 'hypertrophy', 'endurance', 'fatLoss', 'mobility'];
const RATES = [0.8, 0.9, 1.0, 1.1, 1.25] as const;

export function SettingsScreen() {
  const { t } = useI18n();
  const settings = useSettingsStore((s) => s.settings);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const setInteractionLevel = useSettingsStore((s) => s.setInteractionLevel);
  const updateVoice = useSettingsStore((s) => s.updateVoice);
  const updateProfile = useSettingsStore((s) => s.updateProfile);
  const setKeepScreenAwake = useSettingsStore((s) => s.setKeepScreenAwake);

  const testVoice = () => {
    const { rate, pitch } = effectiveVoiceParams(settings.voice);
    getSpeech().speak({
      text: t.settings.testVoiceLine,
      language: SPEECH_LANGUAGE_TAG[settings.locale],
      rate,
      pitch,
      priority: 'interrupt',
    });
  };

  const energyLabel: Record<VoiceEnergy, string> = {
    calm: t.settings.energyCalm,
    energetic: t.settings.energyEnergetic,
    hype: t.settings.energyHype,
  };
  const restTipsLabel: Record<RestTipsLevel, string> = {
    off: t.settings.restTipsOff,
    one: t.settings.restTipsOne,
    full: t.settings.restTipsFull,
  };

  return (
    <Screen>
      <Text variant="hero" upper style={styles.heading}>
        {t.settings.heading}
      </Text>

      <SectionTitle title={t.settings.language} />
      <View style={styles.chips}>
        {(['sv', 'en'] as Locale[]).map((l) => (
          <Chip
            key={l}
            label={l === 'sv' ? t.settings.swedish : t.settings.english}
            selected={settings.locale === l}
            onPress={() => setLocale(l)}
          />
        ))}
      </View>

      <SectionTitle title={t.settings.interaction} />
      <InteractionPicker value={settings.interactionLevel} onChange={setInteractionLevel} />

      <SectionTitle title={t.settings.voice} />
      <Card padding={0}>
        <Row label={t.settings.voiceEnabled}>
          <Switch
            value={settings.voice.enabled}
            onValueChange={(enabled) => updateVoice({ enabled })}
            trackColor={{ true: colors.red, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </Row>
        <Row label={t.settings.energy} hint={t.settings.energyDesc} stacked>
          <View style={styles.chipRow}>
            {VOICE_ENERGIES.map((e) => (
              <Chip key={e} label={energyLabel[e]} selected={settings.voice.energy === e} onPress={() => updateVoice({ energy: e })} />
            ))}
          </View>
        </Row>
        <Row label={t.settings.voicePick} hint={t.settings.voicePickDesc} stacked>
          <VoicePicker locale={settings.locale} voice={settings.voice} onPick={(voiceId) => updateVoice({ voiceId })} />
        </Row>
        <Row label={t.settings.voiceRate}>
          <View style={styles.rates}>
            {RATES.map((r) => (
              <Pressable
                key={r}
                accessibilityRole="button"
                accessibilityState={{ selected: settings.voice.rate === r }}
                onPress={() => updateVoice({ rate: r })}
                style={[styles.rate, settings.voice.rate === r && styles.rateSelected]}
              >
                <Text variant="labelSmall" color={settings.voice.rate === r ? colors.textOnAccent : colors.textMuted}>
                  {r.toFixed(r === 1.25 ? 2 : 1)}×
                </Text>
              </Pressable>
            ))}
          </View>
        </Row>
        <Row label={t.settings.countEveryRep} hint={t.settings.countEveryRepDesc}>
          <Switch
            value={settings.voice.countEveryRep}
            onValueChange={(countEveryRep) => updateVoice({ countEveryRep })}
            trackColor={{ true: colors.red, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </Row>
        <Row label={t.settings.motivation} hint={t.settings.motivationDesc}>
          <Switch
            value={settings.voice.motivation}
            onValueChange={(motivation) => updateVoice({ motivation })}
            trackColor={{ true: colors.red, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </Row>
        <Row label={t.settings.techniqueCues} hint={t.settings.techniqueCuesDesc}>
          <Switch
            value={settings.voice.techniqueCues}
            onValueChange={(techniqueCues) => updateVoice({ techniqueCues })}
            trackColor={{ true: colors.red, false: colors.surfaceHigh }}
            thumbColor={colors.text}
            testID="toggle-technique-cues"
          />
        </Row>
        <Row label={t.settings.tempoCues} hint={t.settings.tempoCuesDesc}>
          <Switch
            value={settings.voice.tempoCues}
            onValueChange={(tempoCues) => updateVoice({ tempoCues })}
            trackColor={{ true: colors.red, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </Row>
        <Row label={t.settings.announceNext} hint={t.settings.announceNextDesc}>
          <Switch
            value={settings.voice.announceNext}
            onValueChange={(announceNext) => updateVoice({ announceNext })}
            trackColor={{ true: colors.red, false: colors.surfaceHigh }}
            thumbColor={colors.text}
            testID="toggle-announce-next"
          />
        </Row>
        <Row label={t.settings.restTips} hint={t.settings.restTipsDesc} stacked>
          <View style={styles.chipRow}>
            {REST_TIPS_LEVELS.map((level) => (
              <Chip
                key={level}
                label={restTipsLabel[level]}
                selected={settings.voice.restTips === level}
                onPress={() => updateVoice({ restTips: level })}
              />
            ))}
          </View>
        </Row>
        <Row label={t.settings.haptics}>
          <Switch
            value={settings.voice.haptics}
            onValueChange={(haptics) => updateVoice({ haptics })}
            trackColor={{ true: colors.red, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </Row>
        <Row label={t.settings.keepAwake} last>
          <Switch
            value={settings.keepScreenAwake}
            onValueChange={setKeepScreenAwake}
            trackColor={{ true: colors.red, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </Row>
      </Card>
      <View style={styles.testVoice}>
        <Button label={t.settings.testVoice} variant="secondary" onPress={testVoice} disabled={!settings.voice.enabled} />
      </View>

      <SectionTitle title={t.settings.profile} />
      <Card padding={0}>
        <Row label={t.settings.displayName}>
          <TextInput
            value={settings.profile.displayName}
            onChangeText={(displayName) => updateProfile({ displayName })}
            placeholder={t.settings.displayNamePlaceholder}
            placeholderTextColor={colors.textDim}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </Row>
        <Row label={t.settings.bodyweight} hint={t.settings.bodyweightDesc} last>
          <TextInput
            value={String(settings.profile.bodyweightKg)}
            onChangeText={(text) => {
              const n = Number(text.replace(',', '.'));
              if (Number.isFinite(n) && n > 0 && n < 400) updateProfile({ bodyweightKg: n });
            }}
            keyboardType="decimal-pad"
            style={[styles.input, styles.inputSmall]}
            returnKeyType="done"
          />
        </Row>
      </Card>

      <SectionTitle title={t.settings.goal} />
      <View style={styles.chips}>
        {GOALS.map((g) => (
          <Chip key={g} label={t.goal[g]} selected={settings.profile.goal === g} onPress={() => updateProfile({ goal: g })} />
        ))}
      </View>

      <SectionTitle title={t.settings.about} />
      <Text variant="bodySmall" color={colors.textDim}>
        {t.common.appName} · {t.settings.version} {Constants.expoConfig?.version ?? '0.1.0'}
      </Text>
      <Text variant="bodySmall" color={colors.textDim}>
        {t.settings.dataNote}
      </Text>
    </Screen>
  );
}

function Row({
  label,
  hint,
  children,
  last,
  stacked,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  last?: boolean;
  /** Control rendered under the label (for wide controls such as chip rows). */
  stacked?: boolean;
}) {
  return (
    <View style={[styles.row, stacked && styles.rowStacked, !last && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text variant="bodyBold">{label}</Text>
        {hint ? (
          <Text variant="bodySmall" color={colors.textDim}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 56, lineHeight: 56 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginLeft: -3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, marginLeft: -3 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { flex: 1, gap: 2 },
  rates: { flexDirection: 'row', gap: 4 },
  rate: {
    paddingHorizontal: spacing.sm,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
  },
  rateSelected: { backgroundColor: colors.red },
  testVoice: { marginTop: spacing.md, alignItems: 'flex-start' },
  input: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 160,
    textAlign: 'right',
  },
  inputSmall: { minWidth: 90 },
});
