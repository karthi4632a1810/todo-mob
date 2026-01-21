import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { reportAPI, userAPI, departmentAPI, approvalAPI } from '../../services/api';
import Card from '../../common/components/Card';
import BarChart from '../../common/components/BarChart';
import PieChart from '../../common/components/PieChart';
import MiniLineChart from '../../common/components/MiniLineChart';
import { useTheme } from '../../common/theme/ThemeContext';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'departments', 'users', 'approvals'
  const [taskStats, setTaskStats] = useState(null);
  const [departmentStats, setDepartmentStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [approvalStats, setApprovalStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    // Only load data if user is authenticated
    if (isAuthenticated && user && token) {
      loadAllStats();
    }
  }, [user, isAuthenticated, token]);

  const loadAllStats = async () => {
    try {
      // Load all stats in parallel
      await Promise.all([
        loadTaskStats(),
        loadDepartmentStats(),
        loadUserStats(),
        loadApprovalStats(),
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTaskStats = async () => {
    try {
      const response = await reportAPI.getStats();
      setTaskStats(response.data.data.stats || response.data.stats);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading task stats:', error);
      }
    }
  };

  const loadDepartmentStats = async () => {
    try {
      const response = await departmentAPI.getDepartments();
      const departments = response.data.data?.departments || response.data.departments || [];
      const active = departments.filter(d => d.isActive !== false).length;
      const inactive = departments.filter(d => d.isActive === false).length;
      setDepartmentStats({
        total: departments.length,
        active,
        inactive,
        departments: departments.map(d => ({
          name: d.name,
          isActive: d.isActive !== false,
        })),
      });
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading department stats:', error);
      }
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await userAPI.getUsers();
      const users = response.data.data?.users || response.data.users || [];
      const directors = users.filter(u => u.role === 'DIRECTOR').length;
      const hods = users.filter(u => u.role === 'HOD').length;
      const employees = users.filter(u => u.role === 'EMPLOYEE').length;
      const active = users.filter(u => u.isActive !== false).length;
      const inactive = users.filter(u => u.isActive === false).length;
      setUserStats({
        total: users.length,
        directors,
        hods,
        employees,
        active,
        inactive,
      });
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading user stats:', error);
      }
    }
  };

  const loadApprovalStats = async () => {
    try {
      const response = await approvalAPI.getPendingApprovals();
      const approvals = response.data.data?.tasks || response.data.tasks || [];
      const pending = approvals.length;
      
      // Get all tasks to calculate approved/rejected counts
      const allTasksResponse = await reportAPI.getStats();
      const allTaskStats = allTasksResponse.data.data.stats || allTasksResponse.data.stats;
      
      setApprovalStats({
        pending,
        approved: allTaskStats?.completed || 0, // Completed tasks are likely approved
        rejected: allTaskStats?.cancelled || 0, // Cancelled might include rejected
        total: pending + (allTaskStats?.completed || 0) + (allTaskStats?.cancelled || 0),
      });
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading approval stats:', error);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllStats();
    setRefreshing(false);
  };

  // Prepare pie chart data for tasks
  const taskPieChartData = taskStats ? [
    { key: 'pending', value: taskStats.pending || 0 },
    { key: 'inProgress', value: taskStats.inProgress || 0 },
    { key: 'completed', value: taskStats.completed || 0 },
    { key: 'cancelled', value: taskStats.cancelled || 0 },
  ].filter(item => item.value > 0) : [];

  // Prepare pie chart data for departments
  const departmentPieChartData = departmentStats ? [
    { key: 'active', value: departmentStats.active || 0 },
    { key: 'inactive', value: departmentStats.inactive || 0 },
  ].filter(item => item.value > 0) : [];

  // Prepare pie chart data for users
  const userPieChartData = userStats ? [
    { key: 'directors', value: userStats.directors || 0 },
    { key: 'hods', value: userStats.hods || 0 },
    { key: 'employees', value: userStats.employees || 0 },
  ].filter(item => item.value > 0) : [];

  // Prepare pie chart data for approvals
  const approvalPieChartData = approvalStats ? [
    { key: 'pending', value: approvalStats.pending || 0 },
    { key: 'approved', value: approvalStats.approved || 0 },
    { key: 'rejected', value: approvalStats.rejected || 0 },
  ].filter(item => item.value > 0) : [];

  // Prepare weekly productivity data (sample data - replace with actual API data)
  const weeklyData = [3, 4, 5, 6, 4, 3, 2]; // Mon-Sun
  const weeklyLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const avgTasksPerDay = weeklyData.length > 0 
    ? (weeklyData.reduce((a, b) => a + b, 0) / weeklyData.length).toFixed(1)
    : '0.0';

  // Calculate percentage changes (sample - replace with actual data)
  const completedChange = '+12%';
  const inProgressChange = '+5%';

  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case 'tasks':
        return 'Task performance overview';
      case 'departments':
        return 'Department statistics overview';
      case 'users':
        return 'User statistics overview';
      case 'approvals':
        return 'Approval statistics overview';
      default:
        return 'Performance overview';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Purple Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
          style={styles.tabsScrollView}
        >
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
              onPress={() => setActiveTab('tasks')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'tasks' ? 'checkmark-circle' : 'checkmark-circle-outline'} 
                size={18} 
                color={activeTab === 'tasks' ? '#6366f1' : '#64748b'} 
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>
                Tasks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'departments' && styles.activeTab]}
              onPress={() => setActiveTab('departments')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'departments' ? 'business' : 'business-outline'} 
                size={18} 
                color={activeTab === 'departments' ? '#6366f1' : '#64748b'} 
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, activeTab === 'departments' && styles.activeTabText]}>
                Departments
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'users' && styles.activeTab]}
              onPress={() => setActiveTab('users')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'users' ? 'people' : 'people-outline'} 
                size={18} 
                color={activeTab === 'users' ? '#6366f1' : '#64748b'} 
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
                Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'approvals' && styles.activeTab]}
              onPress={() => setActiveTab('approvals')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'approvals' ? 'checkmark-done' : 'checkmark-done-outline'} 
                size={18} 
                color={activeTab === 'approvals' ? '#6366f1' : '#64748b'} 
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>
                Approvals
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.content}>
          {/* Tasks Tab Content */}
          {activeTab === 'tasks' && taskStats && (
            <Card style={styles.statisticsCard}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  Task Statistics
                </Text>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterButtonText}>Overall</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.chartContainer}>
                <PieChart 
                  data={taskPieChartData} 
                  total={taskStats.total || 0}
                />
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Pending
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {taskStats.pending || 0}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      In Progress
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {taskStats.inProgress || 0}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Completed
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {taskStats.completed || 0}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Cancelled
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {taskStats.cancelled || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Departments Tab Content */}
          {activeTab === 'departments' && departmentStats && (
            <Card style={styles.statisticsCard}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  Department Statistics
                </Text>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterButtonText}>Overall</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.chartContainer}>
                <PieChart 
                  data={departmentPieChartData} 
                  total={departmentStats.total || 0}
                />
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Active
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {departmentStats.active || 0}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Inactive
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {departmentStats.inactive || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Users Tab Content */}
          {activeTab === 'users' && userStats && (
            <Card style={styles.statisticsCard}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  User Statistics
                </Text>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterButtonText}>Overall</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.chartContainer}>
                <PieChart 
                  data={userPieChartData} 
                  total={userStats.total || 0}
                />
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Directors
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {userStats.directors || 0}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      HODs
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {userStats.hods || 0}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Employees
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {userStats.employees || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Approvals Tab Content */}
          {activeTab === 'approvals' && approvalStats && (
            <Card style={styles.statisticsCard}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  Approval Statistics
                </Text>
                <TouchableOpacity style={styles.filterButton}>
                  <Text style={styles.filterButtonText}>Overall</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.chartContainer}>
                <PieChart 
                  data={approvalPieChartData} 
                  total={approvalStats.total || 0}
                />
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Pending
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {approvalStats.pending || 0}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Approved
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {approvalStats.approved || 0}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text }]}>
                      Rejected
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {approvalStats.rejected || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Summary Cards - Tasks */}
          {activeTab === 'tasks' && taskStats && (
            <View style={styles.summaryCardsRow}>
            {/* Completed Card */}
            <Card style={[styles.summaryCard, { backgroundColor: '#d1fae5' }]}>
              <View style={styles.summaryCardHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={[styles.summaryChange, { color: '#10b981' }]}>
                  {completedChange}
                </Text>
              </View>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                {taskStats?.completed || 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: '#10b981' }]}>
                COMPLETED
              </Text>
              <View style={styles.miniChartContainer}>
                <MiniLineChart color="#10b981" />
              </View>
            </Card>

            {/* In Progress Card */}
            <Card style={[styles.summaryCard, { backgroundColor: '#e0e7ff' }]}>
              <View style={styles.summaryCardHeader}>
                <Ionicons name="time" size={24} color="#6366f1" />
                <Text style={[styles.summaryChange, { color: '#6366f1' }]}>
                  {inProgressChange}
                </Text>
              </View>
              <Text style={[styles.summaryValue, { color: '#6366f1' }]}>
                {taskStats?.inProgress || 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: '#6366f1' }]}>
                IN PROGRESS
              </Text>
              <View style={styles.miniChartContainer}>
                <MiniLineChart color="#6366f1" />
              </View>
            </Card>

            {/* Pending Card */}
            <Card style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
              <View style={styles.summaryCardHeader}>
                <Ionicons name="alert-circle" size={24} color="#f59e0b" />
              </View>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                {taskStats?.pending || 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: '#f59e0b' }]}>
                PENDING
              </Text>
              <View style={styles.miniChartContainer}>
                <MiniLineChart color="#f59e0b" />
              </View>
            </Card>
          </View>
          )}

          {/* Summary Cards - Departments */}
          {activeTab === 'departments' && departmentStats && (
            <View style={styles.summaryCardsRow}>
              <Card style={[styles.summaryCard, { backgroundColor: '#d1fae5' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  {departmentStats.active || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#10b981' }]}>
                  ACTIVE
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#10b981" />
                </View>
              </Card>

              <Card style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </View>
                <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                  {departmentStats.inactive || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#ef4444' }]}>
                  INACTIVE
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#ef4444" />
                </View>
              </Card>

              <Card style={[styles.summaryCard, { backgroundColor: '#e0e7ff' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="business" size={24} color="#6366f1" />
                </View>
                <Text style={[styles.summaryValue, { color: '#6366f1' }]}>
                  {departmentStats.total || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#6366f1' }]}>
                  TOTAL
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#6366f1" />
                </View>
              </Card>
            </View>
          )}

          {/* Summary Cards - Users */}
          {activeTab === 'users' && userStats && (
            <View style={styles.summaryCardsRow}>
              <Card style={[styles.summaryCard, { backgroundColor: '#e0e7ff' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="person" size={24} color="#6366f1" />
                </View>
                <Text style={[styles.summaryValue, { color: '#6366f1' }]}>
                  {userStats.directors || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#6366f1' }]}>
                  DIRECTORS
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#6366f1" />
                </View>
              </Card>

              <Card style={[styles.summaryCard, { backgroundColor: '#ede9fe' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="person-circle" size={24} color="#8b5cf6" />
                </View>
                <Text style={[styles.summaryValue, { color: '#8b5cf6' }]}>
                  {userStats.hods || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#8b5cf6' }]}>
                  HODs
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#8b5cf6" />
                </View>
              </Card>

              <Card style={[styles.summaryCard, { backgroundColor: '#d1fae5' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="people" size={24} color="#10b981" />
                </View>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  {userStats.employees || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#10b981' }]}>
                  EMPLOYEES
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#10b981" />
                </View>
              </Card>
            </View>
          )}

          {/* Summary Cards - Approvals */}
          {activeTab === 'approvals' && approvalStats && (
            <View style={styles.summaryCardsRow}>
              <Card style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="time" size={24} color="#f59e0b" />
                </View>
                <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                  {approvalStats.pending || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#f59e0b' }]}>
                  PENDING
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#f59e0b" />
                </View>
              </Card>

              <Card style={[styles.summaryCard, { backgroundColor: '#d1fae5' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  {approvalStats.approved || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#10b981' }]}>
                  APPROVED
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#10b981" />
                </View>
              </Card>

              <Card style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
                <View style={styles.summaryCardHeader}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </View>
                <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                  {approvalStats.rejected || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: '#ef4444' }]}>
                  REJECTED
                </Text>
                <View style={styles.miniChartContainer}>
                  <MiniLineChart color="#ef4444" />
                </View>
              </Card>
            </View>
          )}

          {/* Weekly Productivity Card - Only show for tasks */}
          {activeTab === 'tasks' && (
            <Card style={styles.productivityCard}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Weekly Productivity
              </Text>
              <View style={styles.dotsMenu}>
                <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
              </View>
            </View>
            <BarChart data={weeklyData} labels={weeklyLabels} />
            <View style={styles.productivityFooter}>
              <Text style={[styles.productivityLabel, { color: theme.colors.textSecondary }]}>
                Avg. Tasks / Day
              </Text>
              <Text style={[styles.productivityValue, { color: theme.colors.text }]}>
                {avgTasksPerDay}
              </Text>
            </View>
          </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  tabsScrollView: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    maxHeight: 60,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minHeight: 40,
  },
  activeTab: {
    backgroundColor: '#e0e7ff',
  },
  tabIcon: {
    marginRight: 5,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  statisticsCard: {
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    minHeight: 140,
    marginVertical: 0,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  miniChartContainer: {
    marginTop: 8,
  },
  productivityCard: {
    marginBottom: 20,
  },
  dotsMenu: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  productivityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  productivityLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  productivityValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});

