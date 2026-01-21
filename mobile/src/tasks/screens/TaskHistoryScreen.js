import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTaskById } from '../../store/slices/taskSlice';
import { taskAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Button from '../../common/components/Button';
import { useTheme } from '../../common/theme/ThemeContext';

export default function TaskHistoryScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params;
  const { currentTask } = useSelector((state) => state.tasks);
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();

  const [replyingToUpdateId, setReplyingToUpdateId] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const isEmployee = user?.role === 'EMPLOYEE';
  const isDirector = user?.role === 'DIRECTOR';
  const canReply = isEmployee || isDirector;

  useEffect(() => {
    dispatch(fetchTaskById(taskId));
  }, [taskId, dispatch]);

  // Refresh task when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      dispatch(fetchTaskById(taskId));
    });
    return unsubscribe;
  }, [navigation, taskId, dispatch]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return theme.colors.success;
      case 'IN_PROGRESS':
        return '#fbbf24'; // Yellow
      case 'PENDING':
        return theme.colors.warning;
      case 'CANCELLED':
      case 'BLOCKED':
        return theme.colors.error;
      default:
        return '#9ca3af'; // Grey for CREATED
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

  const getAvatarColor = (name, isSystem = false) => {
    if (isSystem) return '#9ca3af'; // Grey for system
    if (!name) return theme.colors.primary;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${month} ${day}, ${year} at ${hours}:${minutesStr} ${ampm}`;
  };

  const formatShortTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  if (!currentTask) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  const updates = currentTask.updates || [];
  const sortedUpdates = [...updates].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA; // Most recent first
  });

  // Add task creation entry using assignedBy (the person who created the task)
  const allEntries = [...sortedUpdates];
  if (currentTask.createdAt && currentTask.assignedBy) {
    allEntries.push({
      _id: 'task-created',
      updatedBy: currentTask.assignedBy,
      createdAt: currentTask.createdAt,
      status: 'CREATED',
      comment: `Task created and assigned to ${currentTask.assignedTo?.name || 'user'}.`,
      isTaskCreation: true,
    });
  }
  const sortedAllEntries = allEntries.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA; // Most recent first
  });

  const assignedToMe = currentTask.assignedTo?._id === user?._id || 
                       currentTask.assignedTo?.toString() === user?._id?.toString();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Purple Header with Rounded Bottom */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Status History</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
        {/* Task Details Card */}
        <Card style={styles.taskDetailsCard}>
          <View style={styles.taskTitleRow}>
            <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
              {currentTask.title}
            </Text>
            {currentTask._id && (
              <View style={styles.taskIdBadge}>
                <Text style={styles.taskIdText}>#{String(currentTask._id).slice(-4).toUpperCase()}</Text>
              </View>
            )}
          </View>
          {currentTask.description && (
            <Text style={[styles.taskDescription, { color: theme.colors.textSecondary }]}>
              {currentTask.description}
            </Text>
          )}
          <View style={styles.taskMeta}>
            <View style={styles.taskMetaItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.taskMetaText, { color: theme.colors.textSecondary }]}>
                Created {currentTask.createdAt ? formatDate(currentTask.createdAt).split(' at ')[0] : 'N/A'}
              </Text>
            </View>
            {assignedToMe && (
              <View style={styles.taskMetaItem}>
                <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.taskMetaText, { color: theme.colors.textSecondary }]}>
                  Assigned to You
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Activity Log Section */}
        <View style={styles.activityLogHeader}>
          <Text style={styles.activityLogTitle}>ACTIVITY LOG</Text>
        </View>

        {sortedAllEntries.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No status updates yet
            </Text>
          </Card>
        ) : (
          sortedAllEntries.map((update, index) => {
            const updateUser = update.updatedBy?.name || 'Unknown';
            const updateDate = update.createdAt ? formatDate(update.createdAt) : '';
            const isReplyingToThis = replyingToUpdateId === update._id?.toString();
            const isTaskCreation = update.isTaskCreation;
            const avatarColor = getAvatarColor(updateUser, false);
            const statusColor = getStatusColor(update.status);

            return (
              <View key={update._id || index} style={styles.activityEntry}>
                <View style={styles.activityContent}>
                  <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>
                      {getInitials(updateUser)}
                    </Text>
                  </View>
                  <View style={styles.activityMain}>
                    <View style={styles.activityHeader}>
                      <View style={styles.activityUserInfo}>
                        <Text style={[styles.activityUserName, { color: theme.colors.text }]}>
                          {updateUser}
                        </Text>
                        <Text style={[styles.activityDate, { color: theme.colors.textSecondary }]}>
                          {updateDate}
                        </Text>
                      </View>
                      {update.status && (
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {update.status.replace('_', ' ')}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.messageBubble}>
                      <Text style={[styles.updateMessage, { color: theme.colors.text }]}>
                        {update.remarks || update.comment || 'No remarks'}
                      </Text>
                    </View>

                    {/* Replies Section */}
                    {update.replies && update.replies.length > 0 && (
                      <View style={styles.repliesContainer}>
                        {update.replies.map((reply, replyIndex) => {
                          const replyUser = reply.repliedBy?.name || 'Unknown';
                          const replyDate = reply.createdAt ? formatShortTime(reply.createdAt) : '';
                          const replyAvatarColor = getAvatarColor(replyUser);
                          return (
                            <View key={reply._id || replyIndex} style={styles.replyItem}>
                              <View style={[styles.replyAvatar, { backgroundColor: replyAvatarColor }]}>
                                <Text style={styles.replyAvatarText}>
                                  {getInitials(replyUser)}
                                </Text>
                              </View>
                              <View style={styles.replyContent}>
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
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Reply Button */}
                    {canReply && !isTaskCreation && (
                      <View style={styles.replySection}>
                        {!isReplyingToThis ? (
                          <TouchableOpacity
                            onPress={() => setReplyingToUpdateId(update._id?.toString() || null)}
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
                                onPress={() => handleReply(update._id)}
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
                </View>
              </View>
            );
          })
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
  taskDetailsCard: {
    marginBottom: 20,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  taskIdBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  taskIdText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskMetaText: {
    fontSize: 14,
  },
  activityLogHeader: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  activityLogTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1,
  },
  activityEntry: {
    marginBottom: 24,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  activityMain: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityUserInfo: {
    flex: 1,
  },
  activityUserName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  repliesContainer: {
    marginTop: 16,
    marginLeft: 52,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  replyAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyUserName: {
    fontSize: 14,
    fontWeight: '700',
  },
  replyDate: {
    fontSize: 12,
  },
  replyMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  replySection: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    width: '100%',
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});

