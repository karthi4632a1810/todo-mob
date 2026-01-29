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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../../services/api';
import { departmentAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Button from '../../common/components/Button';
import Picker from '../../common/components/Picker';
import { useTheme } from '../../common/theme/ThemeContext';

export default function UserManagementScreen() {
  const route = useRoute();
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
  const [changePassword, setChangePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);

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

  // Handle route params to open specific user
  useFocusEffect(
    React.useCallback(() => {
      const userId = route.params?.userId;
      if (userId && users.length > 0 && !editingUser) {
        const userToEdit = users.find((u) => u._id === userId);
        if (userToEdit) {
          // Small delay to ensure users are loaded
          setTimeout(() => {
            openEditModal(userToEdit);
          }, 300);
        } else {
          // User not in current list, might be blocked - try to load
          loadUsers().then(() => {
            const userToEdit = users.find((u) => u._id === userId);
            if (userToEdit) {
              setTimeout(() => {
                openEditModal(userToEdit);
              }, 300);
            }
          });
        }
      }
    }, [route.params?.userId, users, editingUser])
  );

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
    setChangePassword(true);
    setShowPassword(false);
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
    setChangePassword(false);
    setShowPassword(false);
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
    } else if (editingUser && changePassword && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!editingUser && formData.password && formData.password.length < 6) {
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

  // Filter users based on search query (only active users)
  const filteredUsers = useMemo(() => {
    const activeUsers = users.filter(userItem => userItem.isActive);
    if (!searchQuery.trim()) {
      return activeUsers;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return activeUsers.filter(userItem => {
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

  // Get blocked users
  const blockedUsers = useMemo(() => {
    return users.filter(userItem => !userItem.isActive);
  }, [users]);

  const handleUnblock = async (userData) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock "${userData.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              await userAPI.updateUser(userData._id, { isActive: true });
              Alert.alert('Success', 'User unblocked successfully');
              loadUsers();
            } catch (error) {
              let errorMessage = 'Failed to unblock user';
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

  const getRoleColor = (role) => {
    switch (role) {
      case 'DIRECTOR':
      case 'PROFESSOR':
        return theme.colors.primary;
      case 'HOD':
        return theme.colors.info;
      case 'EMPLOYEE':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getRoleTextColor = (role) => {
    switch (role) {
      case 'DIRECTOR':
      case 'PROFESSOR':
        return '#ffffff';
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
      {/* Top Bar with Rounded Bottom */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Manage Users</Text>
          <TouchableOpacity 
            onPress={() => setShowBlockedUsersModal(true)} 
            style={styles.blockIconButton}
          >
            <Ionicons name="ban" size={24} color="#ffffff" />
            {blockedUsers.length > 0 && (
              <View style={styles.blockBadge}>
                <Text style={styles.blockBadgeText}>{blockedUsers.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Search Bar inside Header */}
        <View style={styles.searchContainerInHeader}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          </View>
          <TextInput
            style={styles.searchInputInHeader}
            placeholder="Search by name, role, or email..."
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
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* All Users Header */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              All Users
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={openCreateModal}
            >
              <Ionicons name="add" size={20} color="#ffffff" style={styles.addIcon} />
              <Text style={styles.addButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing && (
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading users...
            </Text>
          )}

          {filteredUsers.map((userItem) => (
            <Card key={userItem._id} style={styles.userCard}>
              <View style={styles.userCardContent}>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.colors.text }]}>
                    {userItem.name}
                  </Text>
                  <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                    {userItem.email}
                  </Text>
                  <View style={styles.userMeta}>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor: 
                            userItem.role === 'DIRECTOR' || userItem.role === 'PROFESSOR'
                              ? getRoleColor(userItem.role)
                              : getRoleColor(userItem.role) + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          {
                            color: getRoleTextColor(userItem.role),
                          },
                        ]}
                      >
                        {userItem.role}
                      </Text>
                    </View>
                    <Text style={[styles.departmentText, { color: theme.colors.textSecondary }]}>
                      • {userItem.department}
                    </Text>
                  </View>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: userItem.isActive
                            ? theme.colors.success
                            : theme.colors.textSecondary,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: userItem.isActive
                            ? theme.colors.success
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {userItem.isActive ? 'Active' : 'Offline'}
                    </Text>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.info + '20' }]}
                    onPress={() => openEditModal(userItem)}
                  >
                    <Ionicons name="pencil" size={16} color={theme.colors.info} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.info }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: theme.colors.error + '20',
                      },
                    ]}
                    onPress={() => handleToggleStatus(userItem)}
                  >
                    <Ionicons name="ban" size={16} color={theme.colors.error} />
                    <Text
                      style={[
                        styles.actionButtonText,
                        {
                          color: theme.colors.error,
                        },
                      ]}
                    >
                      Block
                    </Text>
                  </TouchableOpacity>
                </View>
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
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingUser ? 'Edit User' : 'Create User'}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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

              {/* Password Field with Toggle */}
              <View style={styles.passwordSection}>
                <View style={styles.passwordLabelRow}>
                  <Text style={[styles.passwordLabel, { color: theme.colors.text }]}>
                    Password
                  </Text>
                  {editingUser && (
                    <View style={styles.changePasswordRow}>
                      <Text style={[styles.changePasswordText, { color: theme.colors.text, marginRight: 10 }]}>
                        Change Password
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setChangePassword(!changePassword);
                          if (!changePassword) {
                            setFormData({ ...formData, password: '' });
                          }
                        }}
                        style={[
                          styles.toggleSwitch,
                          changePassword && { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <View
                          style={[
                            styles.toggleThumb,
                            changePassword && styles.toggleThumbActive,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {(changePassword || !editingUser) && (
                  <View>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          {
                            borderColor: errors.password ? theme.colors.error : theme.colors.border,
                            color: theme.colors.text,
                          },
                        ]}
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                        placeholderTextColor={theme.colors.textSecondary}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <Text style={[styles.errorText, { color: theme.colors.error }]}>
                        {errors.password}
                      </Text>
                    )}
                    {editingUser && changePassword && (
                      <Text style={[styles.passwordHint, { color: theme.colors.textSecondary }]}>
                        Leave blank to keep current password.
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <Picker
                label="Role *"
                selectedValue={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                items={[
                  { label: 'Director', value: 'DIRECTOR' },
                  { label: 'Head of Department (HOD)', value: 'HOD' },
                  { label: 'Employee', value: 'EMPLOYEE' },
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

              <Button
                title={editingUser ? 'Update User' : 'Create User'}
                onPress={handleSave}
                style={styles.saveButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal
        visible={showBlockedUsersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBlockedUsersModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Blocked Users ({blockedUsers.length})
              </Text>
              <TouchableOpacity 
                onPress={() => setShowBlockedUsersModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {blockedUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No blocked users
                  </Text>
                </View>
              ) : (
                blockedUsers.map((userItem) => (
                  <Card key={userItem._id} style={styles.userCard}>
                    <View style={styles.userCardContent}>
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: theme.colors.text }]}>
                          {userItem.name}
                        </Text>
                        <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                          {userItem.email}
                        </Text>
                        <View style={styles.userMeta}>
                          <View
                            style={[
                              styles.roleBadge,
                              {
                                backgroundColor: 
                                  userItem.role === 'DIRECTOR' || userItem.role === 'PROFESSOR'
                                    ? getRoleColor(userItem.role)
                                    : getRoleColor(userItem.role) + '20',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleBadgeText,
                                {
                                  color: getRoleTextColor(userItem.role),
                                },
                              ]}
                            >
                              {userItem.role}
                            </Text>
                          </View>
                          <Text style={[styles.departmentText, { color: theme.colors.textSecondary }]}>
                            • {userItem.department}
                          </Text>
                        </View>
                        <View style={styles.statusContainer}>
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor: theme.colors.textSecondary,
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: theme.colors.textSecondary,
                              },
                            ]}
                          >
                            Blocked
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: theme.colors.success + '20',
                          },
                        ]}
                        onPress={() => handleUnblock(userItem)}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                        <Text
                          style={[
                            styles.actionButtonText,
                            {
                              color: theme.colors.success,
                            },
                          ]}
                        >
                          Unblock
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
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
    backgroundColor: '#f8fafc',
  },
  topBarContainer: {
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 20,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  topBar: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  backButtonPlaceholder: {
    width: 32,
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  blockIconButton: {
    padding: 4,
    position: 'relative',
  },
  blockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  blockBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainerInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInputInHeader: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    ...{
      shadowColor: '#6366f1',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  addIcon: {
    marginRight: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 32,
  },
  userCard: {
    marginBottom: 16,
    padding: 20,
  },
  userCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    marginRight: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
    color: '#64748b',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  departmentText: {
    fontSize: 13,
    color: '#64748b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'column',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
    },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#1e293b',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  passwordSection: {
    marginBottom: 20,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  changePasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  passwordInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 48,
    fontSize: 16,
    minHeight: 52,
    backgroundColor: '#ffffff',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  passwordHint: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 8,
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
  clearSearchText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});


