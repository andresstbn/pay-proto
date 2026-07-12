import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme/theme';

export function AppleSignInButton({
  disabled,
  loading,
  onPress,
}: {
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  if (Platform.OS !== 'ios') return null;

  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={[styles.shell, disabled && styles.disabled]}>
      <AppleAuthentication.AppleAuthenticationButton
        accessibilityLabel="Continuar con Apple"
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        cornerRadius={radius.card}
        onPress={onPress}
        style={styles.button}
      />
      {loading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.white} size="small" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.card,
    height: 52,
    overflow: 'hidden',
    width: '100%',
  },
  button: {
    height: 52,
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: colors.gray900,
    justifyContent: 'center',
  },
});
