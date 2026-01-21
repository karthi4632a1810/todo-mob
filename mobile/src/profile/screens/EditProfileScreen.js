import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI, departmentAPI } from '../../services/api';
import { setUser } from '../../store/slices/authSlice';
import Card from '../../common/components/Card';
import Input from '../../common/components/Input';
import Button from '../../common/components/Button';
import Picker from '../../common/components/Picker';
import { useTheme } from '../../common/theme/ThemeContext';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const theme = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
      });
    }
    loadDepartments();
  }, [user]);

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getDepartments();
      const depts = response.data.data.departments || response.data.departments || [];
      setDepartments(
        depts.map((dept) => ({
          label: dept.name,
          value: dept.name,
        }))
      );
    } catch (error) {
      console.error('Error loading departments:', error);
    }
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
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (!token) {
      Alert.alert('Error', 'Authentication token is missing. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      const response = await userAPI.updateUser(user._id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        department: formData.department.trim(),
      });

      // Update Redux store with new user data
      dispatch(setUser(response.data.data.user || response.data.user));

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      let errorMessage = 'Failed to update profile';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={[styles.topBar, { backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Edit Profile</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.content}>
          <Card style={styles.formCard}>
            <Input
              label="Full Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter your full name"
              error={errors.name}
              required
            />

            <Input
              label="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
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
              title="Save Changes"
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
            />
          </Card>
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
  topBar: {
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  content: {
    padding: 20,
  },
  formCard: {
    padding: 20,
  },
  saveButton: {
    marginTop: 8,
  },
});

