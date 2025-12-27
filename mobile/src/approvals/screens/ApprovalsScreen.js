import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { approvalAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Button from '../../common/components/Button';
import { useTheme } from '../../common/theme/ThemeContext';

export default function ApprovalsScreen() {
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    // Only load data if user is authenticated
    if (isAuthenticated && user && token) {
      loadApprovals();
    }
  }, [user, isAuthenticated, token]);

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      const response = await approvalAPI.getPendingApprovals();
      // Backend returns: { success, message, data: { tasks }, errors }
      const tasks = response.data.data.tasks || response.data.tasks || [];
      setApprovals(tasks);
    } catch (error) {
      // Don't log 401 errors - they're handled by the interceptor
      if (error.response?.status !== 401) {
        console.error('Error loading approvals:', error);
      }
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApprovals();
    setRefreshing(false);
  };

  const handleApprove = async (taskId) => {
    try {
      await approvalAPI.approveTask(taskId);
      await loadApprovals();
    } catch (error) {
      // Don't log 401 errors - they're handled by the interceptor
      if (error.response?.status !== 401) {
        console.error('Error approving task:', error);
      }
    }
  };

  const handleReject = async (taskId) => {
    try {
      await approvalAPI.rejectTask(taskId);
      await loadApprovals();
    } catch (error) {
      // Don't log 401 errors - they're handled by the interceptor
      if (error.response?.status !== 401) {
        console.error('Error rejecting task:', error);
      }
    }
  };

  const renderApproval = ({ item }) => (
    <Card>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {item.title}
      </Text>
      {item.description && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {item.description}
        </Text>
      )}
      <View style={styles.actions}>
        <Button
          title="Approve"
          onPress={() => handleApprove(item._id)}
          variant="primary"
          style={styles.actionButton}
        />
        <Button
          title="Reject"
          onPress={() => handleReject(item._id)}
          variant="outline"
          style={styles.actionButton}
        />
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={approvals}
        renderItem={renderApproval}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No pending approvals
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

