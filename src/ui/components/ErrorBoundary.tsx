import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { getCrashReporter } from '@/adapters/crash/crashReporter';
import { getTranslations } from '@/i18n';
import { useSettingsStore } from '@/state/settingsStore';
import { colors, spacing } from '@/theme';
import { Button, Text } from '@/ui/primitives';

interface Props {
  children: ReactNode;
  /** Called when the user taps "start over"; should reset app state. */
  onReset?: () => void;
}

interface State {
  error?: Error;
}

/**
 * Last line of defence: a render error anywhere in the tree shows a calm,
 * on-brand screen instead of a red box / white screen. The message tells the
 * user that a running workout was checkpointed (it is – see sessionStore),
 * and offers a restart. Errors are handed to the crash reporter, which only
 * transmits when the user opted in.
 *
 * Class component because React still has no hook for error boundaries. The
 * copy is read straight from the settings store (no hooks available here).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    getCrashReporter().capture(error, { componentStack: info.componentStack });
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState({ error: undefined });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const t = getTranslations(useSettingsStore.getState().settings.locale);
    return (
      <View style={styles.root} testID="error-boundary">
        <Text variant="label" color={colors.red} upper>
          {t.error.eyebrow}
        </Text>
        <Text variant="hero" upper style={styles.heading}>
          {t.error.heading}
        </Text>
        <Text variant="body" color={colors.textMuted}>
          {t.error.body}
        </Text>
        <Text variant="bodySmall" color={colors.textDim} numberOfLines={3} style={styles.detail}>
          {this.state.error.message}
        </Text>
        <Button
          label={t.error.restart}
          size="lg"
          fullWidth
          onPress={this.reset}
          testID="error-restart"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  heading: { fontSize: 48, lineHeight: 48 },
  detail: { marginBottom: spacing.lg },
});
