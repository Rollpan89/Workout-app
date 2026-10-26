import { useCallback, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, TextInput, View } from 'react-native';

import type { PiperModelStatus, PiperPlaybackMetrics, PiperVoiceService } from '@/adapters/speech/piper/PiperVoiceService.types';
import { getPiperVoiceService } from '@/adapters/speech/piper/loadPiperVoiceService';
import { PiperSpeechPort } from '@/adapters/speech/piper/PiperSpeechPort';
import { useI18n } from '@/hooks/useI18n';
import { colors, radius, spacing } from '@/theme';
import { Button, Card, Screen, SectionTitle, Text } from '@/ui/primitives';

const SAMPLE_LINE = 'Next up: squats, twelve reps. Keep your chest tall and brace your core.';
const NUMBER_KEYS = Array.from({ length: 10 }, (_, index) => `number-${index + 1}`);

export function PiperVoiceLabScreen() {
  const router = useRouter();
  const { t, f } = useI18n();
  const [service, setService] = useState<PiperVoiceService>();
  const [speechPort, setSpeechPort] = useState<PiperSpeechPort>();
  const [status, setStatus] = useState<PiperModelStatus>();
  const [line, setLine] = useState(SAMPLE_LINE);
  const [download, setDownload] = useState<{ percent: number; phase: string }>();
  const [cueProgress, setCueProgress] = useState<{ completed: number; total: number }>();
  const [metrics, setMetrics] = useState<PiperPlaybackMetrics>();
  const [busy, setBusy] = useState<'download' | 'prepare' | 'dynamic' | 'countdown' | 'cadence' | 'priority' | 'remove' | null>(null);
  const [error, setError] = useState<string>();
  const runToken = useRef(0);
  const priorityTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const refreshStatus = useCallback(async (voice: PiperVoiceService) => {
    try {
      setStatus(await voice.getStatus());
    } catch (e) {
      setError(messageFor(e));
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') return;
    let mounted = true;
    getPiperVoiceService()
      .then(async (voice) => {
        if (!mounted) return;
        setService(voice);
        setSpeechPort(new PiperSpeechPort(voice));
        setStatus(await voice.getStatus());
      })
      .catch((e: unknown) => {
        if (mounted) setError(messageFor(e));
      });
    return () => {
      mounted = false;
      runToken.current += 1;
    };
  }, []);

  useEffect(
    () => () => {
      runToken.current += 1;
      priorityTimers.current.forEach(clearTimeout);
      if (speechPort) speechPort.stop();
      else void service?.stopPlayback();
    },
    [service, speechPort],
  );

  const doAction = useCallback(
    async (
      action: NonNullable<typeof busy>,
      work: (voice: PiperVoiceService) => Promise<void>,
    ) => {
      if (!service) return;
      setBusy(action);
      setError(undefined);
      try {
        await work(service);
      } catch (e) {
        setError(messageFor(e));
      } finally {
        setBusy(null);
        await refreshStatus(service);
      }
    },
    [refreshStatus, service],
  );

  const prepareCues = () =>
    doAction('prepare', async (voice) => {
      setCueProgress({ completed: 0, total: status?.cueTotal ?? 38 });
      await voice.prepareCuePack(({ completed, total }) => setCueProgress({ completed, total }));
    });

  const playDynamic = () =>
    doAction('dynamic', async (voice) => {
      const token = ++runToken.current;
      const result = await voice.playDynamic(line, () => runToken.current === token);
      if (runToken.current === token) setMetrics(result);
    });

  const playCountdown = () =>
    doAction('countdown', async (voice) => {
      const token = ++runToken.current;
      const results = await voice.playCountdown(() => runToken.current === token);
      if (runToken.current === token && results.length) setMetrics(results[0]);
    });

  const playCadence = () =>
    doAction('cadence', async (voice) => {
      const token = ++runToken.current;
      for (const key of NUMBER_KEYS) {
        if (runToken.current !== token) break;
        const result = await voice.playCue(key, () => runToken.current === token);
        if (runToken.current === token) setMetrics(result);
        if (!result.completed) break;
        await wait(260);
      }
    });

  const runPriorityTest = () => {
    if (!service || !speechPort) return;
    setBusy('priority');
    setError(undefined);
    const token = ++runToken.current;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      priorityTimers.current.forEach(clearTimeout);
      priorityTimers.current = [];
      if (runToken.current === token) setBusy(null);
    };

    // A long dynamic instruction starts, a low-value line queues behind it,
    // and a static "Go!" interrupts both. This exercises the coach's existing
    // priority contract without changing the workout flow yet.
    speechPort.speak({
      text: 'Keep your chest lifted and brace your core as you lower under control.',
      language: 'en-US',
      priority: 'interrupt',
    });
    speechPort.speak({ text: 'Nice work.', language: 'en-US', priority: 'queue' });
    const interruptTimer = setTimeout(() => {
      if (runToken.current !== token) return;
      speechPort.speak({ text: 'Go!', language: 'en-US', priority: 'interrupt', onDone: settle });
    }, 700);
    // If the native player does not report completion, do not leave the lab busy.
    const watchdogTimer = setTimeout(settle, 25_000);
    priorityTimers.current = [interruptTimer, watchdogTimer];
  };

  const stopAudio = async () => {
    runToken.current += 1;
    priorityTimers.current.forEach(clearTimeout);
    priorityTimers.current = [];
    if (speechPort) speechPort.stop();
    else await service?.stopPlayback();
    setBusy(null);
  };

  const removeVoice = () =>
    doAction('remove', async (voice) => {
      await voice.removeVoice();
      setCueProgress(undefined);
      setMetrics(undefined);
    });

  const unavailable = Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient';
  const installed = status?.installed ?? false;
  const cacheReady = status?.cueTotal ? status.cueCount === status.cueTotal : false;
  const progressPercent = download?.percent ?? 0;
  const canStop = busy === 'dynamic' || busy === 'countdown' || busy === 'cadence' || busy === 'priority';

  return (
    <Screen>
      <View style={styles.topBar}>
        <Button label={t.common.back} variant="ghost" size="sm" onPress={() => router.back()} />
        <Text variant="labelSmall" color={colors.orange} upper>
          POC · OFFLINE TTS
        </Text>
      </View>
      <Text variant="hero" upper style={styles.heading}>
        {t.settings.piperPocTitle}
      </Text>
      <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
        {t.settings.piperPocHint}
      </Text>

      {unavailable ? (
        <Card>
          <Text variant="bodyBold">{t.settings.piperNativeOnly}</Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text variant="h3">US English · Norman medium</Text>
            <Text variant="bodySmall" color={colors.textMuted}>
              {installed ? t.settings.piperModelInstalled : t.settings.piperModelMissing}
            </Text>
            <Text variant="bodySmall" color={colors.textDim}>
              {t.settings.piperPremiumNote}
            </Text>
            {download ? (
              <View style={styles.progressBlock}>
                <Text variant="labelSmall" color={colors.textMuted}>
                  {f(t.settings.piperDownloadProgress, { phase: download.phase, percent: Math.round(progressPercent) })}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progressPercent))}%` }]} />
                </View>
              </View>
            ) : null}
            {busy === 'download' ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={colors.orange} />
                <Text variant="bodySmall" color={colors.textMuted}>{t.settings.piperDownloading}</Text>
              </View>
            ) : null}
            <View style={styles.buttonStack}>
              {!installed ? (
                <Button
                  label={t.settings.piperDownloadModel}
                  onPress={() =>
                    doAction('download', async (voice) => {
                      setDownload({ percent: 0, phase: 'download' });
                      try {
                        await voice.downloadVoice((p) => setDownload({ percent: p.percent, phase: p.phase }));
                      } finally {
                        setDownload(undefined);
                      }
                    })
                  }
                  disabled={!service || busy !== null}
                  fullWidth
                />
              ) : (
                <Button
                  label={t.settings.piperRemoveModel}
                  variant="secondary"
                  onPress={removeVoice}
                  disabled={!service || busy !== null}
                  fullWidth
                />
              )}
            </View>
          </Card>

          {installed ? (
            <>
              <SectionTitle title={t.settings.piperStaticTitle} />
              <Card>
                <Text variant="bodySmall" color={colors.textMuted}>
                  {t.settings.piperMethodNote}
                </Text>
                <Text variant="labelSmall" color={cacheReady ? colors.success : colors.textDim}>
                  {f(t.settings.piperCuesReady, { count: status?.cueCount ?? 0, total: status?.cueTotal ?? 38 })}
                </Text>
                {busy === 'prepare' && cueProgress ? (
                  <View style={styles.busyRow}>
                    <ActivityIndicator color={colors.orange} />
                    <Text variant="bodySmall" color={colors.textMuted}>
                      {f(t.settings.piperPreparingCues, { current: cueProgress.completed, total: cueProgress.total })}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.buttonStack}>
                  <Button
                    label={t.settings.piperPrepareCues}
                    onPress={prepareCues}
                    disabled={!service || busy !== null || cacheReady}
                    fullWidth
                    variant="secondary"
                  />
                  <Button
                    label={t.settings.piperCountdown}
                    onPress={playCountdown}
                    disabled={!service || busy !== null || !cacheReady}
                    fullWidth
                  />
                  <Button
                    label={t.settings.piperCountCadence}
                    onPress={playCadence}
                    disabled={!service || busy !== null || !cacheReady}
                    fullWidth
                    variant="secondary"
                  />
                  <Button
                    label={t.settings.piperPriorityTest}
                    onPress={runPriorityTest}
                    disabled={!service || !speechPort || busy !== null}
                    fullWidth
                    variant="secondary"
                  />
                </View>
              </Card>

              <SectionTitle title={t.settings.piperDynamicTitle} />
              <Card>
                <TextInput
                  value={line}
                  onChangeText={setLine}
                  placeholder={t.settings.piperDynamicPlaceholder}
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  accessibilityLabel={t.settings.piperDynamicTitle}
                />
                <View style={styles.buttonStack}>
                  <Button
                    label={t.settings.piperSpeakDynamic}
                    onPress={playDynamic}
                    disabled={!service || busy !== null || !line.trim()}
                    fullWidth
                  />
                  <Button label={t.settings.piperStop} onPress={stopAudio} disabled={!canStop} variant="ghost" fullWidth />
                </View>
                {metrics ? (
                  <Text variant="bodySmall" color={colors.textDim}>
                    {f(t.settings.piperMetrics, {
                      source: metrics.source,
                      firstAudio: metrics.firstAudioMs,
                      synthesis: metrics.synthesisMs,
                    })}
                  </Text>
                ) : null}
              </Card>
            </>
          ) : null}
        </>
      )}

      {error ? (
        <Card style={styles.errorCard}>
          <Text variant="bodySmall" color={colors.danger}>{error}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  heading: { fontSize: 50, lineHeight: 50, marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg },
  progressBlock: { gap: spacing.xs, marginTop: spacing.sm },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.orange },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  buttonStack: { gap: spacing.sm, marginTop: spacing.md },
  input: {
    minHeight: 100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    lineHeight: 22,
  },
  errorCard: { borderColor: colors.danger, borderWidth: 1 },
});
