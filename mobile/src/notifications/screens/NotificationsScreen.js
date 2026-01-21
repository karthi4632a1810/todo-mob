import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../common/components/TopBar';
import { useTheme } from '../../common/theme/ThemeContext';
import { notificationAPI } from '../../services/api';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

export default function NotificationsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const user = useSelector((state) => state.auth.user);
  
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {};
      
      if (filter === 'unread') {
        params.isRead = 'false';
      } else if (filter === 'read') {
        params.isRead = 'true';
      }
      
      const response = await notificationAPI.getNotifications(params);
      const data = response.data?.data || response.data;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading notifications:', error);
        Alert.alert('Error', 'Failed to load notifications');
      }
      setNotifications([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notification) => {
    if (notification.isRead) return;
    
    try {
      await notificationAPI.markAsRead(notification._id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n._id === notification._id 
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await handleMarkAsRead(notification);
    }
    
    // Navigate to related task if available
    if (notification.relatedTask && notification.relatedTask._id) {
      navigation.navigate('Tasks', {
        screen: 'TaskDetail',
        params: { taskId: notification.relatedTask._id },
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return 'person-add';
      case 'TASK_UPDATED':
        return 'create';
      case 'TASK_COMPLETED':
        return 'checkmark-circle';
      case 'APPROVAL_REQUEST':
        return 'time';
      case 'APPROVAL_RESPONSE':
        return 'thumbs-up';
      case 'SYSTEM':
        return 'notifications';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return '#3b82f6'; // blue
      case 'TASK_UPDATED':
        return '#f59e0b'; // amber
      case 'TASK_COMPLETED':
        return '#10b981'; // green
      case 'APPROVAL_REQUEST':
        return '#8b5cf6'; // purple
      case 'APPROVAL_RESPONSE':
        return '#06b6d4'; // cyan
      case 'SYSTEM':
        return '#6366f1'; // indigo
      default:
        return '#6b7280'; // gray
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }) => {
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: theme.colors.surface,
            borderLeftColor: isUnread ? iconColor : 'transparent',
          },
          isUnread && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />}
            </View>
            
            <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {item.message}
            </Text>
            
            {item.relatedTask && (
              <View style={styles.taskInfo}>
                <Ionicons name="document-text" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.taskTitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {item.relatedTask.title}
                </Text>
              </View>
            )}
            
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const emptyMessages = {
      all: 'No notifications yet',
      unread: 'No unread notifications',
      read: 'No read notifications',
    };

    return (
      <View style={styles.emptyState}>
        <Ionicons 
          name="notifications-outline" 
          size={64} 
          color={theme.colors.textSecondary} 
          style={styles.emptyIcon}
        />
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          {emptyMessages[filter]}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopBar title="Notifications" showBack={false} />
      
      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[
            styles.filterText,
            { color: filter === 'all' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            All
          </Text>
          {filter === 'all' && unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[
            styles.filterText,
            { color: filter === 'unread' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Unread
          </Text>
          {filter === 'unread' && unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, filter === 'read' && styles.filterTabActive]}
          onPress={() => setFilter('read')}
        >
          <Text style={[
            styles.filterText,
            { color: filter === 'read' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#f3f4f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#f9fafb',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 12,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
