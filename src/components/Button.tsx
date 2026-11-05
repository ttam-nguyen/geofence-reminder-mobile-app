/**
 * Frosted Future Button component.
 *
 * Variants: primary, secondary, ghost.
 * Sizes: sm, md, lg.
 * States: loading, disabled, pressed.
 */

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  children,
  style,
}) => {
  const { theme } = useTheme();
  const { colors, radii, spacing } = theme;

  const isDisabled = disabled || loading;

  // Variant styles
  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      borderColor: 'transparent',
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: colors.primary,
      borderWidth: 1,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
  };

  // Size styles
  const sizeStyles: Record<string, ViewStyle> = {
    sm: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    md: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    lg: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
  };

  // Text styles
  const textVariantStyles: Record<string, TextStyle> = {
    primary: { color: colors.primaryText },
    secondary: { color: colors.primary },
    ghost: { color: colors.secondaryText },
  };

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        { borderRadius: radii.md },
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.primaryText : colors.primary} size="small" />
      ) : (
        <Text style={[{ fontSize: 14 }, textVariantStyles[variant]]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
