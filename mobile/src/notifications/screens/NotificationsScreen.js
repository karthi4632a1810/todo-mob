import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../common/theme/ThemeContext';

export default function NotificationsScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Notifications
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          No notifications at the moment
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
});

