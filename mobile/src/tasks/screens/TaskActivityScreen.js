import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  BackHandler,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { taskAPI } from '../../services/api';
import Card from '../../common/components/Card';
import DatePicker from '../../common/components/DatePicker';
import { useTheme } from '../../common/theme/ThemeContext';

export default function TaskActivityScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const theme = useTheme();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('today'); // 'all', 'today', 'yesterday', 'week', 'month', 'year', 'custom'
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  // Handle back button - navigate to Dashboard instead of white screen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Dashboard', { screen: 'DashboardMain' });
        return true; // Prevent default back action
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [navigation])
  );

  useEffect(() => {
    if (isAuthenticated && user && token) {
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

  const loadActivities = async () => {
    setLoading(true);
    try {
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

      // Fetch all tasks (don't filter by date at API level - we'll filter activities by their timestamps)
      // For "all" filter, fetch all tasks. For date filters, fetch a broader range to catch activities
      const params = {};
      
      // Only apply date filter for "all" to limit results, otherwise fetch broader range
      // This ensures we get tasks that might have activities in the selected period
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

      // Process tasks to extract activities
      const processedActivities = [];

      tasks.forEach(task => {
        // Add task creation as activity - filter by creation timestamp
        if (task.createdAt) {
          const createdDate = new Date(task.createdAt);
          // Check if creation date falls within the selected range
          // Match Dashboard logic exactly: !fromDate || !toDate || (date >= fromDate && date <= toDate)
          if (!fromDate || !toDate || (createdDate >= fromDate && createdDate <= toDate)) {
            processedActivities.push({
              id: `task-created-${task._id}`,
              type: 'task_created',
              taskId: task._id,
              taskTitle: task.title,
              status: task.status,
              message: `Task "${task.title}" was created`,
              user: task.assignedBy?.name || 'Unknown',
              timestamp: task.createdAt,
            });
          }
        }

        // Add task updates/status changes as activities - filter by update timestamp
        if (task.updates && Array.isArray(task.updates)) {
          task.updates.forEach((update, index) => {
            const updateTimestamp = update.createdAt || update.timestamp || update.updatedAt;
            if (!updateTimestamp) return;
            
            const updateDate = new Date(updateTimestamp);
            // Check if update date falls within the selected range
            // Match Dashboard logic: !fromDate || !toDate || (date >= fromDate && date <= toDate)
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
                processedActivities.push({
                  id: `task-update-${task._id}-${update._id || index}`,
                  type: 'task_update',
                  taskId: task._id,
                  taskTitle: task.title,
                  status: update.status || task.status,
                  message: message,
                  user: update.updatedBy?.name || task.assignedTo?.name || 'Unknown',
                  timestamp: updateTimestamp,
                });
              }
            }
          });
        }

        // Add completion as activity - filter by completion timestamp
        if (task.completedAt) {
          const completedDate = new Date(task.completedAt);
          // Check if completion date falls within the selected range
          // Match Dashboard logic: !fromDate || !toDate || (date >= fromDate && date <= toDate)
          if (!fromDate || !toDate || (completedDate >= fromDate && completedDate <= toDate)) {
            processedActivities.push({
              id: `task-completed-${task._id}`,
              type: 'task_completed',
              taskId: task._id,
              taskTitle: task.title,
              status: 'COMPLETED',
              message: `Task "${task.title}" was completed`,
              user: task.assignedTo?.name || 'Unknown',
              timestamp: task.completedAt,
            });
          }
        }
      });

      // Sort by timestamp (most recent first)
      processedActivities.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      setActivities(processedActivities);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading activities:', error);
        Alert.alert('Error', 'Failed to load task activities');
      }
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const getFilterTitle = () => {
    switch (dateFilter) {
      case 'today':
        return "Today's Task Activity";
      case 'yesterday':
        return "Yesterday's Task Activity";
      case 'week':
        return "This Week's Task Activity";
      case 'month':
        return "This Month's Task Activity";
      case 'year':
        return "This Year's Task Activity";
      case 'custom':
        return "Custom Date Task Activity";
      default:
        return "All Task Activity";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return '#10b981';
      case 'IN_PROGRESS':
        return '#3b82f6';
      case 'CANCELLED':
        return '#ef4444';
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Purple Header with Rounded Bottom */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Activity</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Filter Buttons */}
          <Card style={styles.filterCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  dateFilter === 'all' && styles.filterButtonActive,
                  { backgroundColor: dateFilter === 'all' ? theme.colors.primary : '#f3f4f6' },
                ]}
                onPress={() => setDateFilter('all')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: dateFilter === 'all' ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  dateFilter === 'today' && styles.filterButtonActive,
                  { backgroundColor: dateFilter === 'today' ? theme.colors.primary : '#f3f4f6' },
                ]}
                onPress={() => setDateFilter('today')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: dateFilter === 'today' ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  dateFilter === 'yesterday' && styles.filterButtonActive,
                  { backgroundColor: dateFilter === 'yesterday' ? theme.colors.primary : '#f3f4f6' },
                ]}
                onPress={() => setDateFilter('yesterday')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: dateFilter === 'yesterday' ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  Yesterday
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  dateFilter === 'week' && styles.filterButtonActive,
                  { backgroundColor: dateFilter === 'week' ? theme.colors.primary : '#f3f4f6' },
                ]}
                onPress={() => setDateFilter('week')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: dateFilter === 'week' ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  dateFilter === 'month' && styles.filterButtonActive,
                  { backgroundColor: dateFilter === 'month' ? theme.colors.primary : '#f3f4f6' },
                ]}
                onPress={() => setDateFilter('month')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: dateFilter === 'month' ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  dateFilter === 'year' && styles.filterButtonActive,
                  { backgroundColor: dateFilter === 'year' ? theme.colors.primary : '#f3f4f6' },
                ]}
                onPress={() => setDateFilter('year')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: dateFilter === 'year' ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  Year
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  dateFilter === 'custom' && styles.filterButtonActive,
                  { backgroundColor: dateFilter === 'custom' ? theme.colors.primary : '#f3f4f6' },
                ]}
                onPress={() => setShowCustomDateModal(true)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: dateFilter === 'custom' ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Card>

          {/* Activities List */}
          <Card style={styles.activitiesCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>
              {getFilterTitle()}
            </Text>
            {loading && !refreshing ? (
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading activities...
              </Text>
            ) : activities.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No task activities for selected period
              </Text>
            ) : (
              <View style={styles.activitiesList}>
                {activities.map((activity, index) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      styles.activityItem,
                      index !== activities.length - 1 && styles.activityItemBorder,
                      { borderBottomColor: theme.colors.border },
                    ]}
                    onPress={() => navigation.navigate('TaskDetail', { taskId: activity.taskId })}
                  >
                    <View style={styles.activityContent}>
                      <View style={styles.activityHeader}>
                        <Text style={[styles.activityTaskTitle, { color: theme.colors.text }]}>
                          {activity.taskTitle}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(activity.status) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: getStatusColor(activity.status) },
                            ]}
                          >
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
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

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
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Custom Date Range</Text>
              <TouchableOpacity
                onPress={() => setShowCustomDateModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <DatePicker
                label="From Date"
                value={customDateRange.from}
                onChange={(date) => setCustomDateRange({ ...customDateRange, from: date })}
              />
              <DatePicker
                label="To Date"
                value={customDateRange.to}
                onChange={(date) => setCustomDateRange({ ...customDateRange, to: date })}
              />
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  if (customDateRange.from && customDateRange.to) {
                    setDateFilter('custom');
                    setShowCustomDateModal(false);
                  } else {
                    Alert.alert('Error', 'Please select both from and to dates');
                  }
                }}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 20,
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
  headerContent: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  backButtonPlaceholder: {
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  filterCard: {
    marginBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    // Active state handled by backgroundColor
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activitiesCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontStyle: 'italic',
  },
  activitiesList: {
    // Container for activities
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  activityMessage: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityUser: {
    fontSize: 12,
  },
  activityTime: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  applyButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

