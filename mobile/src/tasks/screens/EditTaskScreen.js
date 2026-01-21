import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { updateTask, fetchTaskById } from '../../store/slices/taskSlice';
import Button from '../../common/components/Button';
import Input from '../../common/components/Input';
import Picker from '../../common/components/Picker';
import DatePicker from '../../common/components/DatePicker';
import { useTheme } from '../../common/theme/ThemeContext';

export default function EditTaskScreen() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: null,
  });
  const [errors, setErrors] = useState({});

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params;
  const { currentTask, isLoading } = useSelector((state) => state.tasks);
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();

  useEffect(() => {
    if (taskId) {
      dispatch(fetchTaskById(taskId));
    }
  }, [taskId]);

  useEffect(() => {
    if (currentTask) {
      setFormData({
        title: currentTask.title || '',
        description: currentTask.description || '',
        status: currentTask.status || 'PENDING',
        priority: currentTask.priority || 'MEDIUM',
        dueDate: currentTask.dueDate ? new Date(currentTask.dueDate) : null,
      });
    }
  }, [currentTask]);

  useEffect(() => {
    // Refresh task data when returning to this screen
    if (taskId) {
      dispatch(fetchTaskById(taskId));
    }
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) return;

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description ? formData.description.trim() : undefined,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : undefined,
      };

      const result = await dispatch(updateTask({ taskId, taskData }));

      if (updateTask.fulfilled.match(result)) {
        Alert.alert('Success', 'Task updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        let errorMessage = 'Failed to update task';
        if (result.payload) {
          if (typeof result.payload === 'string') {
            errorMessage = result.payload;
          } else if (result.payload.message) {
            errorMessage = result.payload.message;
          } else if (result.payload.errors && Array.isArray(result.payload.errors)) {
            errorMessage = result.payload.errors.join(', ');
          }
        }
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Update task error:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };

  if (!currentTask) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Edit Task</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      
      <ScrollView style={styles.scrollView}>
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
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Enter task description"
          multiline
          numberOfLines={4}
          error={errors.description}
        />

        <Picker
          label="Status *"
          selectedValue={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
          items={[
            { label: 'Pending', value: 'PENDING' },
            { label: 'In Progress', value: 'IN_PROGRESS' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'Cancelled', value: 'CANCELLED' },
          ]}
          placeholder="Select status"
          error={errors.status}
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
          label="Due Date *"
          value={formData.dueDate}
          onChange={(date) => setFormData({ ...formData, dueDate: date })}
          placeholder="Select due date"
          error={errors.dueDate}
          minimumDate={new Date()}
          required
        />

        <Button
          title="Update Task"
          onPress={handleUpdate}
          loading={isLoading}
          style={styles.button}
        />
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    backgroundColor: '#6200ee',
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
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  button: {
    marginTop: 8,
  },
});

