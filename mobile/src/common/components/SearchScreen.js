import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { taskAPI, userAPI, departmentAPI, reportAPI, diaryAPI } from '../../services/api';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Get all search categories with icons (matching ActionBottomSheet)
const getAllSearchCategories = (canAccessApprovals, canAccessReports) => [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'checkmark-circle',
    iconColor: '#6366f1',
    backgroundColor: '#e0e7ff',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: 'checkmark-done',
    iconColor: '#3b82f6',
    backgroundColor: '#dbeafe',
    requiresDirector: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'bar-chart',
    iconColor: '#10b981',
    backgroundColor: '#d1fae5',
    requiresHOD: true,
  },
  {
    id: 'diary',
    label: 'Diary',
    icon: 'calendar',
    iconColor: '#6366f1',
    backgroundColor: '#e0e7ff',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: 'notifications',
    iconColor: '#ef4444',
    backgroundColor: '#fce7f3',
  },
  {
    id: 'departments',
    label: 'Departments',
    icon: 'business',
    iconColor: '#f59e0b',
    backgroundColor: '#fef3c7',
  },
  {
    id: 'users',
    label: 'Users',
    icon: 'people',
    iconColor: '#3b82f6',
    backgroundColor: '#dbeafe',
  },
];

export default function SearchScreen({ visible, onClose }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const { user } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const searchInputRef = useRef(null);

  const canAccessApprovals = user && user.role === 'DIRECTOR';
  const canAccessReports = user && (user.role === 'HOD' || user.role === 'DIRECTOR');

  const availableCategories = getAllSearchCategories(canAccessApprovals, canAccessReports).filter(
    (cat) => {
      if (cat.requiresDirector && !canAccessApprovals) return false;
      if (cat.requiresHOD && !canAccessReports) return false;
      return true;
    }
  );

  useEffect(() => {
    if (visible) {
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      setSearchQuery('');
      setSelectedCategory(null);
      setSearchResults([]);
    }
  }, [visible]);

  const performSearch = async (query, category) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let results = [];

      switch (category?.id || 'all') {
        case 'tasks':
          const tasksResponse = await taskAPI.getTasks({ search: query });
          const tasks = tasksResponse.data.data?.tasks || tasksResponse.data.tasks || [];
          results = tasks.map((task) => ({
            id: task._id,
            title: task.title,
            subtitle: task.status || 'Task',
            type: 'task',
            data: task,
          }));
          break;

        case 'users':
          const usersResponse = await userAPI.getUsers();
          const users = usersResponse.data.data?.users || usersResponse.data.users || [];
          results = users
            .filter((user) =>
              user.name?.toLowerCase().includes(query.toLowerCase()) ||
              user.email?.toLowerCase().includes(query.toLowerCase()) ||
              user.department?.toLowerCase().includes(query.toLowerCase())
            )
            .map((user) => ({
              id: user._id,
              title: user.name,
              subtitle: `${user.role} - ${user.department || 'No Department'}`,
              type: 'user',
              data: user,
            }));
          break;

        case 'departments':
          const deptResponse = await departmentAPI.getDepartments();
          const departments = deptResponse.data.data?.departments || deptResponse.data.departments || [];
          results = departments
            .filter((dept) => dept.name?.toLowerCase().includes(query.toLowerCase()))
            .map((dept) => ({
              id: dept._id,
              title: dept.name,
              subtitle: 'Department',
              type: 'department',
              data: dept,
            }));
          break;

        case 'diary':
          const diaryResponse = await diaryAPI.getDiaryEntries({ search: query });
          const diaryEntries = diaryResponse.data?.data?.diaries || diaryResponse.data?.diaries || [];
          results = diaryEntries
            .filter((entry) => {
              const searchLower = query.toLowerCase();
              return (
                entry.title?.toLowerCase().includes(searchLower) ||
                entry.content?.toLowerCase().includes(searchLower) ||
                entry.note?.toLowerCase().includes(searchLower)
              );
            })
            .map((entry) => ({
              id: entry._id,
              title: entry.title || entry.content || entry.note || 'Diary Entry',
              subtitle: entry.date ? new Date(entry.date).toLocaleDateString() : 'Diary',
              type: 'diary',
              data: entry,
            }));
          break;

        case 'all':
        default:
          // Search across all categories
          const allResults = [];
          
          // Search tasks
          try {
            const allTasksResponse = await taskAPI.getTasks({ search: query });
            const allTasks = allTasksResponse.data.data?.tasks || allTasksResponse.data.tasks || [];
            allResults.push(
              ...allTasks.map((task) => ({
                id: task._id,
                title: task.title,
                subtitle: task.status || 'Task',
                type: 'task',
                data: task,
              }))
            );
          } catch (e) {
            console.warn('Error searching tasks:', e);
          }

          // Search users
          try {
            const allUsersResponse = await userAPI.getUsers();
            const allUsers = allUsersResponse.data.data?.users || allUsersResponse.data.users || [];
            allResults.push(
              ...allUsers
                .filter((user) =>
                  user.name?.toLowerCase().includes(query.toLowerCase()) ||
                  user.email?.toLowerCase().includes(query.toLowerCase())
                )
                .map((user) => ({
                  id: user._id,
                  title: user.name,
                  subtitle: `${user.role} - ${user.department || 'No Department'}`,
                  type: 'user',
                  data: user,
                }))
            );
          } catch (e) {
            console.warn('Error searching users:', e);
          }

          // Search departments
          try {
            const allDeptResponse = await departmentAPI.getDepartments();
            const allDepartments = allDeptResponse.data.data?.departments || allDeptResponse.data.departments || [];
            allResults.push(
              ...allDepartments
                .filter((dept) => dept.name?.toLowerCase().includes(query.toLowerCase()))
                .map((dept) => ({
                  id: dept._id,
                  title: dept.name,
                  subtitle: 'Department',
                  type: 'department',
                  data: dept,
                }))
            );
          } catch (e) {
            console.warn('Error searching departments:', e);
          }

          // Search diary entries
          try {
            const allDiaryResponse = await diaryAPI.getDiaryEntries({});
            const allDiaries = allDiaryResponse.data?.data?.diaries || allDiaryResponse.data?.diaries || [];
            const searchLower = query.toLowerCase();
            allResults.push(
              ...allDiaries
                .filter((entry) => {
                  return (
                    entry.title?.toLowerCase().includes(searchLower) ||
                    entry.content?.toLowerCase().includes(searchLower) ||
                    entry.note?.toLowerCase().includes(searchLower)
                  );
                })
                .map((entry) => ({
                  id: entry._id,
                  title: entry.title || entry.content || entry.note || 'Diary Entry',
                  subtitle: entry.date ? new Date(entry.date).toLocaleDateString() : 'Diary',
                  type: 'diary',
                  data: entry,
                }))
            );
          } catch (e) {
            console.warn('Error searching diary entries:', e);
          }

          results = allResults;
          break;
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery, selectedCategory);
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory]);

  const handleResultPress = (result) => {
    // Add to search history
    setSearchHistory((prev) => {
      const newHistory = [result, ...prev.filter((item) => item.id !== result.id)].slice(0, 10);
      return newHistory;
    });

    // Close modal first
    onClose();

    // Small delay to ensure modal closes before navigation
    setTimeout(() => {
      try {
        switch (result.type) {
          case 'task':
            // Navigate to Tasks tab, then to TaskDetail screen
            navigation.navigate('Tasks', {
              screen: 'TaskDetail',
              params: { taskId: result.id },
            });
            break;
          case 'user':
            // Navigate to user management with specific user ID (only for Directors)
            if (user?.role === 'DIRECTOR') {
              navigation.navigate('Dashboard', {
                screen: 'UserManagement',
                params: { userId: result.id },
              });
            }
            break;
          case 'department':
            // Navigate to department management with specific department ID (only for Directors)
            if (user?.role === 'DIRECTOR') {
              navigation.navigate('Dashboard', {
                screen: 'DepartmentManagement',
                params: { departmentId: result.id },
              });
            }
            break;
          case 'diary':
            // Navigate to Diary tab, params will be available via route.params
            navigation.navigate('Diary', { diaryId: result.id });
            break;
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, 100);
  };

  const handleCategorySelect = (category) => {
    const newCategory = category && category.id === selectedCategory?.id ? null : category;
    setSelectedCategory(newCategory);
    if (searchQuery.trim()) {
      performSearch(searchQuery, newCategory);
    }
  };

  const getCategoryIcon = (categoryId) => {
    const category = availableCategories.find((cat) => cat.id === categoryId);
    return category?.icon || 'search';
  };

  const getCategoryColor = (categoryId) => {
    const category = availableCategories.find((cat) => cat.id === categoryId);
    return category?.iconColor || '#6366f1';
  };

  const renderResultItem = ({ item }) => {
    const categoryIcon = getCategoryIcon(item.type === 'task' ? 'tasks' : item.type === 'user' ? 'users' : item.type === 'department' ? 'departments' : 'diary');
    const categoryColor = getCategoryColor(item.type === 'task' ? 'tasks' : item.type === 'user' ? 'users' : item.type === 'department' ? 'departments' : 'diary');

    return (
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.resultIconContainer, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name={categoryIcon} size={24} color={categoryColor} />
        </View>
        <View style={styles.resultContent}>
          <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { width: '100%', height: '100%' }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    ref={searchInputRef}
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search tasks, users, departments..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                      <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Category Filters */}
              <View style={styles.categoriesContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesScrollContent}
                >
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      !selectedCategory && styles.categoryChipActive,
                      { backgroundColor: !selectedCategory ? '#6366f1' : theme.colors.surface },
                    ]}
                    onPress={() => {
                      setSelectedCategory(null);
                      if (searchQuery.trim()) {
                        performSearch(searchQuery, null);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: !selectedCategory ? '#ffffff' : theme.colors.text },
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {availableCategories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        selectedCategory?.id === category.id && styles.categoryChipActive,
                        {
                          backgroundColor:
                            selectedCategory?.id === category.id
                              ? category.iconColor
                              : theme.colors.surface,
                        },
                      ]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Ionicons
                        name={category.icon}
                        size={16}
                        color={selectedCategory?.id === category.id ? '#ffffff' : category.iconColor}
                        style={styles.categoryIcon}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color:
                              selectedCategory?.id === category.id ? '#ffffff' : theme.colors.text,
                          },
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Results */}
              <View style={styles.resultsContainer}>
                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                      Searching...
                    </Text>
                  </View>
                ) : searchQuery.trim() && searchResults.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search" size={64} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      No results found
                    </Text>
                    <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                      Try a different search term
                    </Text>
                  </View>
                ) : !searchQuery.trim() ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      Start typing to search
                    </Text>
                    <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                      Search across tasks, users, departments, and more
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    renderItem={renderResultItem}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    contentContainerStyle={styles.resultsList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            </View>
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
    justifyContent: 'flex-start',
  },
  container: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  closeButton: {
    padding: 8,
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    borderColor: 'transparent',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
  },
});
