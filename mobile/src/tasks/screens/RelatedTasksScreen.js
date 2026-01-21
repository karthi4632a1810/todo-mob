import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { taskAPI } from '../../services/api';
import Card from '../../common/components/Card';
import { useTheme } from '../../common/theme/ThemeContext';

export default function RelatedTasksScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId, department, assignedTo } = route.params || {};
  const theme = useTheme();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);

  useEffect(() => {
    loadRelatedTasks();
    if (taskId) {
      loadCurrentTask();
    }
  }, [taskId, department, assignedTo]);

  const loadCurrentTask = async () => {
    if (!taskId) return;
    try {
      const response = await taskAPI.getTaskById(taskId);
      if (response.data.success && response.data.data?.task) {
        setCurrentTask(response.data.data.task);
      }
    } catch (error) {
      console.error('Error loading current task:', error);
    }
  };

  const loadRelatedTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (department) {
        params.departmentId = department;
      }
      
      if (assignedTo) {
        params.assignedTo = assignedTo;
      }

      const response = await taskAPI.getTasks(params);
      const tasksList = response.data.data?.tasks || response.data.tasks || [];
      
      // Filter out the current task if taskId is provided
      const filteredTasks = taskId 
        ? tasksList.filter(t => t._id !== taskId)
        : tasksList;
      
      setTasks(filteredTasks);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading related tasks:', error);
        Alert.alert('Error', 'Failed to load related tasks');
      }
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRelatedTasks();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return '#10b981';
      case 'IN_PROGRESS':
        return '#3b82f6';
      case 'CANCELLED':
      case 'BLOCKED':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return '#ef4444';
      case 'MEDIUM':
        return '#f59e0b';
      case 'LOW':
        return '#10b981';
      default:
        return theme.colors.textSecondary;
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
          <Text style={styles.headerTitle}>Related Tasks</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Current Task Info */}
          {currentTask && (
            <Card style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                  Showing tasks related to:
                </Text>
              </View>
              <Text style={[styles.infoText, { color: theme.colors.text }]}>
                {currentTask.title}
              </Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                  Department: {currentTask.department}
                </Text>
              </View>
              {currentTask.assignedTo && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                    Assigned To: {currentTask.assignedTo.name || 'N/A'}
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Related Tasks List */}
          {loading && !refreshing ? (
            <Card>
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading related tasks...
              </Text>
            </Card>
          ) : tasks.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No related tasks found
              </Text>
            </Card>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Related Tasks ({tasks.length})
              </Text>
              {tasks.map((task) => (
                <TouchableOpacity
                  key={task._id}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task._id })}
                >
                  <Card style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
                        {task.title}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(task.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: getStatusColor(task.status) },
                          ]}
                        >
                          {task.status}
                        </Text>
                      </View>
                    </View>
                    {task.description && (
                      <Text
                        style={[styles.taskDescription, { color: theme.colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {task.description}
                      </Text>
                    )}
                    <View style={styles.taskFooter}>
                      <View style={styles.taskMeta}>
                        <View
                          style={[
                            styles.priorityBadge,
                            { backgroundColor: getPriorityColor(task.priority) + '20' },
                          ]}
                        >
                          <Ionicons
                            name="flag"
                            size={12}
                            color={getPriorityColor(task.priority)}
                            style={styles.priorityIcon}
                          />
                          <Text
                            style={[
                              styles.priorityText,
                              { color: getPriorityColor(task.priority) },
                            ]}
                          >
                            {task.priority}
                          </Text>
                        </View>
                        <Text style={[styles.departmentText, { color: theme.colors.textSecondary }]}>
                          {task.department}
                        </Text>
                      </View>
                      {task.dueDate && (
                        <Text style={[styles.dueDateText, { color: theme.colors.textSecondary }]}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </ScrollView>
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
  infoCard: {
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoRow: {
    marginTop: 4,
  },
  infoLabel: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
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
  taskCard: {
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityIcon: {
    marginRight: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  departmentText: {
    fontSize: 12,
  },
  dueDateText: {
    fontSize: 12,
  },
});

