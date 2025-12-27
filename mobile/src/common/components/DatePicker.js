import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';

export default function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  minimumDate,
  maximumDate,
  mode = 'date',
  required = false,
}) {
  const [show, setShow] = useState(false);
  const theme = useTheme();

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (mode === 'date') {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } else if (mode === 'datetime') {
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDateChange = (event, selectedDate) => {
    setShow(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
          {required && <Text style={{ color: theme.colors.error }}> *</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.picker,
          {
            borderColor: error ? theme.colors.error : theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
        onPress={() => setShow(true)}
      >
        <Text
          style={[
            styles.pickerText,
            {
              color: value ? theme.colors.text : theme.colors.textSecondary,
            },
          ]}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
        <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>📅</Text>
      </TouchableOpacity>
      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
      )}

      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});

