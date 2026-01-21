import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Alert, BackHandler } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTasks } from '../../store/slices/taskSlice';
import { reportAPI, userAPI, departmentAPI, taskAPI } from '../../services/api';
import Card from '../../common/components/Card';
import DatePicker from '../../common/components/DatePicker';
import Picker from '../../common/components/Picker';
import BarChart from '../../common/components/BarChart';
import TopBar from '../../common/components/TopBar';
import { useTheme } from '../../common/theme/ThemeContext';

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const { tasks, isLoading } = useSelector((state) => state.tasks);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('today'); // 'all', 'today', 'yesterday', 'tomorrow', 'week', 'month', 'year', 'custom'
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Director-only filters
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedHOD, setSelectedHOD] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [allEmployees, setAllEmployees] = useState([]); // Store all employees
  const [allHods, setAllHods] = useState([]); // Store all HODs
  const [filteredEmployees, setFilteredEmployees] = useState([]); // Filtered by department
  const [filteredHods, setFilteredHods] = useState([]); // Filtered by department
  const [departments, setDepartments] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  // Today's Activity state
  const [todayActivities, setTodayActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  const theme = useTheme();
  const isDirector = user?.role === 'DIRECTOR';

  // Get icon color for each action (matching ActionBottomSheet)
  const getIconColor = (id) => {
    const colorMap = {
      'tasks': '#6366f1',        // Purple
      'approvals': '#3b82f6',     // Blue
      'reports': '#10b981',       // Green
      'diary': '#6366f1',         // Purple
      'alerts': '#ef4444',        // Red
      'activity': '#f59e0b',      // Orange
      'departments': '#f59e0b',   // Orange
      'users': '#3b82f6',         // Blue
      'settings': '#64748b',      // Dark Gray
    };
    return colorMap[id] || '#6366f1';
  };

  // Handle back button - prevent app from closing, Dashboard is the last screen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Prevent default back behavior - Dashboard is the root screen
        return true; // Return true to prevent default back action
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [])
  );

  useEffect(() => {
    // Only load data if user is authenticated and token exists
    if (isAuthenticated && user && user._id && token) {
      loadData();
      if (isDirector) {
        loadFilterOptions();
      }
    }
  }, [user, isAuthenticated, token, dateFilter, customDateRange, selectedEmployee, selectedHOD, selectedDepartment]);

  useEffect(() => {
    // Load activities when date filter changes
    if (isAuthenticated && user && user._id && token) {
      loadTodayActivities();
    }
  }, [dateFilter, customDateRange, isAuthenticated, user, token]);

  // Filter HODs and Employees based on selected department
  useEffect(() => {
    if (isDirector && selectedDepartment) {
      // Filter HODs by department
      const deptHods = allHods.filter(hod => {
        // Extract department from label like "Dr. Sarah Johnson (General Medicine)"
        const match = hod.label.match(/\(([^)]+)\)/);
        return match && match[1] === selectedDepartment;
      });
      setFilteredHods(deptHods);

      // Filter Employees by department
      const deptEmployees = allEmployees.filter(emp => {
        // Extract department from label like "John Smith (General Medicine)"
        const match = emp.label.match(/\(([^)]+)\)/);
        return match && match[1] === selectedDepartment;
      });
      setFilteredEmployees(deptEmployees);
    } else {
      // Clear filtered lists when no department is selected
      setFilteredHods([]);
      setFilteredEmployees([]);
    }
  }, [selectedDepartment, allHods, allEmployees, isDirector]);

  const getDateRange = () => {
    const now = new Date();
    let fromDate = null;
    let toDate = null;

    switch (dateFilter) {
      case 'today':
        fromDate = new Date(now);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setDate(toDate.getDate() - 1);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'tomorrow':
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() + 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setDate(toDate.getDate() + 1);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 7);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        fromDate = new Date(now);
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          fromDate = new Date(customDateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date(customDateRange.to);
          toDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        // 'all' - no date filter
        return {};
    }

    if (fromDate && toDate) {
      return {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      };
    }
    return {};
  };

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchTasks()),
      loadStats(),
    ]);
  };

  const loadFilterOptions = async () => {
    if (!isDirector) return;
    
    setLoadingFilters(true);
    try {
      // Load departments
      const deptResponse = await departmentAPI.getDepartments();
      const depts = deptResponse.data.data.departments || deptResponse.data.departments || [];
      setDepartments(depts.map(dept => ({
        label: dept.name,
        value: dept.name
      })));

      // Load all HODs (we'll filter by department later)
      const hodResponse = await userAPI.getUsersForAssignment({ role: 'HOD' });
      const hodUsers = hodResponse.data.data.users || hodResponse.data.users || [];
      const hodList = hodUsers.map(hod => ({
        label: `${hod.name} (${hod.department})`,
        value: hod._id
      }));
      setAllHods(hodList);

      // Load all employees (we'll filter by department later)
      const empResponse = await userAPI.getUsersForAssignment({ role: 'EMPLOYEE' });
      const empUsers = empResponse.data.data.users || empResponse.data.users || [];
      const empList = empUsers.map(emp => ({
        label: `${emp.name} (${emp.department})`,
        value: emp._id
      }));
      setAllEmployees(empList);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadStats = async () => {
    try {
      const dateRange = getDateRange();
      const params = { ...dateRange };
      
      // Filter stats by due date (not creation date) for task cards and statistics
      params.filterByDueDate = 'true';
      
      // Add Director-only filters
      // Department must be selected first, then HOD or Employee
      if (isDirector) {
        if (selectedDepartment) {
          params.department = selectedDepartment;
        }
        if (selectedEmployee) {
          params.employeeId = selectedEmployee;
        }
        if (selectedHOD) {
          params.hodId = selectedHOD;
        }
      }
      
      const response = await reportAPI.getStats(params);
      // Backend returns: { success, message, data: { stats }, errors }
      setStats(response.data.data.stats || response.data.stats);
    } catch (error) {
      // Don't log 401 errors - they're handled by the interceptor
      if (error.response?.status !== 401) {
        console.error('Error loading stats:', error);
      }
      // Set default stats on error
      setStats({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0
      });
    }
  };

  const loadTodayActivities = async () => {
    try {
      setLoadingActivities(true);
      
      // Get date range based on selected filter
      const getActivityDateRange = () => {
        const now = new Date();
        let fromDate = null;
        let toDate = null;

        switch (dateFilter) {
          case 'today':
            fromDate = new Date(now);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(now);
            toDate.setHours(23, 59, 59, 999);
            break;
          case 'yesterday':
            fromDate = new Date(now);
            fromDate.setDate(fromDate.getDate() - 1);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(now);
            toDate.setDate(toDate.getDate() - 1);
            toDate.setHours(23, 59, 59, 999);
            break;
          case 'tomorrow':
            fromDate = new Date(now);
            fromDate.setDate(fromDate.getDate() + 1);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(now);
            toDate.setDate(toDate.getDate() + 1);
            toDate.setHours(23, 59, 59, 999);
            break;
          case 'week':
            fromDate = new Date(now);
            fromDate.setDate(fromDate.getDate() - 7);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(now);
            toDate.setHours(23, 59, 59, 999);
            break;
          case 'month':
            fromDate = new Date(now);
            fromDate.setMonth(fromDate.getMonth() - 1);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(now);
            toDate.setHours(23, 59, 59, 999);
            break;
          case 'year':
            fromDate = new Date(now);
            fromDate.setFullYear(fromDate.getFullYear() - 1);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(now);
            toDate.setHours(23, 59, 59, 999);
            break;
          case 'custom':
            if (customDateRange.from && customDateRange.to) {
              fromDate = new Date(customDateRange.from);
              fromDate.setHours(0, 0, 0, 0);
              toDate = new Date(customDateRange.to);
              toDate.setHours(23, 59, 59, 999);
            }
            break;
          default:
            // 'all' - no date filter, but we'll use a large range
            fromDate = new Date(0);
            toDate = new Date();
            toDate.setHours(23, 59, 59, 999);
        }

        return { fromDate, toDate };
      };

      const { fromDate, toDate } = getActivityDateRange();

      // If "tomorrow" is selected, don't show any activities (activities are past events)
      if (dateFilter === 'tomorrow') {
        setTodayActivities([]);
        setLoadingActivities(false);
        return;
      }

      // Fetch tasks - don't filter by date at API level, we'll filter activities by their timestamps
      // For "today" filter, fetch tasks from last 7 days to catch recent activities
      const params = {};
      
      if (dateFilter === 'all') {
        // No date filter for "all"
      } else if (dateFilter === 'today' || dateFilter === 'yesterday') {
        // For today/yesterday, fetch tasks from last 7 days to catch recent activities
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.startDate = weekAgo.toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        // For week, fetch tasks from last 30 days
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        params.startDate = monthAgo.toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        // For month, fetch tasks from last 90 days
        const quarterAgo = new Date();
        quarterAgo.setDate(quarterAgo.getDate() - 90);
        params.startDate = quarterAgo.toISOString().split('T')[0];
      } else if (dateFilter === 'custom' && customDateRange.from && customDateRange.to) {
        // For custom, use the custom range but extend it a bit
        const customFrom = new Date(customDateRange.from);
        customFrom.setDate(customFrom.getDate() - 7);
        params.startDate = customFrom.toISOString().split('T')[0];
        params.endDate = new Date(customDateRange.to).toISOString().split('T')[0];
      }

      const response = await taskAPI.getTasks(params);
      const tasks = response.data.data?.tasks || response.data.tasks || [];

      // Process tasks to extract activities - filter by activity timestamps, not task creation
      const activities = [];
      
      tasks.forEach(task => {
        // Add task creation as activity - filter by creation timestamp
        if (task.createdAt) {
          const createdDate = new Date(task.createdAt);
          // Check if creation date falls within the selected range
          if (!fromDate || !toDate || (createdDate >= fromDate && createdDate <= toDate)) {
            activities.push({
              id: `task-created-${task._id}`,
              type: 'task_created',
              taskId: task._id,
              taskTitle: task.title,
              message: `Task "${task.title}" was created`,
              user: task.assignedBy?.name || 'System',
              timestamp: task.createdAt,
              status: task.status,
            });
          }
        }

        // Add task updates (comments, status changes) - filter by update timestamp
        if (task.updates && Array.isArray(task.updates)) {
          task.updates.forEach((update, index) => {
            const updateDate = new Date(update.createdAt || update.timestamp || update.updatedAt);
            // Check if update date falls within the selected range
            if (!fromDate || !toDate || (updateDate >= fromDate && updateDate <= toDate)) {
              let message = '';
              if (update.previousStatus && update.status && update.previousStatus !== update.status) {
                message = `Status changed from ${update.previousStatus} to ${update.status}`;
                if (update.comment) {
                  message += `: ${update.comment}`;
                } else if (update.remarks) {
                  message += `: ${update.remarks}`;
                }
              } else if (update.comment) {
                message = update.comment;
              } else if (update.remarks) {
                message = update.remarks;
              } else if (update.status) {
                message = `Status updated to ${update.status}`;
              }

              if (message) {
                activities.push({
                  id: `update-${task._id}-${update._id || index}`,
                  type: 'task_update',
                  taskId: task._id,
                  taskTitle: task.title,
                  message: message,
                  user: update.updatedBy?.name || task.assignedTo?.name || 'Unknown',
                  timestamp: update.createdAt || update.timestamp || update.updatedAt,
                  status: update.status || task.status,
                  previousStatus: update.previousStatus,
                });
              }
            }
          });
        }

        // Add completion as activity - filter by completion timestamp
        if (task.completedAt) {
          const completedDate = new Date(task.completedAt);
          // Check if completion date falls within the selected range
          if (!fromDate || !toDate || (completedDate >= fromDate && completedDate <= toDate)) {
            activities.push({
              id: `task-completed-${task._id}`,
              type: 'task_completed',
              taskId: task._id,
              taskTitle: task.title,
              message: `Task "${task.title}" was completed`,
              user: task.assignedTo?.name || 'System',
              timestamp: task.completedAt,
              status: 'COMPLETED',
            });
          }
        }
      });

      // Sort activities by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setTodayActivities(activities);
    } catch (error) {
      console.error('Error loading today activities:', error);
      setTodayActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadTodayActivities();
    setRefreshing(false);
  };

  const handleCustomDateApply = () => {
    if (!customDateRange.from || !customDateRange.to) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }
    if (new Date(customDateRange.from) > new Date(customDateRange.to)) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }
    setShowCustomDateModal(false);
    setDateFilter('custom');
  };


  // Prepare chart data
  const chartData = [
    stats?.pending || 0,
    stats?.inProgress || 0,
    stats?.completed || 0,
    stats?.cancelled || 0
  ];
  const chartLabels = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

  const filterButtons = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            {/* First Row: Dashboard Title + Welcome Message | Three Menu Items */}
            <View style={styles.headerFirstRow}>
              <View style={styles.headerLeft}>
                <Text style={[styles.dashboardTitle, { color: theme.colors.text }]}>
                  Dashboard
                </Text>
                <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>
                  Welcome back, {user?.name || 'User'}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  onPress={() => {
                    if (isDirector) {
                      setShowFilterModal(true);
                    }
                  }}
                  style={styles.menuIconButton}
                >
                  <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (isDirector) {
                      setShowFilterModal(true);
                    }
                  }}
                  style={styles.menuIconButton}
                >
                  <Ionicons name="search-outline" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (isDirector) {
                      setShowFilterModal(true);
                    }
                  }}
                  style={styles.menuIconButton}
                >
                  <Ionicons name="menu" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Second Row: All Filter Buttons */}
            <View style={styles.filterButtonsContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterButtonsScrollContent}
              >
                {filterButtons
                  .filter(filter => filter.value !== 'week') // Remove "This Week"
                  .map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor: dateFilter === filter.value 
                          ? theme.colors.primary 
                          : 'transparent',
                      }
                    ]}
                    onPress={() => {
                      if (filter.value === 'custom') {
                        setShowCustomDateModal(true);
                      } else {
                        setDateFilter(filter.value);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        {
                          color: dateFilter === filter.value 
                            ? '#ffffff' 
                            : theme.colors.textSecondary,
                        }
                      ]}
                    >
                      {filter.label === 'This Month' ? 'Month' :
                       filter.label === 'This Year' ? 'Year' :
                       filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Task Stats Cards - Redesigned */}
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={[styles.statIconContainer, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="time-outline" size={18} color="#6366f1" />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {String(stats?.pending || 0).padStart(2, '0')}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  PENDING
                </Text>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={[styles.statIconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="refresh-outline" size={18} color="#3b82f6" />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {String(stats?.inProgress || 0).padStart(2, '0')}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  ACTIVE
                </Text>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={[styles.statIconContainer, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                </View>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {String(stats?.completed || 0).padStart(2, '0')}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  DONE
                </Text>
              </View>
            </Card>
          </View>

        {/* Bar Chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Task Statistics
            </Text>
            <TouchableOpacity style={styles.performanceLink}>
              <Text style={[styles.performanceText, { color: theme.colors.textSecondary }]}>
                Performance
              </Text>
              <Ionicons name="trending-up" size={16} color={theme.colors.textSecondary} style={styles.performanceIcon} />
            </TouchableOpacity>
          </View>
          <View style={styles.chartContainer}>
            <BarChart data={chartData} labels={chartLabels} />
          </View>
        </Card>

        {/* Quick Actions Grid */}
        <Card style={styles.quickActionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {/* Tasks */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Tasks')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: getIconColor('tasks') + '20' }]}>
                <Ionicons name="checkmark-circle" size={32} color={getIconColor('tasks')} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Tasks</Text>
            </TouchableOpacity>

            {/* Approvals - Only for Directors */}
            {isDirector && (
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => navigation.navigate('Approvals')}
              >
                <View style={[styles.quickActionIconContainer, { backgroundColor: getIconColor('approvals') + '20' }]}>
                  <Ionicons name="checkmark-done" size={32} color={getIconColor('approvals')} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Approvals</Text>
              </TouchableOpacity>
            )}

            {/* Reports */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Reports')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: getIconColor('reports') + '20' }]}>
                <Ionicons name="bar-chart" size={32} color={getIconColor('reports')} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Reports</Text>
            </TouchableOpacity>

            {/* Diary */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Diary')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: getIconColor('diary') + '20' }]}>
                <Ionicons name="calendar" size={32} color={getIconColor('diary')} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Diary</Text>
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: getIconColor('alerts') + '20' }]}>
                <Ionicons name="notifications" size={32} color={getIconColor('alerts')} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Notifications</Text>
            </TouchableOpacity>

            {/* Activity */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Activity')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: getIconColor('activity') + '20' }]}>
                <Ionicons name="time" size={32} color={getIconColor('activity')} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Activity</Text>
            </TouchableOpacity>

            {/* Departments - Director only */}
            {user?.role === 'DIRECTOR' && (
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => navigation.navigate('DepartmentManagement')}
              >
                <View style={[styles.quickActionIconContainer, { backgroundColor: getIconColor('departments') + '20' }]}>
                  <Ionicons name="business" size={32} color={getIconColor('departments')} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Departments</Text>
              </TouchableOpacity>
            )}

            {/* Users - Director only */}
            {user?.role === 'DIRECTOR' && (
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => navigation.navigate('UserManagement')}
              >
                <View style={[styles.quickActionIconContainer, { backgroundColor: getIconColor('users') + '20' }]}>
                  <Ionicons name="people" size={32} color={getIconColor('users')} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Users</Text>
              </TouchableOpacity>
            )}

          </View>
        </Card>

        {/* Today's Activity Section */}
        <Card style={styles.activityCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>
            {dateFilter === 'today' ? "Today's Activity" : 
             dateFilter === 'yesterday' ? "Yesterday's Activity" :
             dateFilter === 'tomorrow' ? "Tomorrow's Activity" :
             dateFilter === 'week' ? "This Week's Activity" :
             dateFilter === 'month' ? "This Month's Activity" :
             dateFilter === 'year' ? "This Year's Activity" :
             dateFilter === 'custom' ? "Custom Date Activity" :
             "All Activity"}
          </Text>
          {loadingActivities ? (
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading activities...
            </Text>
          ) : todayActivities.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No activities for selected period
            </Text>
          ) : (
            <View style={styles.activitiesList}>
              {todayActivities.slice(0, 20).map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index !== Math.min(todayActivities.length, 20) - 1 && styles.activityItemBorder,
                    { borderBottomColor: theme.colors.border }
                  ]}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: activity.taskId })}
                >
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={[styles.activityTaskTitle, { color: theme.colors.text }]}>
                        {activity.taskTitle}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        {
                          backgroundColor: 
                            activity.status === 'COMPLETED' ? '#10b981' :
                            activity.status === 'IN_PROGRESS' ? theme.colors.info :
                            activity.status === 'CANCELLED' ? theme.colors.error :
                            theme.colors.primary + '20'
                        }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          {
                            color: 
                              activity.status === 'COMPLETED' ? '#ffffff' :
                              activity.status === 'IN_PROGRESS' ? '#ffffff' :
                              activity.status === 'CANCELLED' ? '#ffffff' :
                              theme.colors.primary
                          }
                        ]}>
                          {activity.status || 'PENDING'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.activityMessage, { color: theme.colors.textSecondary }]}>
                      {activity.message}
                    </Text>
                    <View style={styles.activityFooter}>
                      <Text style={[styles.activityUser, { color: theme.colors.textSecondary }]}>
                        {activity.user}
                      </Text>
                      <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
                        {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
              {todayActivities.length > 20 && (
                <TouchableOpacity
                  style={[styles.viewAllButton, { borderColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('Activity')}
                >
                  <Text style={[styles.viewAllButtonText, { color: theme.colors.primary }]}>
                    View All ({todayActivities.length} activities)
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>
      </View>

      {/* Filter Modal */}
      {isDirector && (
        <Modal
          visible={showFilterModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFilterModal(false)}
          statusBarTranslucent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Filter Options
                </Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Date Filter Buttons in Modal */}
                <Text style={[styles.modalSectionTitle, { color: theme.colors.text, marginBottom: 12 }]}>
                  Time Filter
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterContainer}
                  contentContainerStyle={styles.filterContent}
                >
                  {filterButtons.map((filter) => (
                    <TouchableOpacity
                      key={filter.value}
                      style={[
                        styles.modalFilterButton,
                        {
                          backgroundColor: dateFilter === filter.value 
                            ? theme.colors.primary 
                            : theme.colors.surface,
                          borderColor: dateFilter === filter.value 
                            ? theme.colors.primary 
                            : theme.colors.border,
                        }
                      ]}
                      onPress={() => {
                        if (filter.value === 'custom') {
                          setShowCustomDateModal(true);
                        } else {
                          setDateFilter(filter.value);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.modalFilterButtonText,
                          {
                            color: dateFilter === filter.value 
                              ? '#ffffff' 
                              : theme.colors.text,
                          }
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Director-only Filters */}
                <Text style={[styles.modalSectionTitle, { color: theme.colors.text, marginTop: 24, marginBottom: 12 }]}>
                  Filter By
                </Text>
                
                <Picker
                  label="Department *"
                  selectedValue={selectedDepartment}
                  onValueChange={(value) => {
                    setSelectedDepartment(value);
                    // Clear employee and HOD when department changes
                    setSelectedEmployee('');
                    setSelectedHOD('');
                  }}
                  items={[
                    { label: 'Select Department', value: '' },
                    ...departments
                  ]}
                  placeholder="Select department first"
                  required
                />

                <Picker
                  label="HOD (Head of Department)"
                  selectedValue={selectedHOD}
                  onValueChange={(value) => {
                    setSelectedHOD(value);
                    // Clear employee when HOD is selected
                    setSelectedEmployee('');
                  }}
                  items={filteredHods}
                  placeholder={selectedDepartment ? (filteredHods.length > 0 ? 'Select HOD' : 'No HODs in this department') : 'Select department first'}
                  disabled={loadingFilters || !selectedDepartment || filteredHods.length === 0}
                />

                <Picker
                  label="Employee"
                  selectedValue={selectedEmployee}
                  onValueChange={(value) => {
                    setSelectedEmployee(value);
                    // Clear HOD when employee is selected
                    setSelectedHOD('');
                  }}
                  items={filteredEmployees}
                  placeholder={selectedDepartment ? (filteredEmployees.length > 0 ? 'Select employee' : 'No employees in this department') : 'Select department first'}
                  disabled={loadingFilters || !selectedDepartment || filteredEmployees.length === 0}
                />

                {(selectedEmployee || selectedHOD || selectedDepartment) && (
                  <TouchableOpacity
                    style={[styles.clearFiltersButton, { borderColor: theme.colors.error }]}
                    onPress={() => {
                      setSelectedEmployee('');
                      setSelectedHOD('');
                      setSelectedDepartment('');
                    }}
                  >
                    <Text style={[styles.clearFiltersText, { color: theme.colors.error }]}>
                      Clear All Filters
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: theme.colors.primary, marginTop: 16 }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomDateModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Custom Date Range
              </Text>
              <TouchableOpacity onPress={() => setShowCustomDateModal(false)}>
                <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <DatePicker
                label="From Date *"
                value={customDateRange.from}
                onChange={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                placeholder="Select start date"
                required
              />
              <DatePicker
                label="To Date *"
                value={customDateRange.to}
                onChange={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                placeholder="Select end date"
                minimumDate={customDateRange.from || new Date()}
                required
              />
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCustomDateApply}
              >
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  filterIconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 20,
    paddingTop: 12,
  },
  headerFirstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1e293b',
    lineHeight: 34,
  },
  welcomeText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  menuIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonsContainer: {
    marginTop: 4,
  },
  filterButtonsScrollContent: {
    paddingRight: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 16,
  },
  modalFilterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
  },
  modalFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    marginBottom: 0,
    minHeight: 100,
  },
  statCardContent: {
    alignItems: 'flex-start',
    width: '100%',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1e293b',
    lineHeight: 42,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chartCard: {
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartContainer: {
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  performanceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  performanceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  performanceIcon: {
    marginLeft: 2,
  },
  quickActionsCard: {
    marginTop: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  quickActionItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
    marginRight: '3.33%',
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearFiltersButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    marginTop: 16,
    marginBottom: 16,
  },
  activitiesList: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
  },
  activityContent: {
    flex: 1,
    marginRight: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  activityMessage: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityUser: {
    fontSize: 12,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
});
