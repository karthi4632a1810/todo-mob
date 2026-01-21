import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { approvalAPI } from '../../services/api';
import { useTheme } from '../../common/theme/ThemeContext';

export default function ApprovalsScreen() {
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
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

  // Get project color based on department
  const getProjectColor = (department) => {
    const colorMap = {
      'Internal Tools': '#8B5CF6', // Purple
      'Healthcare Ops': '#3B82F6', // Blue
    };
    return colorMap[department] || '#6366F1'; // Default purple
  };

  // Get priority display text (full value)
  const getPriorityText = (priority) => {
    return priority || 'MEDIUM';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colorMap = {
      'HIGH': '#EF4444', // Red
      'MEDIUM': '#F59E0B', // Orange/Amber
      'LOW': '#10B981', // Green
    };
    return colorMap[priority] || '#6B7280'; // Default gray
  };

  // Get priority background color with opacity
  const getPriorityBackgroundColor = (priority) => {
    const colorMap = {
      'HIGH': 'rgba(239, 68, 68, 0.15)', // Red with 15% opacity
      'MEDIUM': 'rgba(245, 158, 11, 0.15)', // Orange/Amber with 15% opacity
      'LOW': 'rgba(16, 185, 129, 0.15)', // Green with 15% opacity
    };
    return colorMap[priority] || 'rgba(107, 114, 128, 0.15)'; // Default gray with 15% opacity
  };

  const toggleDescription = (taskId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const renderApproval = ({ item }) => {
    const projectColor = getProjectColor(item.department);
    const priorityText = getPriorityText(item.priority);
    const priorityColor = getPriorityColor(item.priority);
    const priorityBgColor = getPriorityBackgroundColor(item.priority);
    const isExpanded = expandedItems.has(item._id);
    const hasDescription = item.description && item.description.trim().length > 0;

    return (
      <View style={styles.approvalCard}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityBgColor, borderColor: priorityColor }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>{priorityText}</Text>
            </View>
          </View>
          {item.department && (
            <View style={[styles.projectTag, { backgroundColor: projectColor }]}>
              <Text style={styles.projectTagText}>{item.department}</Text>
            </View>
          )}
        </View>

        {hasDescription && (
          <View style={styles.descriptionContainer}>
            <Ionicons name="shield-outline" size={16} color="#6B7280" style={styles.shieldIcon} />
            <View style={styles.descriptionWrapper}>
              <Text 
                style={styles.description}
                numberOfLines={isExpanded ? undefined : 3}
              >
                {item.description}
              </Text>
              {item.description && item.description.length > 150 && (
                <TouchableOpacity
                  onPress={() => toggleDescription(item._id)}
                  style={styles.toggleButton}
                >
                  <Text style={styles.toggleText}>
                    {isExpanded ? 'Show less' : 'Show more'}
                  </Text>
                  <Ionicons 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color="#6366F1" 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleReject(item._id)}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => handleApprove(item._id)}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.workflowText}>WORKFLOW</Text>
        <Text style={styles.approvalsTitle}>Approvals</Text>
      </View>
      <TouchableOpacity style={styles.bellIcon}>
        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="clipboard-outline" size={80} color="#E5E7EB" />
      <Text style={styles.emptyText}>No more pending tasks</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      <FlatList
        data={approvals}
        renderItem={renderApproval}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          approvals.length === 0 && styles.listContentEmpty
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLeft: {
    flex: 1,
  },
  workflowText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  approvalsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  bellIcon: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  approvalCard: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
    lineHeight: 26,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  projectTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  projectTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  descriptionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 12,
    paddingRight: 4,
  },
  shieldIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  descriptionWrapper: {
    flex: 1,
    paddingRight: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    marginRight: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 20,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 16,
    fontWeight: '500',
  },
});
