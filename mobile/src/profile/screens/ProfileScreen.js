import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { logout, clearCredentials } from '../../store/slices/authSlice';
import { storage } from '../../services/storage';
import Button from '../../common/components/Button';
import Card from '../../common/components/Card';
import { useTheme } from '../../common/theme/ThemeContext';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();

  // Debug: Log user data
  React.useEffect(() => {
    if (__DEV__) {
      console.log('ProfileScreen - User data:', JSON.stringify(user, null, 2));
    }
  }, [user]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear storage first
              await storage.clearAll();
              // Dispatch logout - this will update Redux state
              // AppNavigator will automatically switch to Auth screen when isAuthenticated becomes false
              await dispatch(logout());
              // Also clear credentials to ensure clean state
              dispatch(clearCredentials());
            } catch (error) {
              console.error('Logout error:', error);
              // Even if logout fails, clear local state
              await storage.clearAll();
              dispatch(clearCredentials());
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Profile Information
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Name:
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {user?.name || 'Not available'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Email:
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {user?.email || 'Not available'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Role:
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {user?.role || 'Not available'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Department:
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {user?.department || 'Not available'}
            </Text>
          </View>
        </Card>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 24,
  },
});

