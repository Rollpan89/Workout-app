import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getSpeech, type VoiceOption } from '@/adapters';
import {
  effectiveVoiceParams,
  SPEECH_LANGUAGE_TAG,
  type Locale,
  type VoiceSettings,
} from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { colors, radius, spacing } from '@/theme';
import { Text } from '@/ui/primitives';

export interface VoicePickerProps {
  locale: Locale;
  voice: VoiceSettings;
  onPick: (voiceId: string | undefined) => void;
}

/**
 * Lists the device's voices for the current language, best-ranked first,
 * with a ▶ preview per row. "Auto" lets the adapter pick the top-ranked one.
 * Shows an install hint when only default-quality voices exist.
 */
export function VoicePicker({ locale, voice, onPick }: VoicePickerProps) {
  const { t } = useI18n();
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
  const rows: { id: string | undefined; label: string; sub: string }[] = [
    {
      id: undefined,
      label: t.settings.voiceAuto,
      sub: voices.find((v) => v.id === autoId)?.name ?? '',
    },
    ...voices.map((v) => ({
      id: v.id,
      label: v.name,
      sub:
        v.score >= 60
          ? t.settings.voiceQualityHigh
          : v.quality === 'enhanced'
            ? t.settings.voiceQualityEnhanced
            : t.settings.voiceQualityDefault,
    })),
  ];

  return (
    <View style={styles.root} testID="voice-picker">
      {voices.length === 0 ? (
        <Text variant="bodySmall" color={colors.textMuted}>
          {t.settings.voiceNone}
        </Text>
      ) : null}
      {rows.map((row) => {
        const selected = (voice.voiceId ?? undefined) === row.id;
        return (
          <View key={row.id ?? 'auto'} style={styles.row}>
            <Pressable
              onPress={() => onPick(row.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.select,
                selected && styles.selectSelected,
                pressed && styles.pressed,
              ]}
              testID={`voice-${row.id ?? 'auto'}`}
            >
              <View style={styles.selectText}>
                <Text
                  variant="bodyBold"
                  color={selected ? colors.text : colors.textMuted}
                  numberOfLines={1}
                >
                  {row.label}
                </Text>
                {row.sub ? (
                  <Text
                    variant="labelSmall"
                    color={selected ? colors.red : colors.textDim}
                    upper
                    numberOfLines={1}
                  >
                    {row.sub}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <Pressable
              onPress={() => preview(row.id)}
              accessibilityRole="button"
              accessibilityLabel={`${t.settings.testVoice}: ${row.label}`}
              style={({ pressed }) => [styles.play, pressed && styles.pressed]}
              disabled={!voice.enabled}
            >
              <Text variant="h3" color={voice.enabled ? colors.text : colors.textDim}>
                ▶
              </Text>
            </Pressable>
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
  pressed: { opacity: 0.6 },
  hint: { marginTop: spacing.xs },
});
