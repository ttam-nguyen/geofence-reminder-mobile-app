/**
 * PressableArea — a Pressable that always shows feedback when touched.
 *
 * Every interactive element in the app goes through this so the behaviour is uniform:
 * - Android: ripple from the touch point, clipped to the view's shape.
 * - iOS: opacity dip while held.
 * - Disabled: no ripple, no dip, and `accessibilityState.disabled` set.
 *
 * It forwards everything a Pressable accepts, so replacing `Pressable` with `PressableArea`
 * is mechanical and existing styles keep working.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../theme';

/** Alpha applied to a held button on iOS, where there is no ripple. */
const PRESSED_OPACITY = 0.62;

interface PressableAreaProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Opacity dip while pressed. Disable for elements that highlight some other way. */
  dim?: boolean;
}

export function PressableArea({
  style,
  dim = true,
  disabled,
  children,
  ...rest
}: PressableAreaProps) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      android_ripple={disabled ? undefined : { color: 'rgba(255,255,255,0.16)', borderless: false }}
      style={({ pressed }) => [
        style,
        // Ripple provides Android feedback; the dip covers iOS and any Android view that
        // clips the ripple away (for example fully transparent backgrounds).
        dim && pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

/**
 * PrimaryActionButton — the filled action button used for Save / Allow / Send.
 * Shows a spinner and blocks repeat taps while `loading` is true.
 */
interface PrimaryActionButtonProps {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export function PrimaryActionButton({
  label,
  loadingLabel,
  loading = false,
  disabled = false,
  onPress,
  testID,
  accessibilityLabel,
}: PrimaryActionButtonProps) {
  const isBlocked = disabled || loading;

  return (
    <PressableArea
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      disabled={isBlocked}
      onPress={onPress}
      style={[styles.primaryButton, isBlocked ? styles.primaryButtonBlocked : null]}
    >
      <View style={styles.primaryButtonContent}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.textPrimary} style={styles.spinner} />
        ) : null}
        <Text style={styles.primaryButtonText}>
          {loading ? (loadingLabel ?? `${label}…`) : label}
        </Text>
      </View>
    </PressableArea>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  disabled: {
    opacity: 0.45,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.signalRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  primaryButtonBlocked: {
    backgroundColor: Colors.disabledFill,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  spinner: {
    marginRight: Spacing.xs,
  },
});
