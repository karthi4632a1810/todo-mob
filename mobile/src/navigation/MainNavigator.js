import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../dashboard/screens/DashboardScreen';
import TaskDetailScreen from '../tasks/screens/TaskDetailScreen';
import TaskHistoryScreen from '../tasks/screens/TaskHistoryScreen';
import TaskActivityScreen from '../tasks/screens/TaskActivityScreen';
import RelatedTasksScreen from '../tasks/screens/RelatedTasksScreen';
import CreateTaskScreen from '../tasks/screens/CreateTaskScreen';
import EditTaskScreen from '../tasks/screens/EditTaskScreen';
import TaskManagementScreen from '../tasks/screens/TaskManagementScreen';
import ApprovalsScreen from '../approvals/screens/ApprovalsScreen';
import ReportsScreen from '../reports/screens/ReportsScreen';
import DiaryScreen from '../diary/screens/DiaryScreen';
import NotificationsScreen from '../notifications/screens/NotificationsScreen';
import ProfileScreen from '../profile/screens/ProfileScreen';
import EditProfileScreen from '../profile/screens/EditProfileScreen';
import ChangePasswordScreen from '../profile/screens/ChangePasswordScreen';
import PrivacySettingsScreen from '../profile/screens/PrivacySettingsScreen';
import DepartmentManagementScreen from '../departments/screens/DepartmentManagementScreen';
import UserManagementScreen from '../users/screens/UserManagementScreen';
import ActivityScreen from '../activity/screens/ActivityScreen';
import ActionBottomSheet from '../common/components/ActionBottomSheet';
import { useTheme } from '../common/theme/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="DashboardMain"
    >
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen}
        options={{ 
          title: 'Dashboard', 
          headerShown: false,
          gestureEnabled: false, // Prevent swipe back on Dashboard
        }}
      />
      <Stack.Screen 
        name="DepartmentManagement" 
        component={DepartmentManagementScreen}
        options={{ 
          title: 'Manage Departments',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="UserManagement" 
        component={UserManagementScreen}
        options={{ 
          title: 'Manage Users',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Activity" 
        component={ActivityScreen}
        options={{ 
          title: 'Activity',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ 
          title: 'Task Details',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TaskHistory"
        component={TaskHistoryScreen}
        options={{ 
          title: 'Status History',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditTask"
        component={EditTaskScreen}
        options={{ 
          title: 'Edit Task',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function TasksStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
      }}
      initialRouteName="TasksMain"
    >
      <Stack.Screen 
        name="TasksMain" 
        component={TaskManagementScreen}
        options={{ 
          title: 'Tasks', 
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ 
          title: 'Task Details',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TaskHistory"
        component={TaskHistoryScreen}
        options={{ 
          title: 'Status History',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TaskActivity"
        component={TaskActivityScreen}
        options={{ 
          title: 'Task Activity',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RelatedTasks"
        component={RelatedTasksScreen}
        options={{ 
          title: 'Related Tasks',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ 
          title: 'Create Task',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditTask"
        component={EditTaskScreen}
        options={{ 
          title: 'Edit Task',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function ApprovalsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="ApprovalsMain" 
        component={ApprovalsScreen}
        options={{ title: 'Approvals' }}
      />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="ReportsMain"
    >
      <Stack.Screen 
        name="ReportsMain" 
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
    </Stack.Navigator>
  );
}

function DiaryStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="DiaryMain"
    >
      <Stack.Screen 
        name="DiaryMain" 
        component={DiaryScreen}
        options={{ title: 'Diary' }}
      />
    </Stack.Navigator>
  );
}

function NotificationsStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="NotificationsMain"
    >
      <Stack.Screen 
        name="NotificationsMain" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="ProfileMain"
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ title: 'Edit Profile', headerShown: false }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{ title: 'Change Password', headerShown: false }}
      />
      <Stack.Screen 
        name="PrivacySettings" 
        component={PrivacySettingsScreen}
        options={{ title: 'Privacy Settings', headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Placeholder component for Action tab (doesn't render anything)
function ActionTabPlaceholder() {
  return null;
}

// Custom Action Button Component
function ActionButton({ onPress }) {
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.actionButtonInner}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </View>
    </TouchableOpacity>
  );
}

export default function MainNavigator() {
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const navigationRef = useRef(null);

  // Role-based navigation - handle null user gracefully
  const canAccessApprovals = user && user.role === 'DIRECTOR'; // Only Directors can access Approvals
  const canAccessReports = user && (user.role === 'HOD' || user.role === 'DIRECTOR');
  const isDirector = user && user.role === 'DIRECTOR';

  // For Directors: Show 5 tabs (Home, Tasks, Action, Reports, Profile)
  if (isDirector) {
    return (
      <>
        <Tab.Navigator
          ref={navigationRef}
          initialRouteName="Dashboard"
          screenOptions={({ route }) => {
            return {
              headerShown: false,
              tabBarActiveTintColor: '#6366f1', // Purple for active
              tabBarInactiveTintColor: '#64748b', // Gray for inactive
              tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopWidth: 0,
                paddingBottom: 8,
                paddingTop: 8,
                height: 70,
                ...styles.tabBarShadow,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '500',
                marginTop: 4,
              },
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                let iconSize = 24;

                if (route.name === 'Dashboard') {
                  iconName = focused ? 'grid' : 'grid-outline';
                  iconSize = 22;
                } else if (route.name === 'Tasks') {
                  iconName = focused ? 'clipboard' : 'clipboard-outline';
                  iconSize = 24;
                } else if (route.name === 'Reports') {
                  iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                  iconSize = 24;
                } else if (route.name === 'Profile') {
                  iconName = focused ? 'person' : 'person-outline';
                  iconSize = 24;
                }

                if (route.name === 'Action') {
                  return null; // Action button is handled separately
                }

                return <Ionicons name={iconName} size={iconSize} color={color} />;
              },
              tabBarButton: (props) => {
                if (route.name === 'Action') {
                  return (
                    <View style={styles.actionButtonContainer}>
                      <ActionButton onPress={() => setActionSheetVisible(true)} />
                    </View>
                  );
                }
                return <TouchableOpacity {...props} />;
              },
            };
          }}
        >
          <Tab.Screen 
            name="Dashboard" 
            component={DashboardStack}
            options={{ title: 'Home' }}
          />
          <Tab.Screen 
            name="Tasks" 
            component={TasksStack}
            options={{ title: 'Tasks' }}
          />
          <Tab.Screen 
            name="Action" 
            component={ActionTabPlaceholder}
            options={{ title: '' }}
            listeners={{
              tabPress: (e) => {
                e.preventDefault();
                setActionSheetVisible(true);
              },
            }}
          />
          <Tab.Screen 
            name="Reports" 
            component={ReportsStack}
            options={{ title: 'Reports' }}
          />
          <Tab.Screen 
            name="Diary" 
            component={DiaryStack}
            options={{ 
              title: 'Diary',
              tabBarButton: () => null, // Hide from tab bar but keep navigable
            }}
          />
          {canAccessApprovals && (
            <Tab.Screen 
              name="Approvals" 
              component={ApprovalsStack}
              options={{ 
                title: 'Approvals',
                tabBarButton: () => null, // Hide from tab bar but keep navigable
              }}
            />
          )}
          <Tab.Screen 
            name="Notifications" 
            component={NotificationsStack}
            options={{ 
              title: 'Notifications',
              tabBarButton: () => null, // Hide from tab bar but keep navigable
            }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileStack}
            options={{ title: 'Profile' }}
          />
        </Tab.Navigator>
        <ActionBottomSheet
          visible={actionSheetVisible}
          onClose={() => setActionSheetVisible(false)}
        />
      </>
    );
  }

  // For HOD and Employee: Show 5 tabs (Home, Tasks, Action, Reports, Profile)
  return (
    <>
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#6366f1', // Purple for active
          tabBarInactiveTintColor: '#64748b', // Gray for inactive
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 0,
            paddingBottom: 8,
            paddingTop: 8,
            height: 70,
            ...styles.tabBarShadow,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            let iconSize = 24;

                if (route.name === 'Dashboard') {
                  iconName = focused ? 'grid' : 'grid-outline';
                  iconSize = 22;
                } else if (route.name === 'Tasks') {
                  iconName = focused ? 'clipboard' : 'clipboard-outline';
                  iconSize = 24;
                } else if (route.name === 'Reports') {
                  iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                  iconSize = 24;
                } else if (route.name === 'Profile') {
                  iconName = focused ? 'person' : 'person-outline';
                  iconSize = 24;
                }

            if (route.name === 'Action') {
              return null; // Action button is handled separately
            }

            return <Ionicons name={iconName} size={iconSize} color={color} />;
          },
          tabBarButton: (props) => {
            if (route.name === 'Action') {
              return (
                <View style={styles.actionButtonContainer}>
                  <ActionButton onPress={() => setActionSheetVisible(true)} />
                </View>
              );
            }
            return <TouchableOpacity {...props} />;
          },
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardStack}
          options={{ title: 'Home' }}
        />
        <Tab.Screen 
          name="Tasks" 
          component={TasksStack}
          options={{ title: 'Tasks' }}
        />
        <Tab.Screen 
          name="Action" 
          component={ActionTabPlaceholder}
          options={{ title: '' }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setActionSheetVisible(true);
            },
          }}
        />
        {canAccessReports && (
          <Tab.Screen 
            name="Reports" 
            component={ReportsStack}
            options={{ title: 'Reports' }}
          />
        )}
        <Tab.Screen 
          name="Diary" 
          component={DiaryStack}
          options={{ 
            title: 'Diary',
            tabBarButton: () => null, // Hide from tab bar but keep navigable
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileStack}
          options={{ title: 'Profile' }}
        />
      </Tab.Navigator>
      <ActionBottomSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  actionButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -20,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

