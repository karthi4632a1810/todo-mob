import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { fetchTaskById, deleteTask, updateTaskProgress } from '../../store/slices/taskSlice';
import { taskAPI } from '../../services/api';
import Button from '../../common/components/Button';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Picker from '../../common/components/Picker';
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

  const isEmployee = user?.role === 'EMPLOYEE';
  const isDirector = user?.role === 'DIRECTOR';
  const canReply = isEmployee || isDirector;

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Card>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {currentTask.title}
          </Text>
          {currentTask.description && (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {currentTask.description}
            </Text>
          )}
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Details
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Status:
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currentTask.status}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Priority:
            </Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {currentTask.priority}
            </Text>
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
              <Text style={[styles.value, { color: theme.colors.text }]}>
                {new Date(currentTask.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          {currentTask.assignedTo && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Assigned To:
              </Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>
                {currentTask.assignedTo.name || 'N/A'}
              </Text>
            </View>
          )}
          {currentTask.assignedBy && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Assigned By:
              </Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>
                {currentTask.assignedBy.name || 'N/A'}
              </Text>
            </View>
          )}
        </Card>

        {/* Status History Section - Show only last update */}
        {currentTask.updates && currentTask.updates.length > 0 && (() => {
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
            <Card>
              <View style={styles.historyHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Status History
                </Text>
                {currentTask.updates.length > 1 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('TaskHistory', { taskId })}
                  >
                    <Text style={[styles.viewAllLink, { color: theme.colors.primary }]}>
                      View All ({currentTask.updates.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.updateItem}>
                <View style={styles.updateHeader}>
                  <View style={styles.updateUserInfo}>
                    <Text style={[styles.updateUserName, { color: theme.colors.text }]}>
                      {updateUser}
                    </Text>
                    <Text style={[styles.updateDate, { color: theme.colors.textSecondary }]}>
                      {updateDate}
                    </Text>
                  </View>
                  {lastUpdate.status && (
                    <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>
                        {lastUpdate.status}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={[styles.updateMessage, { color: theme.colors.text }]}>
                  {lastUpdate.remarks || lastUpdate.comment || 'No remarks'}
                </Text>

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

                {/* Reply Input */}
                {canReply && (
                  <View style={styles.replySection}>
                    {!isReplyingToThis ? (
                      <TouchableOpacity
                        onPress={() => setReplyingToUpdateId(lastUpdate._id?.toString() || null)}
                        style={styles.replyButton}
                      >
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

        {/* Employee Update Progress Section */}
        {isEmployee && canUpdateProgress && (
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
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Actions
            </Text>
            <View style={styles.actionsContainer}>
              {canEdit && (
                <Button
                  title="Edit Task"
                  onPress={handleEdit}
                  variant="outline"
                  style={styles.actionButton}
                />
              )}
              {canDelete && (
                <Button
                  title="Delete Task"
                  onPress={handleDelete}
                  variant="outline"
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.error },
                  ]}
                  textStyle={{ color: theme.colors.error }}
                />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
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
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
