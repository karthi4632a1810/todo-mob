import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fetchTasks } from '../../store/slices/taskSlice';
import { departmentAPI, userAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Picker from '../../common/components/Picker';
import DatePicker from '../../common/components/DatePicker';
import Button from '../../common/components/Button';
import { useTheme } from '../../common/theme/ThemeContext';

export default function TasksScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { tasks, isLoading } = useSelector((state) => state.tasks);
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Filter states
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'tomorrow', 'week', 'month', 'year', 'custom'
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  
  // Options for filters
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  const theme = useTheme();
  
  const statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Blocked', value: 'BLOCKED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];
  
  const priorityOptions = [
    { label: 'All Priority', value: '' },
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
  ];
  
  const dateFilterOptions = [
    { label: 'All Dates', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'Custom Range', value: 'custom' },
  ];

  useEffect(() => {
    // Only load tasks if user is authenticated and token exists
    if (isAuthenticated && user && user._id && token) {
      loadTasks();
      loadFilterOptions();
    }
  }, [user, isAuthenticated, token]);
  
  const loadFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      // Load departments
      const deptResponse = await departmentAPI.getDepartments();
      const depts = deptResponse.data.data.departments || deptResponse.data.departments || [];
      setDepartments([
        { label: 'All Departments', value: '' },
        ...depts.map(dept => ({ label: dept.name, value: dept.name }))
      ]);
      
      // Load users (for assigned to filter)
      const usersResponse = await userAPI.getUsers();
      const usersList = usersResponse.data.data.users || usersResponse.data.users || [];
      setUsers([
        { label: 'All Users', value: '' },
        ...usersList
          .filter(u => u.role === 'HOD' || u.role === 'EMPLOYEE')
          .map(u => ({ label: `${u.name} (${u.role})`, value: u._id }))
      ]);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadTasks = async () => {
    await dispatch(fetchTasks());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  // Helper function to get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (dateFilter) {
      case 'today':
        return { from: today, to: tomorrow };
      case 'yesterday':
        return { from: yesterday, to: today };
      case 'tomorrow':
        return { from: tomorrow, to: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return { from: weekStart, to: weekEnd };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return { from: monthStart, to: monthEnd };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear() + 1, 0, 1);
        return { from: yearStart, to: yearEnd };
      case 'custom':
        return customDateRange;
      default:
        return null;
    }
  };
  
  // Filter tasks based on all filters
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(task => {
        const title = (task.title || '').toLowerCase();
        const description = (task.description || '').toLowerCase();
        const assignedToName = (task.assignedTo?.name || '').toLowerCase();
        const status = (task.status || '').toLowerCase();
        const department = (task.department || '').toLowerCase();
        const priority = (task.priority || '').toLowerCase();
        
        return (
          title.includes(query) ||
          description.includes(query) ||
          assignedToName.includes(query) ||
          status.includes(query) ||
          department.includes(query) ||
          priority.includes(query)
        );
      });
    }
    
    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(task => task.status === selectedStatus);
    }
    
    // Priority filter
    if (selectedPriority) {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }
    
    // Department filter
    if (selectedDepartment) {
      filtered = filtered.filter(task => task.department === selectedDepartment);
    }
    
    // Assigned to filter
    if (selectedAssignedTo) {
      filtered = filtered.filter(task => task.assignedTo?._id === selectedAssignedTo);
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const dateRange = getDateRange();
      if (dateRange && dateRange.from && dateRange.to) {
        filtered = filtered.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate >= dateRange.from && taskDate < dateRange.to;
        });
      }
    }
    
    return filtered;
  }, [tasks, searchQuery, selectedStatus, selectedPriority, selectedDepartment, selectedAssignedTo, dateFilter, customDateRange]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return theme.colors.success;
      case 'IN_PROGRESS':
        return theme.colors.info;
      case 'PENDING':
        return theme.colors.warning;
      case 'CANCELLED':
        return theme.colors.error;
      case 'BLOCKED':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderTask = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}
    >
      <Card>
        <View style={styles.taskHeader}>
          <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status}
            </Text>
          </View>
        </View>
        {item.description && (
          <Text
            style={[styles.taskDescription, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
        <View style={styles.taskFooter}>
          <Text style={[styles.taskInfo, { color: theme.colors.textSecondary }]}>
            Assigned to: {item.assignedTo?.name || 'N/A'}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const hasActiveFilters = selectedStatus || selectedPriority || selectedDepartment || selectedAssignedTo || dateFilter !== 'all';
  
  const clearAllFilters = () => {
    setSelectedStatus('');
    setSelectedPriority('');
    setSelectedDepartment('');
    setSelectedAssignedTo('');
    setDateFilter('all');
    setCustomDateRange({ from: null, to: null });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Search tasks..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
            >
              <Text style={[styles.clearSearchText, { color: theme.colors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: hasActiveFilters ? theme.colors.primary : theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: hasActiveFilters ? '#ffffff' : theme.colors.text },
            ]}
          >
            {hasActiveFilters ? 'Filters Active' : 'Filter'}
          </Text>
          {hasActiveFilters && (
            <View style={styles.filterBadge}>
              <Text style={[styles.filterBadgeText, { color: theme.colors.primary }]}>
                {[
                  selectedStatus ? 1 : 0,
                  selectedPriority ? 1 : 0,
                  selectedDepartment ? 1 : 0,
                  selectedAssignedTo ? 1 : 0,
                  dateFilter !== 'all' ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {searchQuery.trim() 
                ? `No tasks found matching "${searchQuery}"` 
                : 'No tasks found'}
            </Text>
          </View>
        }
      />
      {user?.role === 'DIRECTOR' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('CreateTask')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Filter Tasks
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Picker
                label="Status"
                selectedValue={selectedStatus}
                onValueChange={setSelectedStatus}
                items={statusOptions}
                placeholder="All Status"
              />

              <Picker
                label="Priority"
                selectedValue={selectedPriority}
                onValueChange={setSelectedPriority}
                items={priorityOptions}
                placeholder="All Priority"
              />

              <Picker
                label="Department"
                selectedValue={selectedDepartment}
                onValueChange={setSelectedDepartment}
                items={departments}
                placeholder="All Departments"
                disabled={loadingFilters}
              />

              <Picker
                label="Assigned To"
                selectedValue={selectedAssignedTo}
                onValueChange={setSelectedAssignedTo}
                items={users}
                placeholder="All Users"
                disabled={loadingFilters}
                showSearch={true}
              />

              <Picker
                label="Date Filter"
                selectedValue={dateFilter}
                onValueChange={(value) => {
                  setDateFilter(value);
                  if (value === 'custom') {
                    setShowCustomDateModal(true);
                  }
                }}
                items={dateFilterOptions}
                placeholder="All Dates"
              />

              {dateFilter === 'custom' && (
                <View style={styles.customDateContainer}>
                  <DatePicker
                    label="From Date"
                    value={customDateRange.from}
                    onChange={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                    placeholder="Select start date"
                  />
                  <DatePicker
                    label="To Date"
                    value={customDateRange.to}
                    onChange={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                    placeholder="Select end date"
                    minimumDate={customDateRange.from}
                  />
                </View>
              )}

              {hasActiveFilters && (
                <Button
                  title="Clear All Filters"
                  onPress={clearAllFilters}
                  variant="outline"
                  style={styles.clearFiltersButton}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Apply Filters"
                onPress={() => setShowFilterModal(false)}
                style={styles.applyButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskInfo: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Increased from 16 to 80 to avoid overlap with bottom navigation bar
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    paddingRight: 40,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 28,
    top: 28,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchRow: {
    position: 'relative',
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  customDateContainer: {
    marginTop: 8,
  },
  clearFiltersButton: {
    marginTop: 16,
  },
  applyButton: {
    marginTop: 0,
  },
});

