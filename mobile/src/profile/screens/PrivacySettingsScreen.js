import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../common/components/Card';
import { useTheme } from '../../common/theme/ThemeContext';

export default function PrivacySettingsScreen() {
  const navigation = useNavigation();
  const theme = useTheme();

  const [settings, setSettings] = useState({
    profileVisibility: true,
    showEmail: true,
    showDepartment: true,
    allowTaskAssignment: true,
    allowNotifications: true,
    dataSharing: false,
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    // In a real app, you would save these settings to the backend
    Alert.alert('Success', 'Privacy settings saved successfully', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const SettingItem = ({ icon, label, description, value, onToggle, disabled = false }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
        thumbColor={value ? theme.colors.primary : '#f4f3f4'}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={[styles.topBar, { backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Privacy Settings</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.content}>
          <Card style={styles.settingsCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>PROFILE PRIVACY</Text>

            <SettingItem
              icon="person"
              label="Profile Visibility"
              description="Allow others to view your profile"
              value={settings.profileVisibility}
              onToggle={() => handleToggle('profileVisibility')}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <SettingItem
              icon="mail"
              label="Show Email"
              description="Display your email address to others"
              value={settings.showEmail}
              onToggle={() => handleToggle('showEmail')}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <SettingItem
              icon="business"
              label="Show Department"
              description="Display your department information"
              value={settings.showDepartment}
              onToggle={() => handleToggle('showDepartment')}
            />
          </Card>

          <Card style={styles.settingsCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>TASK SETTINGS</Text>

            <SettingItem
              icon="checkmark-circle"
              label="Allow Task Assignment"
              description="Allow others to assign tasks to you"
              value={settings.allowTaskAssignment}
              onToggle={() => handleToggle('allowTaskAssignment')}
            />
          </Card>

          <Card style={styles.settingsCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>NOTIFICATIONS</Text>

            <SettingItem
              icon="notifications"
              label="Allow Notifications"
              description="Receive push notifications for updates"
              value={settings.allowNotifications}
              onToggle={() => handleToggle('allowNotifications')}
            />
          </Card>

          <Card style={styles.settingsCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>DATA & PRIVACY</Text>

            <SettingItem
              icon="share-social"
              label="Data Sharing"
              description="Allow sharing of anonymized data for analytics"
              value={settings.dataSharing}
              onToggle={() => handleToggle('dataSharing')}
            />
          </Card>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  topBar: {
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
  },
  backButton: {
    padding: 4,
  },
  backButtonPlaceholder: {
    width: 32,
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  content: {
    padding: 20,
  },
  settingsCard: {
    marginBottom: 20,
    padding: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...{
      shadowColor: '#6366f1',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

