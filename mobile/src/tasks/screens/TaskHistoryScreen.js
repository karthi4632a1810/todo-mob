import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Card>
          <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
            {currentTask.title}
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            Complete Status History
          </Text>
        </Card>

        {sortedUpdates.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No status updates yet
            </Text>
          </Card>
        ) : (
          sortedUpdates.map((update, index) => {
            const updateUser = update.updatedBy?.name || 'Unknown';
            const updateDate = update.createdAt ? new Date(update.createdAt).toLocaleString() : '';
            const isReplyingToThis = replyingToUpdateId === update._id?.toString();

            return (
              <Card key={update._id || index} style={styles.updateCard}>
                <View style={styles.updateHeader}>
                  <View style={styles.updateUserInfo}>
                    <Text style={[styles.updateUserName, { color: theme.colors.text }]}>
                      {updateUser}
                    </Text>
                    <Text style={[styles.updateDate, { color: theme.colors.textSecondary }]}>
                      {updateDate}
                    </Text>
                  </View>
                  {update.status && (
                    <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>
                        {update.status}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={[styles.updateMessage, { color: theme.colors.text }]}>
                  {update.remarks || update.comment || 'No remarks'}
                </Text>

                {/* Replies Section */}
                {update.replies && update.replies.length > 0 && (
                  <View style={styles.repliesContainer}>
                    {update.replies.map((reply, replyIndex) => {
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
                        onPress={() => setReplyingToUpdateId(update._id?.toString() || null)}
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
              </Card>
            );
          })
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
  taskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 4,
  },
  updateCard: {
    marginBottom: 16,
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

