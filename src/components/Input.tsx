/**
 * Frosted Future Input component.
 *
 * Features: label, error state, icon prefix/suffix, secure text entry.
 */

import React from 'react';
import {
  TextInput,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import type { ViewStyle, TextInputProps as RNTextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  const hasError = !!error;
  const inputBorderColor = hasError ? colors.error : colors.divider;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, { borderColor: inputBorderColor }]}>
        {leftIcon && <View style={styles.iconPrefix}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            { color: colors.secondaryText },
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
            style,
          ]}
          placeholder={hasError ? '' : rest.placeholder}
          placeholderTextColor={colors.secondaryText}
          {...rest}
        />
        {rightIcon && <View style={styles.iconSuffix}>{rightIcon}</View>}
      </View>
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  iconPrefix: {
    marginRight: 8,
  },
  iconSuffix: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#E53E3E',
    marginTop: 4,
  },
});
