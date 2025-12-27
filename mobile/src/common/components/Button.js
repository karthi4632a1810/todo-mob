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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

