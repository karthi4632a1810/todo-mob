import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../common/theme/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TaskOptionsBottomSheet({ visible, onClose, task, user, onAction }) {
  const theme = useTheme();
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  const isDirector = user?.role === 'DIRECTOR';
  const isHOD = user?.role === 'HOD';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canTransfer = isDirector || isHOD;
  
  // Check if user can change priority
  const assignedById = task?.assignedBy?._id || task?.assignedBy;
  const userId = user?._id;
  const canChangePriority = isDirector || isHOD || 
    (assignedById && userId && assignedById.toString() === userId.toString()) ||
    (!isEmployee); // Allow non-employees to change priority

  // Build menu items - always show basic options
  const allMenuItems = [
    {
      id: 'share',
      label: 'Share Task',
      icon: 'share-outline',
      color: theme.colors?.primary || '#6366f1',
      available: true,
    },
    {
      id: 'copy',
      label: 'Copy Task Details',
      icon: 'clipboard-outline',
      color: theme.colors?.primary || '#6366f1',
      available: true,
    },
    {
      id: 'history',
      label: 'View Full History',
      icon: 'time-outline',
      color: theme.colors?.primary || '#6366f1',
      available: true,
    },
    {
      id: 'duplicate',
      label: 'Duplicate Task',
      icon: 'copy-outline',
      color: theme.colors?.primary || '#6366f1',
      available: isDirector || isHOD,
    },
    {
      id: 'priority',
      label: 'Change Priority',
      icon: 'flag-outline',
      color: '#f59e0b',
      available: canChangePriority,
    },
    {
      id: 'transfer',
      label: 'Transfer Task',
      icon: 'swap-horizontal-outline',
      color: '#3b82f6',
      available: canTransfer,
    },
    {
      id: 'related',
      label: 'View Related Tasks',
      icon: 'link-outline',
      color: theme.colors?.primary || '#6366f1',
      available: true,
    },
    {
      id: 'favorite',
      label: 'Add to Favorites',
      icon: 'star-outline',
      color: '#fbbf24',
      available: true,
    },
    {
      id: 'export',
      label: 'Export as PDF',
      icon: 'document-text-outline',
      color: '#ef4444',
      available: true,
    },
  ];

  // Filter available items - ensure at least basic items always show
  const menuItems = allMenuItems.filter(item => item.available);
  
  // Debug: Log if no items available
  if (menuItems.length === 0) {
    console.log('TaskOptionsBottomSheet: No menu items available', {
      isDirector,
      isHOD,
      isEmployee,
      canTransfer,
      canChangePriority,
      user: user?.role,
      task: !!task,
    });
  }
  
  // Force at least basic items to show if somehow all were filtered
  const finalMenuItems = menuItems.length > 0 ? menuItems : allMenuItems.slice(0, 3);
  
  // Debug log
  console.log('TaskOptionsBottomSheet render:', {
    visible,
    menuItemsCount: menuItems.length,
    finalMenuItemsCount: finalMenuItems.length,
    userRole: user?.role,
    hasTask: !!task,
  });

  const handleItemPress = (itemId) => {
    onClose();
    setTimeout(() => {
      onAction(itemId);
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  backgroundColor: theme.colors.surface || '#ffffff',
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  Task Options
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                nestedScrollEnabled={true}
              >
                <View style={styles.menuList}>
                  {finalMenuItems && finalMenuItems.length > 0 ? (
                    finalMenuItems.map((item, index) => {
                      const itemColor = item.color || '#6366f1';
                      const textColor = theme.colors?.text || '#000000';
                      const secondaryColor = theme.colors?.textSecondary || '#9ca3af';
                      const borderColor = theme.colors?.border || '#e0e0e0';
                      
                      return (
                        <TouchableOpacity
                          key={item.id || `item-${index}`}
                          style={[
                            styles.menuItem,
                            index !== finalMenuItems.length - 1 && { 
                              borderBottomWidth: 1, 
                              borderBottomColor: borderColor
                            },
                          ]}
                          onPress={() => handleItemPress(item.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.iconContainer, { backgroundColor: itemColor + '20' }]}>
                            <Ionicons name={item.icon} size={24} color={itemColor} />
                          </View>
                          <Text style={[styles.menuItemLabel, { color: textColor }]}>
                            {item.label}
                          </Text>
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={secondaryColor} 
                          />
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={[styles.emptyText, { color: theme.colors?.textSecondary || '#9ca3af' }]}>
                        No options available (Items: {finalMenuItems?.length || 0})
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: SCREEN_HEIGHT * 0.7,
    minHeight: 200,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  menuList: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    minHeight: 56,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

