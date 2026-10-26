import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getSpeech, type VoiceGender, type VoiceOption, type VoiceTier } from '@/adapters';
import {
  effectiveVoiceParams,
  SPEECH_LANGUAGE_TAG,
  type Locale,
  type VoiceSettings,
} from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { colors, fonts, radius, spacing } from '@/theme';
import { Text } from '@/ui/primitives';

export interface VoicePickerProps {
  locale: Locale;
  voice: VoiceSettings;
  onPick: (voiceId: string | undefined) => void;
}

/**
 * Lists voices by gender, then by native/premium tier, with a ▶ preview per row.
 * "Auto" uses the adapter's top-ranked voice. Shows an install hint when only
 * default-quality voices exist.
 */
export function VoicePicker({ locale, voice, onPick }: VoicePickerProps) {
  const { t, f } = useI18n();
  const language = SPEECH_LANGUAGE_TAG[locale];
  const [voices, setVoices] = useState<readonly VoiceOption[] | undefined>();
  const [autoId, setAutoId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const speech = getSpeech();
    speech.setPreferredVoice(language, undefined);
    void Promise.all([speech.listVoices(language), speech.resolveVoice(language)]).then(
      ([list, auto]) => {
        if (cancelled) return;
        setVoices(list);
        setAutoId(auto?.id);
        speech.setPreferredVoice(language, voice.voiceId);
      },
    );
    return () => {
      cancelled = true;
    };
    // voice.voiceId intentionally excluded: we only re-scan when the language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const preview = (voiceId: string | undefined) => {
    const speech = getSpeech();
    speech.setPreferredVoice(language, voiceId);
    const { rate, pitch } = effectiveVoiceParams(voice);
    speech.speak({ text: t.settings.testVoiceLine, language, rate, pitch, priority: 'interrupt' });
    // restore the persisted choice so a preview never leaks into the session
    speech.setPreferredVoice(language, voice.voiceId);
  };

  if (voices === undefined) {
    return (
      <Text variant="bodySmall" color={colors.textDim}>
        …
      </Text>
    );
  }

  const hasGoodVoice = voices.some((v) => v.score >= 60);
  const autoVoice = voices.find((v) => v.id === autoId);
  const displayName = (item: VoiceOption) => {
    if (item.nameKind !== 'numbered') return item.name;
    const number = Number(item.name.split(' ').at(-1)) || 1;
    return f(t.settings.voiceNumber, { number });
  };
  const qualityLabel = (item: VoiceOption) =>
    item.tier === 'premium'
      ? t.settings.voiceQualityHigh
      : item.quality === 'enhanced'
        ? t.settings.voiceQualityEnhanced
        : t.settings.voiceQualityDefault;
  const tierLabel = (tier: VoiceTier) =>
    tier === 'premium' ? t.settings.voiceGroupPremium : t.settings.voiceGroupNative;
  const renderRow = (id: string | undefined, label: string, sub: string) => {
    const selected = (voice.voiceId ?? undefined) === id;
    return (
      <View key={id ?? 'auto'} style={styles.row}>
        <Pressable
          onPress={() => onPick(id)}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          style={({ pressed }) => [styles.select, selected && styles.selectSelected, pressed && styles.pressed]}
          testID={`voice-${id ?? 'auto'}`}
        >
          <View style={styles.selectText}>
            <Text variant="bodyBold" color={selected ? colors.text : colors.textMuted} numberOfLines={1}>
              {label}
            </Text>
            {sub ? (
              <Text
                variant="labelSmall"
                color={selected ? colors.red : colors.textDim}
                upper
                numberOfLines={1}
              >
                {sub}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          onPress={() => preview(id)}
          accessibilityRole="button"
          accessibilityLabel={`${t.settings.testVoice}: ${label}`}
          style={({ pressed }) => [styles.play, pressed && styles.pressed]}
          disabled={!voice.enabled}
        >
          <Text variant="h3" color={voice.enabled ? colors.text : colors.textDim} style={styles.playGlyph}>
            ▶
          </Text>
        </Pressable>
      </View>
    );
  };
  const groups: { gender: VoiceGender; label: string }[] = [
    { gender: 'female', label: t.settings.voiceGroupFemale },
    { gender: 'male', label: t.settings.voiceGroupMale },
    { gender: 'unknown', label: t.settings.voiceGroupOther },
  ];
  const tiers: VoiceTier[] = ['premium', 'native'];

  return (
    <View style={styles.root} testID="voice-picker">
      {voices.length === 0 ? (
        <Text variant="bodySmall" color={colors.textMuted}>
          {t.settings.voiceNone}
        </Text>
      ) : null}
      {renderRow(
        undefined,
        t.settings.voiceAuto,
        autoVoice ? `${displayName(autoVoice)} · ${qualityLabel(autoVoice)}` : '',
      )}
      {groups.map((group) => {
        const genderVoices = voices.filter((item) => item.gender === group.gender);
        if (!genderVoices.length) return null;
        return (
          <View key={group.gender} style={styles.group} testID={`voice-group-${group.gender}`}>
            <Text variant="labelSmall" color={colors.textDim} upper style={styles.groupTitle}>
              {group.label}
            </Text>
            {tiers.map((tier) => {
              const tierVoices = genderVoices.filter((item) => item.tier === tier);
              if (!tierVoices.length) return null;
              return (
                <View
                  key={tier}
                  style={styles.tier}
                  testID={`voice-tier-${tier}-${group.gender}`}
                >
                  <Text variant="labelSmall" color={colors.textDim} upper style={styles.tierTitle}>
                    {tierLabel(tier)}
                  </Text>
                  {tierVoices.map((item) =>
                    renderRow(item.id, displayName(item), qualityLabel(item)),
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
      {!hasGoodVoice && voices.length > 0 ? (
        <Text variant="bodySmall" color={colors.textDim} style={styles.hint}>
          {t.settings.voiceInstallHint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs, paddingVertical: spacing.sm },
  group: { gap: spacing.xs, marginTop: spacing.sm },
  groupTitle: { marginBottom: spacing.xxs },
  tier: { gap: spacing.xs, marginTop: spacing.xxs },
  tierTitle: { paddingLeft: spacing.sm, marginBottom: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  select: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectSelected: { borderColor: colors.red, backgroundColor: colors.surfaceHigh },
  selectText: { flex: 1, gap: 2 },
  play: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: { fontFamily: fonts.headingUpright, fontStyle: 'normal' },
  pressed: { opacity: 0.6 },
  hint: { marginTop: spacing.xs },
});
