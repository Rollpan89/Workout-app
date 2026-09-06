import { useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { InteractionLevel } from '@/core/domain';
import { useI18n } from '@/hooks/useI18n';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, spacing } from '@/theme';
import { InteractionPicker } from '@/ui/components';
import { Button, ProgressBar, Text } from '@/ui/primitives';

const STEPS = 3;

/**
 * First-run intro, three screens:
 *  1. What the app is (voice coach, hands-free) + optional name
 *  2. Pick the interaction level (the single most important setting)
 *  3. The three things to know during a workout (double-tap, ±, tempo)
 * Shown once; `settings.onboardingDone` is persisted when finished or skipped.
 */
export function OnboardingOverlay() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const done = useSettingsStore((s) => s.settings.onboardingDone);
  const interaction = useSettingsStore((s) => s.settings.interactionLevel);
  const displayName = useSettingsStore((s) => s.settings.profile.displayName);
  const setInteractionLevel = useSettingsStore((s) => s.setInteractionLevel);
  const updateProfile = useSettingsStore((s) => s.updateProfile);
  const finish = useSettingsStore((s) => s.setOnboardingDone);
  const [step, setStep] = useState(0);

  if (done) return null;

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : finish());

  return (
    <Modal
      visible
      animationType="fade"
      transparent={false}
      onRequestClose={finish}
      testID="onboarding"
    >
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <View style={styles.top}>
          <Text variant="labelSmall" color={colors.textMuted} upper>
            {t.onboarding.stepOf
              .replace('{{step}}', String(step + 1))
              .replace('{{total}}', String(STEPS))}
          </Text>
          <Button
            label={t.onboarding.skip}
            variant="ghost"
            size="sm"
            onPress={finish}
            testID="onboarding-skip"
          />
        </View>
        <ProgressBar progress={(step + 1) / STEPS} color={colors.red} height={6} segments={STEPS} />

        <View style={styles.body}>
          {step === 0 ? (
            <>
              <Text variant="hero" upper style={styles.heading}>
                {t.onboarding.welcomeTitle}
              </Text>
              <Text variant="body" color={colors.textMuted}>
                {t.onboarding.welcomeBody}
              </Text>
              <Text variant="label" color={colors.textMuted} upper style={styles.label}>
                {t.settings.displayName}
              </Text>
              <TextInput
                value={displayName}
                onChangeText={(name) => updateProfile({ displayName: name })}
                placeholder={t.settings.displayNamePlaceholder}
                placeholderTextColor={colors.textDim}
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="done"
                testID="onboarding-name"
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Text variant="hero" upper style={styles.heading}>
                {t.onboarding.interactionTitle}
              </Text>
              <Text variant="body" color={colors.textMuted}>
                {t.onboarding.interactionBody}
              </Text>
              <View style={styles.picker}>
                <InteractionPicker
                  value={interaction}
                  onChange={(level: InteractionLevel) => setInteractionLevel(level)}
                />
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text variant="hero" upper style={styles.heading}>
                {t.onboarding.tipsTitle}
              </Text>
              {[t.onboarding.tipDoubleTap, t.onboarding.tipIntensity, t.onboarding.tipTempo].map(
                (tip, i) => (
                  <View key={tip} style={styles.tip}>
                    <Text variant="h2" color={colors.red}>
                      {i + 1}
                    </Text>
                    <Text variant="body" color={colors.text} style={styles.tipText}>
                      {tip}
                    </Text>
                  </View>
                ),
              )}
            </>
          ) : null}
        </View>

        <Button
          label={step < STEPS - 1 ? t.common.continue : t.onboarding.start}
          size="xl"
          fullWidth
          onPress={next}
          testID="onboarding-next"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, gap: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { flex: 1, gap: spacing.md, justifyContent: 'center' },
  heading: { fontSize: 48, lineHeight: 48 },
  label: { marginTop: spacing.lg },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  picker: { marginTop: spacing.sm },
  tip: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  tipText: { flex: 1 },
});
