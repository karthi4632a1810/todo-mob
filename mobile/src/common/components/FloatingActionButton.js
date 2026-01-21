import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function FloatingActionButton({ 
  onPress, 
  icon = 'add', 
  label,
  style 
}) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        { backgroundColor: theme.colors.primary },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={24} color="#ffffff" />
      {label && (
        <Text style={styles.fabLabel}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabLabel: {
    color: '#ffffff',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});

