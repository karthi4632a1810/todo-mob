import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function Badge({ 
  label, 
  variant = 'default',
  size = 'md',
  style 
}) {
  const theme = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: theme.colors.success + '15',
          color: theme.colors.success,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error + '15',
          color: theme.colors.error,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning + '15',
          color: theme.colors.warning,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.info + '15',
          color: theme.colors.info,
        };
      case 'primary':
        return {
          backgroundColor: theme.colors.primary + '15',
          color: theme.colors.primary,
        };
      default:
        return {
          backgroundColor: theme.colors.textSecondary + '15',
          color: theme.colors.textSecondary,
        };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 11,
          borderRadius: 8,
        };
      case 'lg':
        return {
          paddingHorizontal: 12,
          paddingVertical: 6,
          fontSize: 14,
          borderRadius: 16,
        };
      default:
        return {
          paddingHorizontal: 10,
          paddingVertical: 5,
          fontSize: 12,
          borderRadius: 12,
        };
    }
  };

  const variantStyle = getVariantStyle();
  const sizeStyle = getSizeStyle();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderRadius: sizeStyle.borderRadius,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: variantStyle.color,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

