import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../common/theme/ThemeContext';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  disabled = false,
  loading = false,
  style,
  textStyle,
}) {
  const theme = useTheme();

  const getButtonStyle = () => {
    if (disabled || loading) {
      return [styles.button, { backgroundColor: theme.colors.border }];
    }
    
    switch (variant) {
      case 'primary':
        return [styles.button, { backgroundColor: theme.colors.primary }];
      case 'secondary':
        return [styles.button, { backgroundColor: theme.colors.secondary }];
      case 'outline':
        return [
          styles.button,
          styles.buttonOutline,
          { borderColor: theme.colors.primary },
        ];
      default:
        return [styles.button, { backgroundColor: theme.colors.primary }];
    }
  };

  const getTextStyle = () => {
    if (variant === 'outline') {
      return [styles.text, { color: theme.colors.primary }, textStyle];
    }
    return [styles.text, { color: '#ffffff' }, textStyle];
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

