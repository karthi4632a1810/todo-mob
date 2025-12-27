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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ActionBottomSheet({ visible, onClose }) {
  const navigation = useNavigation();
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

  const actionItems = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: 'checkmark-circle',
      navigateTo: { tab: 'Tasks' },
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: 'checkmark-done',
      navigateTo: { tab: 'Approvals' },
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'bar-chart',
      navigateTo: { tab: 'Reports' },
    },
    {
      id: 'diary',
      label: 'Diary',
      icon: 'calendar',
      navigateTo: { tab: 'Diary' },
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications',
      navigateTo: { tab: 'Notifications' },
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: 'business',
      navigateTo: { tab: 'Dashboard', screen: 'DepartmentManagement' },
    },
    {
      id: 'users',
      label: 'Users',
      icon: 'people',
      navigateTo: { tab: 'Dashboard', screen: 'UserManagement' },
    },
  ];

  const handleItemPress = (item) => {
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
                  backgroundColor: theme.colors.surface,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  Quick Actions
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.grid}>
                {actionItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.gridItem,
                      { backgroundColor: theme.colors.background },
                    ]}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: theme.colors.primary + '20' },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={28}
                        color={theme.colors.primary}
                      />
                    </View>
                    <Text
                      style={[styles.gridItemLabel, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
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
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: SCREEN_HEIGHT * 0.6,
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
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  gridItem: {
    width: '25%', // 4 columns
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridItemLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});

