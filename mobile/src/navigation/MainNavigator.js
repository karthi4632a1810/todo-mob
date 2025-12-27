import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../dashboard/screens/DashboardScreen';
import TasksScreen from '../tasks/screens/TasksScreen';
import TaskDetailScreen from '../tasks/screens/TaskDetailScreen';
import TaskHistoryScreen from '../tasks/screens/TaskHistoryScreen';
import CreateTaskScreen from '../tasks/screens/CreateTaskScreen';
import EditTaskScreen from '../tasks/screens/EditTaskScreen';
import ApprovalsScreen from '../approvals/screens/ApprovalsScreen';
import ReportsScreen from '../reports/screens/ReportsScreen';
import DiaryScreen from '../diary/screens/DiaryScreen';
import NotificationsScreen from '../notifications/screens/NotificationsScreen';
import ProfileScreen from '../profile/screens/ProfileScreen';
import DepartmentManagementScreen from '../departments/screens/DepartmentManagementScreen';
import UserManagementScreen from '../users/screens/UserManagementScreen';
import ActionBottomSheet from '../common/components/ActionBottomSheet';
import { useTheme } from '../common/theme/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="DepartmentManagement" 
        component={DepartmentManagementScreen}
        options={{ title: 'Manage Departments' }}
      />
      <Stack.Screen 
        name="UserManagement" 
        component={UserManagementScreen}
        options={{ title: 'Manage Users' }}
      />
    </Stack.Navigator>
  );
}

function TasksStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TasksMain" 
        component={TasksScreen}
        options={{ title: 'Tasks' }}
      />
          <Stack.Screen
            name="TaskDetail"
            component={TaskDetailScreen}
            options={{ title: 'Task Details' }}
          />
          <Stack.Screen
            name="TaskHistory"
            component={TaskHistoryScreen}
            options={{ title: 'Status History' }}
          />
          <Stack.Screen
            name="CreateTask"
            component={CreateTaskScreen}
            options={{ title: 'Create Task' }}
          />
          <Stack.Screen
            name="EditTask"
            component={EditTaskScreen}
            options={{ title: 'Edit Task' }}
          />
    </Stack.Navigator>
  );
}

function ApprovalsStack() {
  return (
    <Stack.Navigator>
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
    <Stack.Navigator>
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
    <Stack.Navigator>
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
    <Stack.Navigator>
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
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
}

// Placeholder component for Action tab (doesn't render anything)
function ActionTabPlaceholder() {
  return null;
}

export default function MainNavigator() {
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const navigationRef = useRef(null);

  // Role-based navigation - handle null user gracefully
  const canAccessApprovals = user && (user.role === 'HOD' || user.role === 'DIRECTOR');
  const canAccessReports = user && (user.role === 'HOD' || user.role === 'DIRECTOR');
  const isDirector = user && user.role === 'DIRECTOR';

  // For Directors: Show only 3 tabs (Action, Home, Profile) but keep all stacks accessible
  if (isDirector) {
    const visibleTabs = ['Action', 'Dashboard', 'Profile'];
    
    return (
      <>
        <Tab.Navigator
          ref={navigationRef}
          initialRouteName="Dashboard"
          screenOptions={({ route }) => {
            const isVisible = visibleTabs.includes(route.name);
            return {
              headerShown: false,
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.textSecondary,
              // Always show tab bar for all screens
              tabBarStyle: {
                backgroundColor: theme.colors.surface,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                paddingBottom: 5,
                paddingTop: 5,
                height: 60,
                display: 'flex',
              },
              // Hide tab button for non-visible tabs, but keep tab bar visible
              tabBarButton: isVisible ? undefined : () => null,
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Action') {
                  iconName = focused ? 'apps' : 'apps-outline';
                } else if (route.name === 'Dashboard') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Profile') {
                  iconName = focused ? 'person' : 'person-outline';
                }

                return <Ionicons name={iconName} size={size || 24} color={color} />;
              },
            };
          }}
        >
          <Tab.Screen 
            name="Action" 
            component={ActionTabPlaceholder}
            options={{ title: 'Action' }}
            listeners={{
              tabPress: (e) => {
                e.preventDefault();
                setActionSheetVisible(true);
              },
            }}
          />
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
            name="Approvals" 
            component={ApprovalsStack}
            options={{ title: 'Approvals' }}
          />
          <Tab.Screen 
            name="Reports" 
            component={ReportsStack}
            options={{ title: 'Reports' }}
          />
          <Tab.Screen 
            name="Diary" 
            component={DiaryStack}
            options={{ title: 'Diary' }}
          />
          <Tab.Screen 
            name="Notifications" 
            component={NotificationsStack}
            options={{ title: 'Notifications' }}
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

  // For HOD and Employee: Show all tabs as before
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Approvals') {
            iconName = focused ? 'checkmark-done' : 'checkmark-done-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Diary') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size || 24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={TasksStack}
        options={{ title: 'Tasks' }}
      />
      {canAccessApprovals && (
        <Tab.Screen 
          name="Approvals" 
          component={ApprovalsStack}
          options={{ title: 'Approvals' }}
        />
      )}
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
        options={{ title: 'Diary' }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsStack}
        options={{ title: 'Notifications' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

