import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { logout, clearCredentials } from '../../store/slices/authSlice';
import { storage } from '../../services/storage';
import Card from '../../common/components/Card';
import Avatar from '../../common/components/Avatar';
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
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
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

  const getEmployeeId = () => {
    // Try different possible field names for employee ID
    return user?.employeeId || user?.employee_id || user?._id?.slice(-6) || 'N/A';
  };

  const formatEmployeeId = (id) => {
    if (id === 'N/A' || !id) return 'N/A';
    // Format as EMP-YYYY-XXX if it's a long ID
    if (id.length > 6) {
      const year = new Date().getFullYear();
      const shortId = id.slice(-3);
      return `EMP-${year}-${shortId}`;
    }
    return id;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Purple Header Section */}
        <View style={styles.headerSection}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Avatar name={user?.name} size={120} style={styles.avatar} />
              <TouchableOpacity style={styles.editAvatarBadge}>
                <Ionicons name="pencil" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userDepartment}>{user?.department || 'No Department'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user?.role || 'USER'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Personal Info Card */}
          <Card style={styles.infoCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>PERSONAL INFO</Text>
            
            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="person" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Full Name</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {user?.name || 'Not available'}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="mail" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {user?.email || 'Not available'}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="briefcase" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Employee ID</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {formatEmployeeId(getEmployeeId())}
                </Text>
              </View>
            </View>
          </Card>

          {/* Account Settings Card */}
          <Card style={styles.settingsCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>ACCOUNT SETTINGS</Text>
            
            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Ionicons name="list" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <Ionicons name="lock-closed" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>Notifications Settings</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={() => navigation.navigate('PrivacySettings')}
            >
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>Privacy Settings</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Card>

          {/* Log Out Button */}
          <TouchableOpacity 
            style={[styles.logoutButton, { borderColor: theme.colors.primary }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color={theme.colors.primary} />
            <Text style={[styles.logoutButtonText, { color: theme.colors.primary }]}>Log Out</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={[styles.appVersion, { color: theme.colors.textSecondary }]}>
            App Version 1.0.0
          </Text>
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
  headerSection: {
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 40,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  menuButton: {
    padding: 4,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    borderWidth: 3,
    borderColor: '#fb923c',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  userDepartment: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 20,
  },
  infoCard: {
    marginBottom: 20,
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
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    marginTop: 8,
    marginBottom: 16,
    ...{
      shadowColor: '#6366f1',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  appVersion: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
});

