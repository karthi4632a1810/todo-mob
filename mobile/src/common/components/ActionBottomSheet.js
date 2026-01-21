import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const QUICK_ACTIONS_PREFERENCES_KEY = 'quickActionsPreferences';

// Define all action items outside component so it can be used in loadPreferences
const getAllActionItems = (canAccessApprovals) => [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'checkmark-circle',
    iconType: 'solid',
    navigateTo: { tab: 'Tasks' },
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: 'checkmark-done',
    iconType: 'solid',
    navigateTo: { tab: 'Approvals' },
    requiresDirector: true, // Only Directors can access
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'bar-chart',
    iconType: 'solid',
    navigateTo: { tab: 'Reports' },
  },
  {
    id: 'diary',
    label: 'Diary',
    icon: 'calendar',
    iconType: 'solid',
    navigateTo: { tab: 'Diary' },
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: 'notifications',
    iconType: 'solid',
    navigateTo: { tab: 'Notifications' },
  },
  {
    id: 'departments',
    label: 'Dept',
    icon: 'business',
    iconType: 'solid',
    navigateTo: { tab: 'Dashboard', screen: 'DepartmentManagement' },
  },
  {
    id: 'users',
    label: 'Users',
    icon: 'people',
    iconType: 'solid',
    navigateTo: { tab: 'Dashboard', screen: 'UserManagement' },
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    iconType: 'solid',
    navigateTo: { tab: 'Profile' },
  },
];

export default function ActionBottomSheet({ visible, onClose }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const { user } = useSelector((state) => state.auth);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedActionIds, setSelectedActionIds] = useState([]);
  
  // Only Directors can access Approvals
  const canAccessApprovals = user && user.role === 'DIRECTOR';
  
  // Get all action items
  const allActionItems = getAllActionItems(canAccessApprovals);

  // Load user preferences on mount and when visible
  useEffect(() => {
    if (visible) {
      loadPreferences();
    }
  }, [visible]);

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!visible) {
      setIsEditMode(false);
    }
  }, [visible]);

  const getDefaultActionIds = () => {
    return allActionItems
      .filter(item => {
        if (item.requiresDirector && !canAccessApprovals) return false;
        return true;
      })
      .map(item => item.id);
  };

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem(QUICK_ACTIONS_PREFERENCES_KEY);
      if (saved) {
        const preferences = JSON.parse(saved);
        // Filter to only include valid action IDs that user can access
        const validIds = preferences.filter(id => {
          const item = allActionItems.find(i => i.id === id);
          if (!item) return false;
          if (item.requiresDirector && !canAccessApprovals) return false;
          return true;
        });
        setSelectedActionIds(validIds.length > 0 ? validIds : getDefaultActionIds());
      } else {
        setSelectedActionIds(getDefaultActionIds());
      }
    } catch (error) {
      console.error('Error loading quick actions preferences:', error);
      setSelectedActionIds(getDefaultActionIds());
    }
  };

  // Get available actions (filtered by role)
  const availableActionItems = allActionItems.filter(item => {
    if (item.requiresDirector && !canAccessApprovals) {
      return false;
    }
    return true;
  });

  // In edit mode, show all available actions. Otherwise, show only selected ones
  const displayItems = isEditMode 
    ? availableActionItems 
    : availableActionItems.filter(item => selectedActionIds.includes(item.id));

  const savePreferences = async (newSelectedIds) => {
    try {
      await AsyncStorage.setItem(QUICK_ACTIONS_PREFERENCES_KEY, JSON.stringify(newSelectedIds));
      setSelectedActionIds(newSelectedIds);
    } catch (error) {
      console.error('Error saving quick actions preferences:', error);
    }
  };

  const toggleActionItem = (itemId) => {
    const newSelectedIds = selectedActionIds.includes(itemId)
      ? selectedActionIds.filter(id => id !== itemId)
      : [...selectedActionIds, itemId];
    savePreferences(newSelectedIds);
  };

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

  // Get icon color for each action
  const getIconColor = (id) => {
    const colorMap = {
      'tasks': '#6366f1',        // Purple
      'approvals': '#3b82f6',     // Blue
      'reports': '#10b981',       // Green
      'diary': '#6366f1',         // Purple
      'alerts': '#ef4444',        // Red
      'departments': '#f59e0b',   // Orange
      'users': '#3b82f6',         // Blue (matching design)
      'settings': '#64748b',      // Dark Gray
    };
    return colorMap[id] || '#6366f1';
  };

  // Get card background color for each action
  const getCardBackgroundColor = (id) => {
    const colorMap = {
      'tasks': '#e0e7ff',         // Light Purple
      'approvals': '#dbeafe',     // Light Blue
      'reports': '#d1fae5',       // Light Green
      'diary': '#e0e7ff',         // Light Purple
      'alerts': '#fce7f3',        // Light Pink
      'departments': '#fef3c7',   // Light Orange/Yellow
      'users': '#dbeafe',         // Light Blue
      'settings': '#f1f5f9',      // Light Gray
    };
    return colorMap[id] || '#f1f5f9';
  };

  const handleItemPress = (item) => {
    if (isEditMode) {
      // In edit mode, toggle selection
      toggleActionItem(item.id);
    } else {
      // Normal mode: navigate
      onClose();
      // Small delay to ensure bottom sheet closes before navigation
      setTimeout(() => {
        try {
          if (item.navigateTo.screen) {
            // Navigate to nested screen within a tab
            navigation.navigate(item.navigateTo.tab, {
              screen: item.navigateTo.screen,
              params: item.navigateTo.params || {},
            });
          } else {
            // Navigate to the tab (which contains the stack)
            navigation.navigate(item.navigateTo.tab);
          }
        } catch (error) {
          console.error('Navigation error:', error);
        }
      }, 100);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  {isEditMode ? 'Edit Quick Actions' : 'Quick Actions'}
                </Text>
                <View style={styles.headerRight}>
                  <TouchableOpacity 
                    onPress={() => setIsEditMode(!isEditMode)} 
                    style={[styles.iconButton, isEditMode && styles.iconButtonActive]}
                  >
                    <Ionicons 
                      name={isEditMode ? "checkmark" : "settings"} 
                      size={20} 
                      color={isEditMode ? "#6366f1" : "#64748b"} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.grid}>
                {displayItems.map((item) => {
                  const isSelected = selectedActionIds.includes(item.id);
                  const isDisabled = isEditMode && !isSelected;
                  
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.gridItem,
                        isEditMode && styles.gridItemEditMode,
                        isDisabled && styles.gridItemDisabled,
                      ]}
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.iconWrapper}>
                        <View
                          style={[
                            styles.iconContainer,
                            { backgroundColor: getIconColor(item.id) + '20' }, // 20 = ~12% opacity
                            isDisabled && styles.iconContainerDisabled,
                          ]}
                        >
                          <Ionicons
                            name={item.icon}
                            size={28}
                            color={isDisabled ? '#cbd5e1' : getIconColor(item.id)}
                          />
                        </View>
                        {isEditMode && (
                          <View style={[
                            styles.checkmarkBadge,
                            isSelected && styles.checkmarkBadgeActive
                          ]}>
                            <Ionicons
                              name={isSelected ? "checkmark" : "add"}
                              size={16}
                              color={isSelected ? "#ffffff" : "#64748b"}
                            />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.gridItemLabel, 
                          { color: theme.colors.text },
                          isDisabled && styles.gridItemLabelDisabled
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

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
    width: '100%',
    height: '100%',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 0,
    maxHeight: SCREEN_HEIGHT * 0.7,
    backgroundColor: '#ffffff',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#e0e7ff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  gridItem: {
    width: (SCREEN_WIDTH - 40) / 4, // 4 columns: (screen width - horizontal padding * 2) / 4
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  gridItemEditMode: {
    position: 'relative',
  },
  gridItemDisabled: {
    opacity: 0.5,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainerDisabled: {
    opacity: 0.4,
  },
  checkmarkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkBadgeActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  gridItemLabel: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
    color: '#1e293b',
  },
  gridItemLabelDisabled: {
    color: '#94a3b8',
  },
});

