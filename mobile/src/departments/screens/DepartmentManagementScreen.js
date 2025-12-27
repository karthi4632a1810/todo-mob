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
import { departmentAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Button from '../../common/components/Button';
import { useTheme } from '../../common/theme/ThemeContext';

export default function DepartmentManagementScreen() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter departments based on search query
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) {
      return departments;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return departments.filter(dept => {
      const name = (dept.name || '').toLowerCase();
      const code = (dept.code || '').toLowerCase();
      const description = (dept.description || '').toLowerCase();
      
      return (
        name.includes(query) ||
        code.includes(query) ||
        description.includes(query)
      );
    });
  }, [departments, searchQuery]);

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
              Manage Departments
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={openCreateModal}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
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
              placeholder="Search by name, code, or description..."
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
              Loading departments...
            </Text>
          )}

          {filteredDepartments.map((dept) => (
            <Card key={dept._id} style={styles.departmentCard}>
              <View style={styles.departmentHeader}>
                <View style={styles.departmentInfo}>
                  <Text style={[styles.departmentName, { color: theme.colors.text }]}>
                    {dept.name}
                  </Text>
                  {dept.code && (
                    <Text style={[styles.departmentCode, { color: theme.colors.textSecondary }]}>
                      ({dept.code})
                    </Text>
                  )}
                </View>
                <View style={styles.departmentActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.info + '20' }]}
                    onPress={() => openEditModal(dept)}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.colors.info }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
                    onPress={() => handleDelete(dept)}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {dept.description && (
                <Text style={[styles.departmentDescription, { color: theme.colors.textSecondary }]}>
                  {dept.description}
                </Text>
              )}
              <View style={styles.departmentFooter}>
                <Text
                  style={[
                    styles.statusBadge,
                    {
                      color: dept.isActive ? theme.colors.success : theme.colors.textSecondary,
                      backgroundColor: dept.isActive
                        ? theme.colors.success + '20'
                        : theme.colors.textSecondary + '20',
                    },
                  ]}
                >
                  {dept.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </Card>
          ))}

          {!loading && filteredDepartments.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {searchQuery.trim() 
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
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingDepartment ? 'Edit Department' : 'Create Department'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
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
  departmentCard: {
    marginBottom: 12,
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  departmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  departmentCode: {
    fontSize: 12,
  },
  departmentActions: {
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
  departmentDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  departmentFooter: {
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

