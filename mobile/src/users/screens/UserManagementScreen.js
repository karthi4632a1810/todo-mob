import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { userAPI } from '../../services/api';
import { departmentAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Button from '../../common/components/Button';
import Picker from '../../common/components/Picker';
import { useTheme } from '../../common/theme/ThemeContext';

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department: '',
    isActive: true,
  });
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);

  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    // Wait for authentication to be established
    if (!isAuthenticated || !user || !token) {
      return;
    }
    
    if (user?.role !== 'DIRECTOR') {
      Alert.alert('Access Denied', 'Only Directors can manage users');
      navigation.goBack();
    } else {
      loadUsers();
      loadDepartments();
    }
  }, [user, isAuthenticated, token, navigation]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getUsers();
      const usersList = response.data.data.users || response.data.users || [];
      setUsers(usersList);
    } catch (error) {
      // Handle 401 (unauthorized) - token expired or invalid
      // Don't log or show alert - the API interceptor will handle token clearing
      if (error.response?.status === 401) {
        setUsers([]);
        return;
      }
      
      // Only log and show alert for non-401 errors
      console.error('Error loading users:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load users';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getDepartments();
      const depts = response.data.data.departments || response.data.departments || [];
      setDepartments(depts.map(dept => ({
        label: dept.name,
        value: dept.name
      })));
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
      department: '',
      isActive: true,
    });
    setErrors({});
    setModalVisible(true);
  };

  const openEditModal = (userData) => {
    setEditingUser(userData);
    setFormData({
      name: userData.name || '',
      email: userData.email || '',
      password: '', // Don't pre-fill password
      role: userData.role || 'EMPLOYEE',
      department: userData.department || '',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
    });
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!editingUser && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Verify token exists before making API call
    if (!token) {
      Alert.alert('Error', 'Authentication token is missing. Please log in again.');
      return;
    }

    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        department: formData.department,
        isActive: formData.isActive,
      };

      // Only include password if provided (for new users or password updates)
      if (formData.password) {
        userData.password = formData.password;
      }

      if (editingUser) {
        // Update
        await userAPI.updateUser(editingUser._id, userData);
        Alert.alert('Success', 'User updated successfully');
      } else {
        // Create
        await userAPI.createUser(userData);
        Alert.alert('Success', 'User created successfully');
      }
      setModalVisible(false);
      loadUsers();
    } catch (error) {
      let errorMessage = 'Failed to save user';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // If it's a 401 error, suggest re-login
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleToggleStatus = async (userData) => {
    const newStatus = !userData.isActive;
    const statusText = newStatus ? 'activate' : 'block';
    
    Alert.alert(
      `${newStatus ? 'Activate' : 'Block'} User`,
      `Are you sure you want to ${statusText} "${userData.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Activate' : 'Block',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await userAPI.updateUser(userData._id, { isActive: newStatus });
              Alert.alert('Success', `User ${statusText}ed successfully`);
              loadUsers();
            } catch (error) {
              let errorMessage = `Failed to ${statusText} user`;
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              }
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return users.filter(userItem => {
      const name = (userItem.name || '').toLowerCase();
      const email = (userItem.email || '').toLowerCase();
      const role = (userItem.role || '').toLowerCase();
      const department = (userItem.department || '').toLowerCase();
      
      return (
        name.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        department.includes(query)
      );
    });
  }, [users, searchQuery]);

  const getRoleColor = (role) => {
    switch (role) {
      case 'DIRECTOR':
        return theme.colors.primary;
      case 'HOD':
        return theme.colors.info;
      case 'EMPLOYEE':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  if (user?.role !== 'DIRECTOR') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Manage Users
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={openCreateModal}
            >
              <Text style={styles.addButtonText}>+ Add User</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Search by name, email, role, or department..."
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

          {loading && !refreshing && (
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading users...
            </Text>
          )}

          {filteredUsers.map((userItem) => (
            <Card key={userItem._id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.colors.text }]}>
                    {userItem.name}
                  </Text>
                  <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                    {userItem.email}
                  </Text>
                  <View style={styles.userMeta}>
                    <Text
                      style={[
                        styles.roleBadge,
                        {
                          color: getRoleColor(userItem.role),
                          backgroundColor: getRoleColor(userItem.role) + '20',
                        },
                      ]}
                    >
                      {userItem.role}
                    </Text>
                    <Text style={[styles.departmentText, { color: theme.colors.textSecondary }]}>
                      • {userItem.department}
                    </Text>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.info + '20' }]}
                    onPress={() => openEditModal(userItem)}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.colors.info }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: userItem.isActive
                          ? theme.colors.error + '20'
                          : theme.colors.success + '20',
                      },
                    ]}
                    onPress={() => handleToggleStatus(userItem)}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        {
                          color: userItem.isActive ? theme.colors.error : theme.colors.success,
                        },
                      ]}
                    >
                      {userItem.isActive ? 'Block' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.userFooter}>
                <Text
                  style={[
                    styles.statusBadge,
                    {
                      color: userItem.isActive ? theme.colors.success : theme.colors.textSecondary,
                      backgroundColor: userItem.isActive
                        ? theme.colors.success + '20'
                        : theme.colors.textSecondary + '20',
                    },
                  ]}
                >
                  {userItem.isActive ? 'Active' : 'Blocked'}
                </Text>
              </View>
            </Card>
          ))}

          {!loading && filteredUsers.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {searchQuery.trim() 
                  ? `No users found matching "${searchQuery}"` 
                  : 'No users found'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingUser ? 'Edit User' : 'Create User'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Input
                label="Name *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter user name"
                error={errors.name}
                required
              />

              <Input
                label="Email *"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                required
              />

              <Input
                label={editingUser ? 'Password (leave blank to keep current)' : 'Password *'}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password"
                secureTextEntry
                error={errors.password}
                required={!editingUser}
              />

              <Picker
                label="Role *"
                selectedValue={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                items={[
                  { label: 'Employee', value: 'EMPLOYEE' },
                  { label: 'Head of Department (HOD)', value: 'HOD' },
                ]}
                placeholder="Select role"
                error={errors.role}
                required
              />

              <Picker
                label="Department *"
                selectedValue={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
                items={departments}
                placeholder="Select department"
                error={errors.department}
                required
              />

              {editingUser && (
                <Picker
                  label="Status"
                  selectedValue={formData.isActive ? 'Active' : 'Blocked'}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value === 'Active' })}
                  items={[
                    { label: 'Active', value: 'Active' },
                    { label: 'Blocked', value: 'Blocked' },
                  ]}
                  placeholder="Select status"
                />
              )}

              <Button
                title={editingUser ? 'Update User' : 'Create User'}
                onPress={handleSave}
                style={styles.saveButton}
              />
            </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 32,
  },
  userCard: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  departmentText: {
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userFooter: {
    marginTop: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
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
  },
  saveButton: {
    marginTop: 8,
  },
  searchContainer: {
    marginBottom: 16,
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
    right: 12,
    top: 12,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

