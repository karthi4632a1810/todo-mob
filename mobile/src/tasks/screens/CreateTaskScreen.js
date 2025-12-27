import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { createTask } from '../../store/slices/taskSlice';
import { userAPI } from '../../services/api';
import { departmentAPI } from '../../services/api';
import Button from '../../common/components/Button';
import Input from '../../common/components/Input';
import Picker from '../../common/components/Picker';
import DatePicker from '../../common/components/DatePicker';
import { useTheme } from '../../common/theme/ThemeContext';

export default function CreateTaskScreen() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignToRole: '', // 'HOD' or 'EMPLOYEE'
    assignedTo: '',
    departmentId: '',
    startDate: new Date(),
    dueDate: null,
  });
  const [errors, setErrors] = useState({});
  const [hods, setHods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.auth);
  const { isLoading } = useSelector((state) => state.tasks);
  const theme = useTheme();

  // Check if user is Director
  useEffect(() => {
    if (user?.role !== 'DIRECTOR') {
      Alert.alert('Access Denied', 'Only Directors can create tasks');
      navigation.goBack();
    }
  }, [user, navigation]);

  // Load departments
  useEffect(() => {
    loadDepartments();
  }, []);

  // Load HODs when HOD role is selected
  useEffect(() => {
    if (formData.assignToRole === 'HOD') {
      loadHODs();
      // Clear employee and department when switching to HOD
      setFormData(prev => ({ ...prev, assignedTo: '', departmentId: '' }));
      setEmployees([]);
    }
  }, [formData.assignToRole]);

  // Load employees when department is selected (only for EMPLOYEE role)
  useEffect(() => {
    if (formData.assignToRole === 'EMPLOYEE') {
      if (formData.departmentId) {
        loadEmployees(formData.departmentId);
      } else {
        // Clear employees if department is cleared
        setEmployees([]);
        setFormData(prev => ({ ...prev, assignedTo: '' }));
      }
    }
  }, [formData.assignToRole, formData.departmentId]);

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

  const loadHODs = async () => {
    setLoadingUsers(true);
    try {
      const response = await userAPI.getUsersForAssignment({ role: 'HOD' });
      const users = response.data.data.users || response.data.users || [];
      setHods(users.map(hod => ({
        label: `${hod.name} (${hod.department})`,
        value: hod._id
      })));
    } catch (error) {
      console.error('Error loading HODs:', error);
      Alert.alert('Error', 'Failed to load HODs');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadEmployees = async (departmentId) => {
    if (!departmentId) {
      setEmployees([]);
      setFormData(prev => ({ ...prev, assignedTo: '' }));
      return;
    }

    setLoadingUsers(true);
    setEmployees([]); // Clear previous employees while loading
    setFormData(prev => ({ ...prev, assignedTo: '' })); // Clear selected employee
    
    try {
      const response = await userAPI.getUsersForAssignment({ 
        role: 'EMPLOYEE', 
        departmentId: departmentId.trim() // Pass department name, ensure trimmed
      });
      
      const users = response.data?.data?.users || response.data?.users || [];
      
      if (users.length === 0) {
        setEmployees([]);
        console.log(`No employees found in department: ${departmentId}`);
      } else {
        setEmployees(users.map(emp => ({
          label: `${emp.name}${emp.department ? ` (${emp.department})` : ''}`,
          value: emp._id
        })));
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
      
      // Extract error message
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.errors?.[0] || 
                           error.message || 
                           'Failed to load employees';
      
      // Only log the error, don't show alert/toast to avoid interrupting user flow
      console.warn('Error loading employees:', errorMessage);
      
      // If it's a network error or server error, we'll handle it silently
      // The UI will show "No employees in this department" which is acceptable
    } finally {
      setLoadingUsers(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    
    if (!formData.assignToRole) {
      newErrors.assignToRole = 'Please select assignee role';
    }
    
    if (formData.assignToRole === 'HOD' && !formData.assignedTo) {
      newErrors.assignedTo = 'Please select a HOD';
    }
    
    if (formData.assignToRole === 'EMPLOYEE') {
      if (!formData.departmentId) {
        newErrors.departmentId = 'Department is required for Employee assignment';
      }
      if (!formData.assignedTo) {
        newErrors.assignedTo = 'Please select an Employee';
      }
    }
    
    // Validate dates
    if (formData.startDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(formData.startDate)) {
        newErrors.dueDate = 'Due date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    if (user?.role !== 'DIRECTOR') {
      Alert.alert('Error', 'Only Directors can create tasks');
      return;
    }

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        assignedTo: formData.assignedTo,
        startDate: formData.startDate.toISOString(),
        dueDate: formData.dueDate.toISOString(),
      };

      // Add departmentId only for Employee assignment
      if (formData.assignToRole === 'EMPLOYEE' && formData.departmentId) {
        taskData.departmentId = formData.departmentId;
      }

      if (__DEV__) {
        console.log('Creating task with data:', taskData);
      }

      const result = await dispatch(createTask(taskData));
      
      if (createTask.fulfilled.match(result)) {
        Alert.alert('Success', 'Task created successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        let errorMessage = 'Failed to create task';
        if (result.payload) {
          if (typeof result.payload === 'string') {
            errorMessage = result.payload;
          } else if (result.payload.message) {
            errorMessage = result.payload.message;
          } else if (result.payload.errors && Array.isArray(result.payload.errors)) {
            errorMessage = result.payload.errors.join(', ');
          }
        }
        
        if (__DEV__) {
          console.error('Create task failed:', result.payload);
        }
        
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Create task error:', error);
      let errorMessage = 'An error occurred';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      }
      Alert.alert('Error', errorMessage);
    }
  };

  // Don't render if not Director
  if (user?.role !== 'DIRECTOR') {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Input
          label="Title *"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          placeholder="Enter task title"
          error={errors.title}
          required
        />

        <Input
          label="Description *"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Enter task description"
          multiline
          numberOfLines={4}
          error={errors.description}
          required
        />

        <Picker
          label="Priority *"
          selectedValue={formData.priority}
          onValueChange={(value) => setFormData({ ...formData, priority: value })}
          items={[
            { label: 'Low', value: 'LOW' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'High', value: 'HIGH' },
          ]}
          placeholder="Select priority"
          error={errors.priority}
          required
        />

        <DatePicker
          label="Start Date"
          value={formData.startDate}
          onChange={(date) => setFormData({ ...formData, startDate: date })}
          placeholder="Select start date"
          error={errors.startDate}
          minimumDate={new Date()}
        />

        <DatePicker
          label="Due Date *"
          value={formData.dueDate}
          onChange={(date) => setFormData({ ...formData, dueDate: date })}
          placeholder="Select due date"
          error={errors.dueDate}
          minimumDate={formData.startDate || new Date()}
          required
        />

        <Picker
          label="Assign To Role *"
          selectedValue={formData.assignToRole}
          onValueChange={(value) => {
            setFormData({ 
              ...formData, 
              assignToRole: value,
              assignedTo: '',
              departmentId: ''
            });
          }}
          items={[
            { label: 'HOD', value: 'HOD' },
            { label: 'Employee', value: 'EMPLOYEE' },
          ]}
          placeholder="Select assignee role"
          error={errors.assignToRole}
          required
        />

        {formData.assignToRole === 'HOD' && (
          <Picker
            label="Select HOD *"
            selectedValue={formData.assignedTo}
            onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
            items={hods}
            placeholder={loadingUsers ? 'Loading HODs...' : 'Select HOD'}
            error={errors.assignedTo}
            required
          />
        )}

        {formData.assignToRole === 'EMPLOYEE' && (
          <>
            <Picker
              label="Department *"
              selectedValue={formData.departmentId}
              onValueChange={(value) => {
                setFormData({ 
                  ...formData, 
                  departmentId: value,
                  assignedTo: '' // Clear employee when department changes
                });
              }}
              items={departments}
              placeholder="Select department"
              error={errors.departmentId}
              required
            />

            <Picker
              label="Select Employee *"
              selectedValue={formData.assignedTo}
              onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              items={employees}
              placeholder={
                loadingUsers 
                  ? 'Loading employees...' 
                  : !formData.departmentId 
                    ? 'Select department first' 
                    : employees.length === 0 
                      ? 'No employees in this department' 
                      : 'Select employee'
              }
              error={errors.assignedTo}
              required
              disabled={!formData.departmentId || loadingUsers || employees.length === 0}
            />
          </>
        )}

        <Button
          title="Create Task"
          onPress={handleCreate}
          loading={isLoading}
          style={styles.button}
        />
      </View>
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
  button: {
    marginTop: 8,
  },
});
