import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { taskAPI, userAPI, departmentAPI } from '../../services/api';
import Card from '../../common/components/Card';
import TopBar from '../../common/components/TopBar';
import { useTheme } from '../../common/theme/ThemeContext';

export default function ActivityScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  
  const theme = useTheme();

  useEffect(() => {
    if (isAuthenticated && user && user._id && token) {
      loadActivities();
    }
  }, [isAuthenticated, user, token, dateFilter, customDateRange]);

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
        fromDate = new Date(0);
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
    }

    return { fromDate, toDate };
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // Get date range based on selected filter - use nested function like Dashboard
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
        setActivities([]);
        setLoading(false);
        setRefreshing(false);
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

      // Fetch all data in parallel
      const [tasksResponse, usersResponse, departmentsResponse] = await Promise.all([
        taskAPI.getTasks(params).catch(() => ({ data: { data: { tasks: [] }, tasks: [] } })),
        userAPI.getUsers().catch(() => ({ data: { data: { users: [] }, users: [] } })),
        departmentAPI.getDepartments().catch(() => ({ data: { data: { departments: [] }, departments: [] } })),
      ]);

      let tasks = tasksResponse.data.data?.tasks || tasksResponse.data.tasks || [];
      let users = usersResponse.data.data?.users || usersResponse.data.users || [];
      let departments = departmentsResponse.data.data?.departments || departmentsResponse.data.departments || [];

      // Filter by department for employees - only show activities related to their department
      if (user?.role === 'EMPLOYEE' && user?.department) {
        const employeeDepartment = user.department;
        
        // Filter tasks by department
        tasks = tasks.filter(task => task.department === employeeDepartment);
        
        // Filter users by department
        users = users.filter(userItem => userItem.department === employeeDepartment);
        
        // Filter departments - only show the employee's own department
        departments = departments.filter(dept => dept.name === employeeDepartment);
      }

      // Process all activities - filter by activity timestamps
      const activitiesList = [];
      
      // Process tasks
      tasks.forEach(task => {
        // Add task creation as activity
        if (task.createdAt) {
          const createdDate = new Date(task.createdAt);
          if (!fromDate || !toDate || (createdDate >= fromDate && createdDate <= toDate)) {
            activitiesList.push({
              id: `task-created-${task._id}`,
              type: 'task_created',
              entityType: 'task',
              entityId: task._id,
              title: task.title,
              message: `Task "${task.title}" was created`,
              user: task.assignedBy?.name || 'System',
              timestamp: task.createdAt,
              status: task.status,
            });
          }
        }

        // Add task updates (comments, status changes)
        if (task.updates && Array.isArray(task.updates)) {
          task.updates.forEach((update, index) => {
            const updateDate = new Date(update.createdAt || update.timestamp || update.updatedAt);
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
                activitiesList.push({
                  id: `task-update-${task._id}-${update._id || index}`,
                  type: 'task_update',
                  entityType: 'task',
                  entityId: task._id,
                  title: task.title,
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

        // Add completion as activity
        if (task.completedAt) {
          const completedDate = new Date(task.completedAt);
          if (!fromDate || !toDate || (completedDate >= fromDate && completedDate <= toDate)) {
            activitiesList.push({
              id: `task-completed-${task._id}`,
              type: 'task_completed',
              entityType: 'task',
              entityId: task._id,
              title: task.title,
              message: `Task "${task.title}" was completed`,
              user: task.assignedTo?.name || 'System',
              timestamp: task.completedAt,
              status: 'COMPLETED',
            });
          }
        }
      });

      // Process users
      users.forEach(userItem => {
        // Add user creation as activity
        if (userItem.createdAt) {
          const createdDate = new Date(userItem.createdAt);
          if (!fromDate || !toDate || (createdDate >= fromDate && createdDate <= toDate)) {
            activitiesList.push({
              id: `user-created-${userItem._id}`,
              type: 'user_created',
              entityType: 'user',
              entityId: userItem._id,
              title: userItem.name,
              message: `User "${userItem.name}" (${userItem.email}) was created`,
              user: 'System',
              timestamp: userItem.createdAt,
              role: userItem.role,
            });
          }
        }

        // Add user update as activity (if updatedAt is significantly different from createdAt)
        if (userItem.updatedAt && userItem.createdAt) {
          const updatedDate = new Date(userItem.updatedAt);
          const createdDate = new Date(userItem.createdAt);
          // Only add update activity if updated more than 1 second after creation
          if (updatedDate.getTime() - createdDate.getTime() > 1000) {
            if (!fromDate || !toDate || (updatedDate >= fromDate && updatedDate <= toDate)) {
              const wasBlocked = userItem.isActive === false || userItem.isActive === 'false';
              activitiesList.push({
                id: `user-updated-${userItem._id}-${updatedDate.getTime()}`,
                type: wasBlocked ? 'user_blocked' : 'user_updated',
                entityType: 'user',
                entityId: userItem._id,
                title: userItem.name,
                message: wasBlocked 
                  ? `User "${userItem.name}" (${userItem.email}) was blocked`
                  : `User "${userItem.name}" (${userItem.email}) was updated`,
                user: 'System',
                timestamp: userItem.updatedAt,
                role: userItem.role,
                isActive: userItem.isActive,
              });
            }
          }
        }
      });

      // Process departments
      departments.forEach(dept => {
        // Add department creation as activity
        if (dept.createdAt) {
          const createdDate = new Date(dept.createdAt);
          if (!fromDate || !toDate || (createdDate >= fromDate && createdDate <= toDate)) {
            activitiesList.push({
              id: `dept-created-${dept._id}`,
              type: 'department_created',
              entityType: 'department',
              entityId: dept._id,
              title: dept.name,
              message: `Department "${dept.name}"${dept.code ? ` (${dept.code})` : ''} was created`,
              user: 'System',
              timestamp: dept.createdAt,
            });
          }
        }

        // Add department update as activity (if updatedAt is significantly different from createdAt)
        if (dept.updatedAt && dept.createdAt) {
          const updatedDate = new Date(dept.updatedAt);
          const createdDate = new Date(dept.createdAt);
          // Only add update activity if updated more than 1 second after creation
          if (updatedDate.getTime() - createdDate.getTime() > 1000) {
            if (!fromDate || !toDate || (updatedDate >= fromDate && updatedDate <= toDate)) {
              const isBlocked = dept.isActive === false || dept.isActive === 'false';
              
              // If department is blocked, only show blocked activity, not updated
              if (isBlocked) {
                activitiesList.push({
                  id: `dept-blocked-${dept._id}-${updatedDate.getTime()}`,
                  type: 'department_blocked',
                  entityType: 'department',
                  entityId: dept._id,
                  title: dept.name,
                  message: `Department "${dept.name}" was blocked`,
                  user: 'System',
                  timestamp: dept.updatedAt,
                  isActive: dept.isActive,
                });
              } else {
                // Only show updated activity if department is active
                activitiesList.push({
                  id: `dept-updated-${dept._id}-${updatedDate.getTime()}`,
                  type: 'department_updated',
                  entityType: 'department',
                  entityId: dept._id,
                  title: dept.name,
                  message: `Department "${dept.name}" was updated`,
                  user: 'System',
                  timestamp: dept.updatedAt,
                  isActive: dept.isActive,
                });
              }
            }
          }
        }
      });

      // Sort activities by timestamp (newest first)
      activitiesList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Deduplicate activities: if same entity has multiple activities within 5 seconds, keep only the most significant one
      // Priority: blocked > created > updated
      const deduplicatedActivities = [];
      const activityMap = new Map();
      
      activitiesList.forEach(activity => {
        const key = `${activity.entityType}-${activity.entityId}`;
        const existing = activityMap.get(key);
        
        if (!existing) {
          activityMap.set(key, activity);
          deduplicatedActivities.push(activity);
        } else {
          // Check if activities are within 5 seconds of each other
          const timeDiff = Math.abs(new Date(activity.timestamp) - new Date(existing.timestamp));
          if (timeDiff < 5000) {
            // Within 5 seconds - keep the more significant activity
            const priority = {
              'department_blocked': 3,
              'user_blocked': 3,
              'department_created': 2,
              'user_created': 2,
              'task_created': 2,
              'task_completed': 2,
              'department_updated': 1,
              'user_updated': 1,
              'task_update': 1,
            };
            
            const currentPriority = priority[activity.type] || 0;
            const existingPriority = priority[existing.type] || 0;
            
            if (currentPriority > existingPriority) {
              // Replace with higher priority activity
              const index = deduplicatedActivities.indexOf(existing);
              if (index !== -1) {
                deduplicatedActivities[index] = activity;
                activityMap.set(key, activity);
              }
            }
          } else {
            // More than 5 seconds apart - keep both
            activityMap.set(key, activity);
            deduplicatedActivities.push(activity);
          }
        }
      });
      
      // Re-sort after deduplication
      deduplicatedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(deduplicatedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const filterButtons = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'task_created':
        return 'add-circle';
      case 'task_update':
        return 'create';
      case 'task_completed':
        return 'checkmark-circle';
      case 'user_created':
        return 'person-add';
      case 'user_updated':
        return 'person';
      case 'user_blocked':
        return 'ban';
      case 'department_created':
        return 'business';
      case 'department_updated':
        return 'pencil';
      case 'department_blocked':
        return 'ban';
      default:
        return 'notifications';
    }
  };

  const getActivityIconColor = (type) => {
    switch (type) {
      case 'task_created':
        return theme.colors.primary;
      case 'task_update':
        return theme.colors.info;
      case 'task_completed':
        return '#10b981';
      case 'user_created':
        return '#10b981';
      case 'user_updated':
        return theme.colors.info;
      case 'user_blocked':
        return theme.colors.error;
      case 'department_created':
        return '#10b981';
      case 'department_updated':
        return theme.colors.info;
      case 'department_blocked':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const handleActivityPress = (item) => {
    if (item.entityType === 'task') {
      navigation.navigate('TaskDetail', { taskId: item.entityId });
    } else if (item.entityType === 'user') {
      // Navigate to user detail if available, or do nothing
      // navigation.navigate('UserDetail', { userId: item.entityId });
    } else if (item.entityType === 'department') {
      // Navigate to department detail if available, or do nothing
      // navigation.navigate('DepartmentDetail', { departmentId: item.entityId });
    }
  };

  const renderActivityItem = ({ item, index }) => {
    const isTask = item.entityType === 'task';
    const iconName = getActivityIcon(item.type);
    const iconColor = getActivityIconColor(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.activityItem,
          index !== activities.length - 1 && styles.activityItemBorder,
          { borderBottomColor: theme.colors.border }
        ]}
        onPress={() => handleActivityPress(item)}
        disabled={!isTask}
      >
        <View style={styles.activityIconContainer}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            {item.status && (
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: 
                    item.status === 'COMPLETED' ? '#10b981' :
                    item.status === 'IN_PROGRESS' ? theme.colors.info :
                    item.status === 'CANCELLED' ? theme.colors.error :
                    theme.colors.primary + '20'
                }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  {
                    color: 
                      item.status === 'COMPLETED' ? '#ffffff' :
                      item.status === 'IN_PROGRESS' ? '#ffffff' :
                      item.status === 'CANCELLED' ? '#ffffff' :
                      theme.colors.primary
                  }
                ]}>
                  {item.status || 'PENDING'}
                </Text>
              </View>
            )}
            {item.role && (
              <View style={[
                styles.roleBadge,
                { backgroundColor: theme.colors.primary + '20' }
              ]}>
                <Text style={[
                  styles.roleBadgeText,
                  { color: theme.colors.primary }
                ]}>
                  {item.role}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.activityMessage, { color: theme.colors.textSecondary }]}>
            {item.message}
          </Text>
          <View style={styles.activityFooter}>
            <Text style={[styles.activityUser, { color: theme.colors.textSecondary }]}>
              {item.user}
            </Text>
            <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
              {new Date(item.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
        {isTask && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Top Bar */}
        <TopBar title="Activity" />
        <View style={styles.content}>
          {/* Date Filter Buttons */}
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
                  styles.filterButton,
                  {
                    backgroundColor: dateFilter === filter.value 
                      ? theme.colors.primary 
                      : theme.colors.surface,
                    borderColor: dateFilter === filter.value 
                      ? theme.colors.primary 
                      : theme.colors.border,
                  }
                ]}
                onPress={() => setDateFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
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

          {/* Activities List */}
          <Card style={styles.activitiesCard}>
            {loading && activities.length === 0 ? (
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading activities...
              </Text>
            ) : activities.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No activities for selected period
              </Text>
            ) : (
              <FlatList
                data={activities}
                renderItem={renderActivityItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListFooterComponent={
                  <Text style={[styles.activityCount, { color: theme.colors.textSecondary }]}>
                    {activities.length} {activities.length === 1 ? 'activity' : 'activities'} found
                  </Text>
                }
              />
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activitiesCard: {
    marginTop: 8,
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
  activityIconContainer: {
    marginRight: 12,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  activityCount: {
    fontSize: 12,
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
});

