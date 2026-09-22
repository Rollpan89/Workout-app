import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { useI18n } from '@/hooks/useI18n';
import { colors, spacing } from '@/theme';
import { Button, type ButtonSize, type ButtonVariant, Text } from '@/ui/primitives';

export interface DeleteButtonProps {
  label: string;
  confirmMessage: string;
  onConfirm: () => void;
  /** Base testID; the confirm row uses `${testID}-confirm` / `${testID}-cancel`. */
  testID: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Destructive action with the platform-appropriate confirmation: the native
 * alert on iOS/Android, an inline "Ja/Nej" row on web (where Alert is a no-op).
 */
export function DeleteButton({
  label,
  confirmMessage,
  onConfirm,
  testID,
  variant = 'ghost',
  size = 'sm',
}: DeleteButtonProps) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  const ask = () => {
    if (Platform.OS === 'web') {
      setConfirming(true);
      return;
    }
    Alert.alert(label, confirmMessage, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.yes, style: 'destructive', onPress: onConfirm },
    ]);
  };

  if (!confirming) {
    return <Button label={label} variant={variant} size={size} onPress={ask} testID={testID} />;
  }

  return (
    <View style={styles.row} testID={`${testID}-confirm-row`}>
      <Text variant="bodySmall" color={colors.textMuted} style={styles.text}>
        {confirmMessage}
      </Text>
      <Button
        label={t.common.no}
        variant="secondary"
        size="sm"
        onPress={() => setConfirming(false)}
        testID={`${testID}-cancel`}
      />
      <Button
        label={t.common.yes}
        variant="danger"
        size="sm"
        onPress={() => {
          setConfirming(false);
          onConfirm();
        }}
        testID={`${testID}-confirm`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  text: { flex: 1, minWidth: 160 },
});
