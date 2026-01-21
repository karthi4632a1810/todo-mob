import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Share, Clipboard, Modal } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTaskById, deleteTask, updateTaskProgress, createTask } from '../../store/slices/taskSlice';
import { taskAPI, userAPI } from '../../services/api';
import Button from '../../common/components/Button';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Picker from '../../common/components/Picker';
import TaskOptionsBottomSheet from '../components/TaskOptionsBottomSheet';
import { useTheme } from '../../common/theme/ThemeContext';

export default function TaskDetailScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params;
  const { currentTask, isLoading } = useSelector((state) => state.tasks);
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();

  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [replyingToUpdateId, setReplyingToUpdateId] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newPriority, setNewPriority] = useState('');
  const [transferUserId, setTransferUserId] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isEmployee = user?.role === 'EMPLOYEE';
  const isDirector = user?.role === 'DIRECTOR';
  const canReply = isEmployee || isDirector;
  
  // Check if task is pending and user is employee - restrict access
  const isPendingForEmployee = isEmployee && currentTask?.status === 'PENDING';

  useEffect(() => {
    dispatch(fetchTaskById(taskId));
  }, [taskId, dispatch]);

  // Refresh task when screen comes into focus (with debounce to prevent rate limiting)
  useEffect(() => {
    let timeoutId;
    const unsubscribe = navigation.addListener('focus', () => {
      // Debounce: wait 500ms before fetching to prevent rapid requests
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        dispatch(fetchTaskById(taskId));
      }, 500);
    });
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [navigation, taskId, dispatch]);

  // Initialize form when task loads
  useEffect(() => {
    if (currentTask && isEmployee) {
      setStatus(currentTask.status || 'PENDING');
      setRemarks('');
      setErrors({});
    }
  }, [currentTask, isEmployee]);

  const handleEdit = () => {
    navigation.navigate('EditTask', { taskId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await dispatch(deleteTask(taskId));
              if (deleteTask.fulfilled.match(result)) {
                Alert.alert('Success', 'Task deleted successfully', [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } else {
                let errorMessage = 'Failed to delete task';
                if (result.payload) {
                  errorMessage = typeof result.payload === 'string' 
                    ? result.payload 
                    : result.payload.message || errorMessage;
                }
                Alert.alert('Error', errorMessage);
              }
            } catch (error) {
              console.error('Delete task error:', error);
              Alert.alert('Error', error.message || 'An error occurred');
            }
          },
        },
      ]
    );
  };

  const handleUpdateProgress = async () => {
    // Validation
    const newErrors = {};
    if (!status) {
      newErrors.status = 'Status is required';
    }
    if (!remarks.trim()) {
      newErrors.remarks = 'Remarks are required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsUpdating(true);
    setErrors({});

    try {
      const result = await dispatch(updateTaskProgress({
        taskId,
        status,
        remarks: remarks.trim()
      }));

      if (updateTaskProgress.fulfilled.match(result)) {
        Alert.alert('Success', 'Task progress updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              setRemarks('');
              dispatch(fetchTaskById(taskId)); // Refresh task
            },
          },
        ]);
      } else {
        let errorMessage = 'Failed to update task progress';
        if (result.payload) {
          if (typeof result.payload === 'string') {
            errorMessage = result.payload;
          } else if (result.payload.message) {
            errorMessage = result.payload.message;
          } else if (result.payload.errors && Array.isArray(result.payload.errors)) {
            errorMessage = result.payload.errors.join(', ');
          }
        }
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Update progress error:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReply = async (updateId) => {
    if (!replyMessage.trim()) {
      Alert.alert('Error', 'Please enter a reply message');
      return;
    }

    setIsReplying(true);
    try {
      const response = await taskAPI.addReplyToUpdate(taskId, updateId, replyMessage.trim());
      if (response.data.success) {
        Alert.alert('Success', 'Reply added successfully');
        setReplyMessage('');
        setReplyingToUpdateId(null);
        dispatch(fetchTaskById(taskId)); // Refresh task
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add reply';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsReplying(false);
    }
  };

  const handleMenuAction = async (actionId) => {
    if (!currentTask) return;

    switch (actionId) {
      case 'share':
        handleShareTask();
        break;
      case 'duplicate':
        handleDuplicateTask();
        break;
      case 'copy':
        handleCopyTaskDetails();
        break;
      case 'history':
        navigation.navigate('TaskHistory', { taskId });
        break;
      case 'priority':
        setNewPriority(currentTask.priority);
        setShowPriorityModal(true);
        break;
      case 'transfer':
        loadUsersForTransfer();
        setShowTransferModal(true);
        break;
      case 'related':
        handleViewRelatedTasks();
        break;
      case 'favorite':
        handleAddToFavorites();
        break;
      case 'export':
        handleExportPDF();
        break;
      default:
        break;
    }
  };

  const handleShareTask = async () => {
    try {
      const taskDetails = `Task: ${currentTask.title}\n` +
        `Status: ${currentTask.status}\n` +
        `Priority: ${currentTask.priority}\n` +
        `Department: ${currentTask.department}\n` +
        `Assigned To: ${currentTask.assignedTo?.name || 'N/A'}\n` +
        `Due Date: ${currentTask.dueDate ? new Date(currentTask.dueDate).toLocaleDateString() : 'N/A'}\n` +
        (currentTask.description ? `Description: ${currentTask.description.substring(0, 200)}...` : '');
      
      await Share.share({
        message: taskDetails,
        title: currentTask.title,
      });
    } catch (error) {
      console.error('Error sharing task:', error);
    }
  };

  const handleDuplicateTask = async () => {
    if (user?.role !== 'DIRECTOR' && user?.role !== 'HOD') {
      Alert.alert('Access Denied', 'Only Directors and HODs can duplicate tasks');
      return;
    }

    if (!currentTask) {
      Alert.alert('Error', 'Task data not available');
      return;
    }

    Alert.alert(
      'Duplicate Task',
      'Create a copy of this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              // Prepare task data matching backend requirements
              const assignedToId = currentTask.assignedTo?._id || currentTask.assignedTo;
              const departmentId = currentTask.department; // Backend expects departmentId (which is the department name)
              
              // Format dates as ISO strings
              const startDate = currentTask.startDate 
                ? new Date(currentTask.startDate).toISOString()
                : new Date().toISOString();
              
              const dueDate = currentTask.dueDate 
                ? new Date(currentTask.dueDate).toISOString()
                : null;

              if (!dueDate) {
                Alert.alert('Error', 'Task must have a due date to be duplicated');
                return;
              }

              const taskData = {
                title: `${currentTask.title} (Copy)`,
                description: currentTask.description || '',
                assignedTo: assignedToId,
                departmentId: departmentId,
                priority: currentTask.priority || 'MEDIUM',
                startDate: startDate,
                dueDate: dueDate,
              };

              const response = await taskAPI.createTask(taskData);
              
              if (response.data && response.data.success) {
                const newTaskId = response.data.data?.task?._id;
                Alert.alert('Success', 'Task duplicated successfully', [
                  {
                    text: 'OK',
                    onPress: () => {
                      if (newTaskId) {
                        navigation.navigate('TaskDetail', { taskId: newTaskId });
                      } else {
                        navigation.goBack();
                      }
                    },
                  },
                ]);
              } else {
                const errorMessage = response.data?.message || 'Failed to duplicate task';
                const errors = response.data?.errors || [];
                Alert.alert(
                  'Error', 
                  errors.length > 0 ? errors.join('\n') : errorMessage
                );
              }
            } catch (error) {
              console.error('Duplicate task error:', error);
              const errorMessage = error.response?.data?.message || 
                                 error.message || 
                                 'Failed to duplicate task';
              const errors = error.response?.data?.errors || [];
              Alert.alert(
                'Error',
                errors.length > 0 ? errors.join('\n') : errorMessage
              );
            }
          },
        },
      ]
    );
  };

  const handleCopyTaskDetails = () => {
    const taskDetails = `Task: ${currentTask.title}\n` +
      `Status: ${currentTask.status}\n` +
      `Priority: ${currentTask.priority}\n` +
      `Department: ${currentTask.department}\n` +
      `Assigned To: ${currentTask.assignedTo?.name || 'N/A'}\n` +
      `Assigned By: ${currentTask.assignedBy?.name || 'N/A'}\n` +
      `Start Date: ${currentTask.startDate ? new Date(currentTask.startDate).toLocaleDateString() : 'N/A'}\n` +
      `Due Date: ${currentTask.dueDate ? new Date(currentTask.dueDate).toLocaleDateString() : 'N/A'}\n` +
      (currentTask.description ? `Description: ${currentTask.description}` : '');
    
    Clipboard.setString(taskDetails);
    Alert.alert('Success', 'Task details copied to clipboard');
  };

  const handleChangePriority = async () => {
    if (!newPriority) {
      Alert.alert('Error', 'Please select a priority');
      return;
    }

    try {
      await taskAPI.updateTask(taskId, { priority: newPriority });
      Alert.alert('Success', 'Priority updated successfully');
      setShowPriorityModal(false);
      dispatch(fetchTaskById(taskId));
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update priority');
    }
  };

  const loadUsersForTransfer = async () => {
    setLoadingUsers(true);
    try {
      const response = await userAPI.getUsers();
      const usersList = response.data.data?.users || response.data.users || [];
      const filteredUsers = usersList
        .filter(u => {
          if (user?.role === 'DIRECTOR') return true;
          if (user?.role === 'HOD') return u.department === currentTask.department;
          return false;
        })
        .filter(u => u._id !== currentTask.assignedTo?._id && u._id !== currentTask.assignedTo)
        .map(u => ({ label: `${u.name} (${u.department})`, value: u._id }));
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTransferTask = async () => {
    if (!transferUserId) {
      Alert.alert('Error', 'Please select a user');
      return;
    }

    try {
      await taskAPI.updateTask(taskId, { assignedTo: transferUserId });
      Alert.alert('Success', 'Task transferred successfully');
      setShowTransferModal(false);
      setTransferUserId('');
      dispatch(fetchTaskById(taskId));
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to transfer task');
    }
  };

  const handleViewRelatedTasks = () => {
    navigation.navigate('RelatedTasks', { 
      taskId: taskId,
      department: currentTask.department,
      assignedTo: currentTask.assignedTo?._id || currentTask.assignedTo,
    });
  };

  const handleAddToFavorites = () => {
    // TODO: Implement favorites functionality when backend supports it
    Alert.alert('Info', 'Favorites feature coming soon!');
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    Alert.alert('Info', 'PDF export feature coming soon!');
  };

  // Check if user can edit/delete this task (for non-employees)
  const getUserId = (userObj) => {
    if (!userObj) return null;
    return userObj._id || userObj;
  };

  const assignedToId = getUserId(currentTask?.assignedTo);
  const assignedById = getUserId(currentTask?.assignedBy);
  const userId = getUserId(user);

  const canEdit = !isEmployee && currentTask && userId && (
    assignedToId?.toString() === userId.toString() ||
    assignedById?.toString() === userId.toString() ||
    user?.role === 'HOD' ||
    user?.role === 'DIRECTOR'
  );

  const canDelete = !isEmployee && currentTask && userId && (
    assignedById?.toString() === userId.toString() ||
    user?.role === 'DIRECTOR'
  );

  // Check if employee can update this task
  const canUpdateProgress = isEmployee && currentTask && userId && (
    assignedToId?.toString() === userId.toString() &&
    currentTask.department === user?.department &&
    !currentTask.directorApproved
  );

  if (isLoading || !currentTask) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  const statusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Blocked', value: 'BLOCKED' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return theme.colors.success;
      case 'IN_PROGRESS':
        return '#3b82f6'; // Light blue
      case 'PENDING':
        return theme.colors.warning;
      case 'CANCELLED':
      case 'BLOCKED':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return '#ef4444'; // Light red
      case 'MEDIUM':
        return theme.colors.warning;
      case 'LOW':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return theme.colors.primary;
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Purple Header with Rounded Bottom */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Task Details</Text>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setShowOptionsSheet(true)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
        {/* Task Title Card - Always visible */}
        <Card style={styles.descriptionCard}>
          <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
            {currentTask.title}
          </Text>
          
          {/* Show pending approval message for employees */}
          {isPendingForEmployee && (
            <View style={styles.pendingMessageContainer}>
              <Ionicons name="lock-closed" size={20} color="#F59E0B" style={styles.lockIcon} />
              <Text style={styles.pendingMessage}>
                This task is pending approval. Full details will be available after approval.
              </Text>
            </View>
          )}
          
          {/* Description - Only show if not pending for employee */}
          {!isPendingForEmployee && currentTask.description && (
            <View>
              <Text 
                style={[styles.taskDescription, { color: theme.colors.textSecondary }]}
                numberOfLines={isDescriptionExpanded ? undefined : 3}
              >
                {currentTask.description}
              </Text>
              {currentTask.description.length > 100 && (
                <TouchableOpacity
                  onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  style={styles.viewDescriptionButton}
                >
                  <Text style={[styles.viewDescriptionText, { color: theme.colors.primary }]}>
                    {isDescriptionExpanded ? 'Hide Description' : 'View Description'}
                  </Text>
                  <Ionicons 
                    name={isDescriptionExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color={theme.colors.primary} 
                    style={styles.viewDescriptionIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>

        {/* Details Card - Only show if not pending for employee */}
        {!isPendingForEmployee && (
        <Card style={styles.detailsCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Details
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Status:
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentTask.status) + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(currentTask.status) }]}>
                {currentTask.status}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Priority:
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(currentTask.priority) + '20' }]}>
              <Ionicons name="flag" size={14} color={getPriorityColor(currentTask.priority)} style={styles.priorityIcon} />
              <Text style={[styles.priorityBadgeText, { color: getPriorityColor(currentTask.priority) }]}>
                {currentTask.priority}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Department:
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currentTask.department}
            </Text>
          </View>
          
          {currentTask.startDate && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Start Date:
              </Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>
                {new Date(currentTask.startDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          
          {currentTask.dueDate && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Due Date:
              </Text>
              <Text style={[styles.dueDateValue, { color: '#ef4444' }]}>
                {new Date(currentTask.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          
          {currentTask.assignedTo && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Assigned To:
              </Text>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(currentTask.assignedTo.name) }]}>
                  <Text style={styles.avatarText}>
                    {getInitials(currentTask.assignedTo.name)}
                  </Text>
                </View>
                <Text style={[styles.avatarName, { color: theme.colors.text }]}>
                  {currentTask.assignedTo.name || 'N/A'}
                </Text>
              </View>
            </View>
          )}
          
          {currentTask.assignedBy && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Assigned By:
              </Text>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(currentTask.assignedBy.name) }]}>
                  <Text style={styles.avatarText}>
                    {getInitials(currentTask.assignedBy.name)}
                  </Text>
                </View>
                <Text style={[styles.avatarName, { color: theme.colors.text }]}>
                  {currentTask.assignedBy.name || 'N/A'}
                </Text>
              </View>
            </View>
          )}
        </Card>
        )}

        {/* Status History Section - Show only last update, and only if not pending for employee */}
        {!isPendingForEmployee && currentTask.updates && currentTask.updates.length > 0 && (() => {
          // Sort updates by date (most recent first) and get the last one
          const sortedUpdates = [...currentTask.updates].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          });
          const lastUpdate = sortedUpdates[0];
          const updateUser = lastUpdate.updatedBy?.name || 'Unknown';
          const updateDate = lastUpdate.createdAt ? new Date(lastUpdate.createdAt).toLocaleString() : '';
          const isReplyingToThis = replyingToUpdateId === lastUpdate._id?.toString();

          return (
            <Card style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Status History
                  </Text>
                </View>
                {currentTask.updates && currentTask.updates.length > 0 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('TaskHistory', { taskId })}
                    style={styles.viewAllButton}
                  >
                    <Text style={styles.viewAllLink}>
                      {currentTask.updates.length > 1 ? `View All (${currentTask.updates.length})` : 'View All'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.updateItem}>
                <View style={styles.updateHeader}>
                  <View style={styles.updateUserInfo}>
                    <View style={styles.updateUserRow}>
                      <View style={[styles.updateDot, { backgroundColor: theme.colors.primary }]} />
                      <Text style={[styles.updateUserName, { color: theme.colors.text }]}>
                        {updateUser}
                      </Text>
                    </View>
                    <Text style={[styles.updateDate, { color: theme.colors.textSecondary }]}>
                      {updateDate}
                    </Text>
                  </View>
                  {lastUpdate.status && (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lastUpdate.status) + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(lastUpdate.status) }]}>
                        {lastUpdate.status}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.messageBubble}>
                  <Text style={[styles.updateMessage, { color: theme.colors.text }]}>
                    {lastUpdate.remarks || lastUpdate.comment || 'No remarks'}
                  </Text>
                </View>

                {/* Replies Section */}
                {lastUpdate.replies && lastUpdate.replies.length > 0 && (
                  <View style={styles.repliesContainer}>
                    {lastUpdate.replies.map((reply, replyIndex) => {
                      const replyUser = reply.repliedBy?.name || 'Unknown';
                      const replyDate = reply.createdAt ? new Date(reply.createdAt).toLocaleString() : '';
                      return (
                        <View key={reply._id || replyIndex} style={styles.replyItem}>
                          <View style={styles.replyHeader}>
                            <Text style={[styles.replyUserName, { color: theme.colors.primary }]}>
                              {replyUser}
                            </Text>
                            <Text style={[styles.replyDate, { color: theme.colors.textSecondary }]}>
                              {replyDate}
                            </Text>
                          </View>
                          <Text style={[styles.replyMessage, { color: theme.colors.text }]}>
                            {reply.message}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Reply Button */}
                {canReply && (
                  <View style={styles.replySection}>
                    {!isReplyingToThis ? (
                      <TouchableOpacity
                        onPress={() => setReplyingToUpdateId(lastUpdate._id?.toString() || null)}
                        style={styles.replyButton}
                      >
                        <Ionicons name="arrow-undo" size={16} color={theme.colors.primary} style={styles.replyIcon} />
                        <Text style={[styles.replyButtonText, { color: theme.colors.primary }]}>
                          Reply
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.replyInputContainer}>
                        <Input
                          label="Your Reply"
                          value={replyMessage}
                          onChangeText={setReplyMessage}
                          placeholder="Enter your reply..."
                          multiline
                          numberOfLines={3}
                        />
                        <View style={styles.replyActions}>
                          <Button
                            title="Send Reply"
                            onPress={() => handleReply(lastUpdate._id)}
                            loading={isReplying}
                            disabled={isReplying || !replyMessage.trim()}
                            style={styles.replySendButton}
                          />
                          <Button
                            title="Cancel"
                            onPress={() => {
                              setReplyingToUpdateId(null);
                              setReplyMessage('');
                            }}
                            variant="outline"
                            style={styles.replyCancelButton}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </Card>
          );
        })()}

        {/* Employee Update Progress Section - Only show if not pending */}
        {isEmployee && canUpdateProgress && !isPendingForEmployee && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Update Progress
            </Text>
            <Picker
              label="Status *"
              selectedValue={status}
              onValueChange={(value) => {
                setStatus(value);
                setErrors({ ...errors, status: '' });
              }}
              items={statusOptions}
              placeholder="Select status"
              error={errors.status}
              required
            />
            <Input
              label="Remarks *"
              value={remarks}
              onChangeText={(text) => {
                setRemarks(text);
                setErrors({ ...errors, remarks: '' });
              }}
              placeholder="Enter remarks about the task progress"
              multiline
              numberOfLines={4}
              error={errors.remarks}
              required
            />
            <Button
              title="Submit Update"
              onPress={handleUpdateProgress}
              loading={isUpdating}
              disabled={isUpdating || !remarks.trim() || !status}
              style={styles.updateButton}
            />
          </Card>
        )}

        {/* Non-Employee Actions */}
        {!isEmployee && (canEdit || canDelete) && (
          <Card style={styles.actionsCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Actions
            </Text>
            <View style={styles.actionsContainer}>
              {canEdit && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={handleEdit}
                >
                  <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
                    Edit Task
                  </Text>
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash" size={18} color="#ef4444" />
                  <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                    Delete Task
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}

        {/* Show message if employee cannot update */}
        {isEmployee && !canUpdateProgress && (
          <Card>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {currentTask.directorApproved 
                ? 'This task has been approved by Director and cannot be updated.'
                : 'You can only update tasks assigned to you in your department.'}
            </Text>
          </Card>
        )}
      </View>
      </ScrollView>

      {/* Task Options Bottom Sheet */}
      <TaskOptionsBottomSheet
        visible={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        task={currentTask}
        user={user}
        onAction={handleMenuAction}
      />

      {/* Change Priority Modal */}
      <Modal
        visible={showPriorityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPriorityModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Change Priority</Text>
              <TouchableOpacity
                onPress={() => setShowPriorityModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Picker
                label="Priority"
                selectedValue={newPriority}
                onValueChange={setNewPriority}
                items={[
                  { label: 'Low', value: 'LOW' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'High', value: 'HIGH' },
                ]}
              />
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowPriorityModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Update"
                  onPress={handleChangePriority}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transfer Task Modal */}
      <Modal
        visible={showTransferModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTransferModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Transfer Task</Text>
              <TouchableOpacity
                onPress={() => setShowTransferModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Picker
                label="Transfer To"
                selectedValue={transferUserId}
                onValueChange={setTransferUserId}
                items={availableUsers}
                placeholder="Select user"
                loading={loadingUsers}
              />
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowTransferModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Transfer"
                  onPress={handleTransferTask}
                  style={styles.modalButton}
                  disabled={!transferUserId}
                />
              </View>
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
  scrollView: {
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  descriptionCard: {
    marginBottom: 16,
  },
  pendingMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  lockIcon: {
    marginRight: 8,
  },
  pendingMessage: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 32,
  },
  taskDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  viewDescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  viewDescriptionText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  viewDescriptionIcon: {
    marginLeft: 2,
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  dueDateValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    marginRight: 4,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarName: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyCard: {
    marginBottom: 16,
  },
  updateItem: {
    marginBottom: 8,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  updateUserInfo: {
    flex: 1,
  },
  updateUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  updateUserName: {
    fontSize: 16,
    fontWeight: '700',
  },
  updateDate: {
    fontSize: 12,
    marginTop: 2,
  },
  messageBubble: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  updateMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  updateButton: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  updateItem: {
    marginBottom: 8,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  updateUserInfo: {
    flex: 1,
  },
  updateUserName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  updateDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  updateMessage: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  repliesContainer: {
    marginTop: 12,
    marginLeft: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  replyItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyUserName: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyDate: {
    fontSize: 11,
  },
  replyMessage: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  replySection: {
    marginTop: 12,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  replyIcon: {
    marginRight: 6,
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  replyInputContainer: {
    marginTop: 8,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  replySendButton: {
    flex: 1,
  },
  replyCancelButton: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});
