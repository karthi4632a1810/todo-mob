import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taskAPI, departmentAPI, userAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Button from '../../common/components/Button';
import Picker from '../../common/components/Picker';
import DatePicker from '../../common/components/DatePicker';
import TopBar from '../../common/components/TopBar';
import FloatingActionButton from '../../common/components/FloatingActionButton';
import { useTheme } from '../../common/theme/ThemeContext';

export default function TaskManagementScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    department: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    startDate: null,
    dueDate: null,
  });
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    // Wait for authentication
    if (!isAuthenticated || !user || !token) {
      return;
    }
    
    loadTasks();
    if (user?.role === 'DIRECTOR') {
      loadOptions();
    }
  }, [user, isAuthenticated, token, navigation]);

  // Refresh tasks when screen comes into focus (e.g., after deleting from TaskDetail)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user && token) {
        loadTasks();
      }
    }, [isAuthenticated, user, token])
  );

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

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      // Load departments
      const deptResponse = await departmentAPI.getDepartments();
      const depts = deptResponse.data.data.departments || deptResponse.data.departments || [];
      setDepartments(depts.map(dept => ({
        label: dept.name,
        value: dept.name
      })));

      // Load users
      const usersResponse = await userAPI.getUsers();
      const usersList = usersResponse.data.data.users || usersResponse.data.users || [];
      setUsers(usersList
        .filter(u => u.role === 'HOD' || u.role === 'EMPLOYEE')
        .map(u => ({ label: `${u.name} (${u.department})`, value: u._id }))
      );
    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await taskAPI.getTasks();
      const tasksList = response.data.data.tasks || response.data.tasks || [];
      setTasks(tasksList);
    } catch (error) {
      // Don't log 401 errors - they're handled by the interceptor
      if (error.response?.status !== 401) {
        console.error('Error loading tasks:', error);
        Alert.alert('Error', 'Failed to load tasks');
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const openCreateModal = async () => {
    if (user?.role !== 'DIRECTOR') {
      Alert.alert('Access Denied', 'Only Directors can create tasks');
      return;
    }
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      assignedTo: '',
      department: '',
      priority: 'MEDIUM',
      status: 'PENDING',
      startDate: null,
      dueDate: null,
    });
    setErrors({});
    // Ensure options are loaded before opening modal
    if (departments.length === 0 || users.length === 0) {
      await loadOptions();
    }
    setModalVisible(true);
  };

  const openEditModal = (task) => {
    if (user?.role !== 'DIRECTOR') {
      Alert.alert('Access Denied', 'Only Directors can edit tasks');
      return;
    }
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo?._id || '',
      department: task.department || '',
      priority: task.priority || 'MEDIUM',
      status: task.status || 'PENDING',
      startDate: task.startDate ? new Date(task.startDate) : null,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
    });
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Assigned to is required';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    if (formData.dueDate && formData.startDate && formData.dueDate < formData.startDate) {
      newErrors.dueDate = 'Due date cannot be before start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignedTo: formData.assignedTo,
        departmentId: formData.department, // Backend expects departmentId, not department
        priority: formData.priority,
        status: formData.status,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      };

      if (editingTask) {
        // Update
        await taskAPI.updateTask(editingTask._id, taskData);
        Alert.alert('Success', 'Task updated successfully');
      } else {
        // Create
        await taskAPI.createTask(taskData);
        Alert.alert('Success', 'Task created successfully');
      }
      setModalVisible(false);
      loadTasks();
    } catch (error) {
      let errorMessage = 'Failed to save task';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDelete = (task) => {
    if (user?.role !== 'DIRECTOR') {
      Alert.alert('Access Denied', 'Only Directors can delete tasks');
      return;
    }
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskAPI.deleteTask(task._id);
              Alert.alert('Success', 'Task deleted successfully');
              loadTasks();
            } catch (error) {
              let errorMessage = 'Failed to delete task';
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              }
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) {
      return tasks;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return tasks.filter(task => {
      const title = (task.title || '').toLowerCase();
      const description = (task.description || '').toLowerCase();
      const assignedToName = (task.assignedTo?.name || '').toLowerCase();
      const department = (task.department || '').toLowerCase();
      const status = (task.status || '').toLowerCase();
      const priority = (task.priority || '').toLowerCase();
      
      return (
        title.includes(query) ||
        description.includes(query) ||
        assignedToName.includes(query) ||
        department.includes(query) ||
        status.includes(query) ||
        priority.includes(query)
      );
    });
  }, [tasks, searchQuery]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return theme.colors.success;
      case 'IN_PROGRESS':
        return theme.colors.info;
      case 'PENDING':
        return theme.colors.warning;
      case 'CANCELLED':
      case 'BLOCKED':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'PENDING':
        return 'Pending';
      case 'CANCELLED':
        return 'Cancelled';
      case 'BLOCKED':
        return 'Blocked';
      default:
        return 'Pending';
    }
  };

  const isDirector = user?.role === 'DIRECTOR';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Bar */}
      <TopBar 
        title="Manage Tasks" 
        onBackPress={() => navigation.navigate('Dashboard', { screen: 'DashboardMain' })}
        rightComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('TaskActivity')}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications" size={24} color="#ffffff" />
            <View style={styles.notificationBadge}>
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>
        }
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Task List Header */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Task List
            </Text>
            {isDirector && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={openCreateModal}
              >
                <Ionicons name="add" size={18} color="#ffffff" style={styles.addIcon} />
                <Text style={styles.addButtonText}>Add New</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            </View>
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: theme.colors.text,
                },
              ]}
              placeholder="Search by name, code..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {loading && !refreshing && (
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading tasks...
            </Text>
          )}

          {filteredTasks.map((task) => (
            <Card key={task._id} style={styles.taskCard}>
              <View style={styles.taskCardContent}>
                <View style={styles.taskInfo}>
                  <View style={styles.taskHeaderRow}>
                    <View style={styles.taskNameContainer}>
                      <Text style={[styles.taskName, { color: theme.colors.text }]}>
                        {task.title}
                      </Text>
                      {task.department && (
                        <Text style={[styles.taskDepartment, { color: theme.colors.textSecondary }]}>
                          ({task.department})
                        </Text>
                      )}
                    </View>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: getStatusColor(task.status),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: getStatusColor(task.status),
                          },
                        ]}
                      >
                        {getStatusText(task.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.taskActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20', marginRight: 10 }]}
                    onPress={() => navigation.navigate('TaskDetail', { taskId: task._id })}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
                      Detail
                    </Text>
                  </TouchableOpacity>
                  {isDirector && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.info + '20', marginRight: 10 }]}
                        onPress={() => openEditModal(task)}
                      >
                        <Text style={[styles.actionButtonText, { color: theme.colors.info }]}>
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
                        onPress={() => handleDelete(task)}
                      >
                        <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </Card>
          ))}

          {!loading && filteredTasks.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {searchQuery.trim() 
                  ? `No tasks found matching "${searchQuery}"` 
                  : 'No tasks found'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingTask ? 'Edit Task' : 'Create Task'}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Input
                label="Task Title *"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter task title"
                error={errors.title}
                required
              />

              <Input
                label="Description *"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter task description"
                multiline
                numberOfLines={3}
                error={errors.description}
                required
              />

              <Picker
                label="Department *"
                selectedValue={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
                items={departments}
                placeholder="Select department"
                error={errors.department}
                required
                disabled={loadingOptions}
              />

              <Picker
                label="Assigned To *"
                selectedValue={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                items={users}
                placeholder="Select user"
                error={errors.assignedTo}
                required
                disabled={loadingOptions}
                showSearch={true}
              />

              <Picker
                label="Priority"
                selectedValue={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                items={[
                  { label: 'Low', value: 'LOW' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'High', value: 'HIGH' },
                ]}
                placeholder="Select priority"
                error={errors.priority}
              />

              <Picker
                label="Status"
                selectedValue={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                items={[
                  { label: 'Pending', value: 'PENDING' },
                  { label: 'In Progress', value: 'IN_PROGRESS' },
                  { label: 'Completed', value: 'COMPLETED' },
                  { label: 'Cancelled', value: 'CANCELLED' },
                  { label: 'Blocked', value: 'BLOCKED' },
                ]}
                placeholder="Select status"
                error={errors.status}
              />

              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(date) => setFormData({ ...formData, startDate: date })}
                placeholder="Select start date"
              />

              <DatePicker
                label="Due Date"
                value={formData.dueDate}
                onChange={(date) => setFormData({ ...formData, dueDate: date })}
                placeholder="Select due date"
                minimumDate={formData.startDate}
                error={errors.dueDate}
              />

              <Button
                title={editingTask ? 'Update Task' : 'Create Task'}
                onPress={handleSave}
                style={styles.saveButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button - Director only */}
      {isDirector && (
        <FloatingActionButton
          onPress={openCreateModal}
          icon="add"
        />
      )}
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
  content: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
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
  addIcon: {
    marginRight: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  notificationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#64748b',
  },
  taskCard: {
    marginBottom: 16,
    padding: 20,
  },
  taskCardContent: {
    flexDirection: 'column',
  },
  taskInfo: {
    marginBottom: 16,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  taskDepartment: {
    fontSize: 14,
    color: '#64748b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
    },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#1e293b',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalBodyContent: {
    paddingBottom: 40,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 8,
  },
});

