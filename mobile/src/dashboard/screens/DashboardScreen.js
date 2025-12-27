import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTasks } from '../../store/slices/taskSlice';
import { reportAPI, userAPI, departmentAPI } from '../../services/api';
import Card from '../../common/components/Card';
import DatePicker from '../../common/components/DatePicker';
import Picker from '../../common/components/Picker';
import BarChart from '../../common/components/BarChart';
import { useTheme } from '../../common/theme/ThemeContext';

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const { tasks, isLoading } = useSelector((state) => state.tasks);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'tomorrow', 'week', 'month', 'year', 'custom'
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  
  // Director-only filters
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedHOD, setSelectedHOD] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [allEmployees, setAllEmployees] = useState([]); // Store all employees
  const [allHods, setAllHods] = useState([]); // Store all HODs
  const [filteredEmployees, setFilteredEmployees] = useState([]); // Filtered by department
  const [filteredHods, setFilteredHods] = useState([]); // Filtered by department
  const [departments, setDepartments] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  const theme = useTheme();
  const isDirector = user?.role === 'DIRECTOR';

  useEffect(() => {
    // Only load data if user is authenticated and token exists
    if (isAuthenticated && user && user._id && token) {
      loadData();
      if (isDirector) {
        loadFilterOptions();
      }
    }
  }, [user, isAuthenticated, token, dateFilter, customDateRange, selectedEmployee, selectedHOD, selectedDepartment]);

  // Filter HODs and Employees based on selected department
  useEffect(() => {
    if (isDirector && selectedDepartment) {
      // Filter HODs by department
      const deptHods = allHods.filter(hod => {
        // Extract department from label like "Dr. Sarah Johnson (General Medicine)"
        const match = hod.label.match(/\(([^)]+)\)/);
        return match && match[1] === selectedDepartment;
      });
      setFilteredHods(deptHods);

      // Filter Employees by department
      const deptEmployees = allEmployees.filter(emp => {
        // Extract department from label like "John Smith (General Medicine)"
        const match = emp.label.match(/\(([^)]+)\)/);
        return match && match[1] === selectedDepartment;
      });
      setFilteredEmployees(deptEmployees);
    } else {
      // Clear filtered lists when no department is selected
      setFilteredHods([]);
      setFilteredEmployees([]);
    }
  }, [selectedDepartment, allHods, allEmployees, isDirector]);

  const getDateRange = () => {
    const now = new Date();
    let fromDate = null;
    let toDate = null;

    switch (dateFilter) {
      case 'today':
        fromDate = new Date(now);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setDate(toDate.getDate() - 1);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'tomorrow':
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() + 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setDate(toDate.getDate() + 1);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 7);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        fromDate = new Date(now);
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          fromDate = new Date(customDateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date(customDateRange.to);
          toDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        // 'all' - no date filter
        return {};
    }

    if (fromDate && toDate) {
      return {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      };
    }
    return {};
  };

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchTasks()),
      loadStats(),
    ]);
  };

  const loadFilterOptions = async () => {
    if (!isDirector) return;
    
    setLoadingFilters(true);
    try {
      // Load departments
      const deptResponse = await departmentAPI.getDepartments();
      const depts = deptResponse.data.data.departments || deptResponse.data.departments || [];
      setDepartments(depts.map(dept => ({
        label: dept.name,
        value: dept.name
      })));

      // Load all HODs (we'll filter by department later)
      const hodResponse = await userAPI.getUsersForAssignment({ role: 'HOD' });
      const hodUsers = hodResponse.data.data.users || hodResponse.data.users || [];
      const hodList = hodUsers.map(hod => ({
        label: `${hod.name} (${hod.department})`,
        value: hod._id
      }));
      setAllHods(hodList);

      // Load all employees (we'll filter by department later)
      const empResponse = await userAPI.getUsersForAssignment({ role: 'EMPLOYEE' });
      const empUsers = empResponse.data.data.users || empResponse.data.users || [];
      const empList = empUsers.map(emp => ({
        label: `${emp.name} (${emp.department})`,
        value: emp._id
      }));
      setAllEmployees(empList);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadStats = async () => {
    try {
      const dateRange = getDateRange();
      const params = { ...dateRange };
      
      // Add Director-only filters
      // Department must be selected first, then HOD or Employee
      if (isDirector) {
        if (selectedDepartment) {
          params.department = selectedDepartment;
        }
        if (selectedEmployee) {
          params.employeeId = selectedEmployee;
        }
        if (selectedHOD) {
          params.hodId = selectedHOD;
        }
      }
      
      const response = await reportAPI.getStats(params);
      // Backend returns: { success, message, data: { stats }, errors }
      setStats(response.data.data.stats || response.data.stats);
    } catch (error) {
      // Don't log 401 errors - they're handled by the interceptor
      if (error.response?.status !== 401) {
        console.error('Error loading stats:', error);
      }
      // Set default stats on error
      setStats({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCustomDateApply = () => {
    if (!customDateRange.from || !customDateRange.to) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }
    if (new Date(customDateRange.from) > new Date(customDateRange.to)) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }
    setShowCustomDateModal(false);
    setDateFilter('custom');
  };


  // Prepare chart data
  const chartData = [
    stats?.pending || 0,
    stats?.inProgress || 0,
    stats?.completed || 0,
    stats?.cancelled || 0
  ];
  const chartLabels = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

  const filterButtons = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <Text style={[styles.welcome, { color: theme.colors.text }]}>
          Welcome, {user?.name}
        </Text>
        <Text style={[styles.role, { color: theme.colors.textSecondary }]}>
          {user?.role} • {user?.department}
        </Text>

        {/* Date Filter Buttons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filterButtons.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                {
                  backgroundColor: dateFilter === filter.value 
                    ? theme.colors.primary 
                    : theme.colors.surface,
                  borderColor: dateFilter === filter.value 
                    ? theme.colors.primary 
                    : theme.colors.border,
                }
              ]}
              onPress={() => {
                if (filter.value === 'custom') {
                  setShowCustomDateModal(true);
                } else {
                  setDateFilter(filter.value);
                }
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: dateFilter === filter.value 
                      ? '#ffffff' 
                      : theme.colors.text,
                  }
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Director-only Filters */}
        {isDirector && (
          <Card style={styles.directorFiltersCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>
              Filter By
            </Text>
            
            <Picker
              label="Department *"
              selectedValue={selectedDepartment}
              onValueChange={(value) => {
                setSelectedDepartment(value);
                // Clear employee and HOD when department changes
                setSelectedEmployee('');
                setSelectedHOD('');
              }}
              items={[
                { label: 'Select Department', value: '' },
                ...departments
              ]}
              placeholder="Select department first"
              required
            />

            <Picker
              label="HOD (Head of Department)"
              selectedValue={selectedHOD}
              onValueChange={(value) => {
                setSelectedHOD(value);
                // Clear employee when HOD is selected
                setSelectedEmployee('');
              }}
              items={filteredHods}
              placeholder={selectedDepartment ? (filteredHods.length > 0 ? 'Select HOD' : 'No HODs in this department') : 'Select department first'}
              disabled={loadingFilters || !selectedDepartment || filteredHods.length === 0}
            />

            <Picker
              label="Employee"
              selectedValue={selectedEmployee}
              onValueChange={(value) => {
                setSelectedEmployee(value);
                // Clear HOD when employee is selected
                setSelectedHOD('');
              }}
              items={filteredEmployees}
              placeholder={selectedDepartment ? (filteredEmployees.length > 0 ? 'Select employee' : 'No employees in this department') : 'Select department first'}
              disabled={loadingFilters || !selectedDepartment || filteredEmployees.length === 0}
            />

            {(selectedEmployee || selectedHOD || selectedDepartment) && (
              <TouchableOpacity
                style={[styles.clearFiltersButton, { borderColor: theme.colors.error }]}
                onPress={() => {
                  setSelectedEmployee('');
                  setSelectedHOD('');
                  setSelectedDepartment('');
                }}
              >
                <Text style={[styles.clearFiltersText, { color: theme.colors.error }]}>
                  Clear All Filters
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Task Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.statValueWhite}>
              {stats?.pending || 0}
            </Text>
            <Text style={styles.statLabelWhite}>
              Pending Task
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.info }]}>
            <Text style={styles.statValueWhite}>
              {stats?.inProgress || 0}
            </Text>
            <Text style={styles.statLabelWhite}>
              In Progress Task
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
            <Text style={styles.statValueWhite}>
              {stats?.completed || 0}
            </Text>
            <Text style={styles.statLabelWhite}>
              Completed Task
            </Text>
          </View>
        </View>

        {/* Bar Chart */}
        <Card style={styles.chartCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Task Statistics
          </Text>
          <View style={styles.chartContainer}>
            <BarChart data={chartData} labels={chartLabels} />
          </View>
        </Card>

        {/* Quick Actions Grid */}
        <Card style={styles.quickActionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {/* Tasks */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Tasks')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Tasks</Text>
            </TouchableOpacity>

            {/* Approvals */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Approvals')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="checkmark-done" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Approvals</Text>
            </TouchableOpacity>

            {/* Reports */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Reports')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="bar-chart" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Reports</Text>
            </TouchableOpacity>

            {/* Diary */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Diary')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="calendar" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Diary</Text>
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="notifications" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Notifications</Text>
            </TouchableOpacity>

            {/* Departments - Director only */}
            {user?.role === 'DIRECTOR' && (
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => navigation.navigate('DepartmentManagement')}
              >
                <View style={[styles.quickActionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="business" size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Departments</Text>
              </TouchableOpacity>
            )}

            {/* Users - Director only */}
            {user?.role === 'DIRECTOR' && (
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => navigation.navigate('UserManagement')}
              >
                <View style={[styles.quickActionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="people" size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>Users</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </View>

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Custom Date Range
              </Text>
              <TouchableOpacity onPress={() => setShowCustomDateModal(false)}>
                <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <DatePicker
                label="From Date *"
                value={customDateRange.from}
                onChange={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                placeholder="Select start date"
                required
              />
              <DatePicker
                label="To Date *"
                value={customDateRange.to}
                onChange={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                placeholder="Select end date"
                minimumDate={customDateRange.from || new Date()}
                required
              />
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCustomDateApply}
              >
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    marginBottom: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValueWhite: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabelWhite: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  chartCard: {
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  quickActionsCard: {
    marginTop: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 20,
  },
  quickActionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
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
  },
  applyButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  directorFiltersCard: {
    marginBottom: 16,
  },
  clearFiltersButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
