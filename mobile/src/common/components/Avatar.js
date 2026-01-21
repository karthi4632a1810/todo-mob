import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function Avatar({ name, size = 48, style, uri }) {
  const theme = useTheme();
  
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: uri ? 'transparent' : theme.colors.primary + '20',
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} />
      ) : (
        <Text
          style={[
            styles.avatarText,
            {
              fontSize: size * 0.4,
              color: theme.colors.primary,
            },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '600',
  },
});

