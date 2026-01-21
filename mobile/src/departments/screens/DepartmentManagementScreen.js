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
import { Ionicons } from '@expo/vector-icons';
import { departmentAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Button from '../../common/components/Button';
import TopBar from '../../common/components/TopBar';
import FloatingActionButton from '../../common/components/FloatingActionButton';
import { useTheme } from '../../common/theme/ThemeContext';

export default function DepartmentManagementScreen() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [errors, setErrors] = useState({});

  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    // Wait for authentication
    if (!isAuthenticated || !user || !token) {
      return;
    }
    
    if (user?.role !== 'DIRECTOR') {
      Alert.alert('Access Denied', 'Only Directors can manage departments');
      navigation.goBack();
    } else {
      loadDepartments();
    }
  }, [user, isAuthenticated, token, navigation]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await departmentAPI.getDepartments();
      const depts = response.data.data.departments || response.data.departments || [];
      // Log for debugging
      console.log('Loaded departments:', depts.length);
      console.log('Inactive departments:', depts.filter(d => d.isActive === false || d.isActive === 'false').length);
      setDepartments(depts);
    } catch (error) {
      // Don't log 401 errors - they're handled by the interceptor
      if (error.response?.status !== 401) {
        console.error('Error loading departments:', error);
        Alert.alert('Error', 'Failed to load departments');
      } else {
        setDepartments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDepartments();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setEditingDepartment(null);
    setFormData({ name: '', code: '', description: '' });
    setErrors({});
    setModalVisible(true);
  };

  const openEditModal = (department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name || '',
      code: department.code || '',
      description: department.description || '',
    });
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      if (editingDepartment) {
        // Update
        await departmentAPI.updateDepartment(editingDepartment._id, formData);
        Alert.alert('Success', 'Department updated successfully');
      } else {
        // Create
        await departmentAPI.createDepartment(formData);
        Alert.alert('Success', 'Department created successfully');
      }
      setModalVisible(false);
      loadDepartments();
    } catch (error) {
      let errorMessage = 'Failed to save department';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDelete = (department) => {
    Alert.alert(
      'Delete Department',
      `Are you sure you want to delete "${department.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await departmentAPI.deleteDepartment(department._id);
              Alert.alert('Success', 'Department deleted successfully');
              loadDepartments();
            } catch (error) {
              let errorMessage = 'Failed to delete department';
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

  const handleToggleActive = async (department) => {
    // Determine current status - treat undefined/null as active
    const currentStatus = department.isActive === false || department.isActive === 'false' ? false : true;
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'block';
    
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Department`,
      `Are you sure you want to ${action} "${department.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              const updateData = { isActive: newStatus };
              console.log('Updating department:', department._id, 'with data:', updateData);
              const response = await departmentAPI.updateDepartment(department._id, updateData);
              console.log('Update response:', response.data);
              
              // Reload departments first
              await loadDepartments();
              
              // If blocking, switch to inactive view to show the blocked department
              if (!newStatus) {
                setShowInactiveOnly(true);
              }
              
              Alert.alert('Success', `Department ${action === 'block' ? 'blocked' : 'activated'} successfully`);
            } catch (error) {
              let errorMessage = `Failed to ${action} department`;
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

  // Filter departments based on search query and inactive filter
  const filteredDepartments = useMemo(() => {
    let filtered = departments;
    
    // Filter by inactive status
    if (showInactiveOnly) {
      // Show only departments where isActive is explicitly false
      filtered = filtered.filter(dept => dept.isActive === false || dept.isActive === 'false');
    } else {
      // Show only active departments (isActive is true, undefined, or null)
      filtered = filtered.filter(dept => dept.isActive !== false && dept.isActive !== 'false');
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(dept => {
        const name = (dept.name || '').toLowerCase();
        const code = (dept.code || '').toLowerCase();
        const description = (dept.description || '').toLowerCase();
        
        return (
          name.includes(query) ||
          code.includes(query) ||
          description.includes(query)
        );
      });
    }
    
    return filtered;
  }, [departments, searchQuery, showInactiveOnly]);

  // Count inactive departments
  const inactiveCount = useMemo(() => {
    return departments.filter(d => d.isActive === false || d.isActive === 'false').length;
  }, [departments]);

  if (user?.role !== 'DIRECTOR') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Bar */}
      <TopBar 
        title="Manage Departments" 
        rightComponent={
          <TouchableOpacity
            onPress={() => setShowInactiveOnly(!showInactiveOnly)}
            style={[styles.inactiveButton, showInactiveOnly && styles.inactiveButtonActive]}
          >
            <Ionicons 
              name="ban" 
              size={24} 
              color={showInactiveOnly ? "#ffffff" : "#ffffff"} 
            />
            {inactiveCount > 0 && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>
                  {inactiveCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Department List Header */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Department List
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={openCreateModal}
            >
              <Ionicons name="add" size={18} color="#ffffff" style={styles.addIcon} />
              <Text style={styles.addButtonText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            </View>
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: theme.colors.text,
                },
              ]}
              placeholder="Search by name, code..."
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

          {loading && !refreshing && (
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading departments...
            </Text>
          )}

          {filteredDepartments.map((dept) => (
            <Card key={dept._id} style={styles.departmentCard}>
              <View style={styles.departmentCardContent}>
                <View style={styles.departmentInfo}>
                  <View style={styles.departmentHeaderRow}>
                    <View style={styles.departmentNameContainer}>
                      <Text style={[styles.departmentName, { color: theme.colors.text }]}>
                        {dept.name}
                      </Text>
                      {dept.code && (
                        <Text style={[styles.departmentCode, { color: theme.colors.textSecondary }]}>
                          ({dept.code})
                        </Text>
                      )}
                    </View>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: (dept.isActive === false || dept.isActive === 'false')
                              ? theme.colors.textSecondary
                              : theme.colors.success,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: (dept.isActive === false || dept.isActive === 'false')
                              ? theme.colors.textSecondary
                              : theme.colors.success,
                          },
                        ]}
                      >
                        {(dept.isActive === false || dept.isActive === 'false') ? 'Inactive' : 'Active'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.departmentActions}>
                  {showInactiveOnly ? (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.success + '20' }]}
                      onPress={() => handleToggleActive(dept)}
                    >
                      <Text style={[styles.actionButtonText, { color: theme.colors.success }]}>
                        Activate
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.info + '20', marginRight: 10 }]}
                        onPress={() => openEditModal(dept)}
                      >
                        <Text style={[styles.actionButtonText, { color: theme.colors.info }]}>
                          Edit
                        </Text>
                      </TouchableOpacity>
                      {(dept.isActive !== false && dept.isActive !== 'false') && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#f59e0b' + '20', marginRight: 10 }]}
                          onPress={() => handleToggleActive(dept)}
                        >
                          <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>
                            Block
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
                        onPress={() => handleDelete(dept)}
                      >
                        <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </Card>
          ))}

          {!loading && filteredDepartments.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={showInactiveOnly ? "ban" : "business"} 
                size={64} 
                color={theme.colors.textSecondary} 
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {showInactiveOnly
                  ? searchQuery.trim()
                    ? `No inactive departments found matching "${searchQuery}"`
                    : 'No inactive departments found'
                  : searchQuery.trim()
                    ? `No departments found matching "${searchQuery}"`
                    : 'No departments found'}
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
                {editingDepartment ? 'Edit Department' : 'Create Department'}
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
                label="Department Name *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter department name"
                error={errors.name}
                required
              />

              <Input
                label="Code"
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                placeholder="Enter department code (e.g., GEN_MED)"
                error={errors.code}
              />

              <Input
                label="Description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter department description"
                multiline
                numberOfLines={3}
                error={errors.description}
              />

              <Button
                title={editingDepartment ? 'Update Department' : 'Create Department'}
                onPress={handleSave}
                style={styles.saveButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      {!showInactiveOnly && (
        <FloatingActionButton
          onPress={openCreateModal}
          icon="add"
        />
      )}
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
  inactiveButton: {
    padding: 8,
    position: 'relative',
  },
  inactiveButtonActive: {
    // No background color when active
  },
  inactiveBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  inactiveCount: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '400',
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
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
  searchIconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#64748b',
  },
  departmentCard: {
    marginBottom: 16,
    padding: 20,
  },
  departmentCardContent: {
    flexDirection: 'column',
  },
  departmentInfo: {
    marginBottom: 16,
  },
  departmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  departmentNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  departmentName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  departmentCode: {
    fontSize: 14,
    color: '#64748b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  departmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
  saveButton: {
    marginTop: 8,
    marginBottom: 8,
  },
});

