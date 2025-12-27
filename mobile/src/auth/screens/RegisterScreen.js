import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { register } from '../../store/slices/authSlice';
import { storage } from '../../services/storage';
import Button from '../../common/components/Button';
import Input from '../../common/components/Input';
import Picker from '../../common/components/Picker';
import { useTheme } from '../../common/theme/ThemeContext';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
  });
  const [errors, setErrors] = useState({});

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);
  const theme = useTheme();

  // Predefined departments list
  const departments = [
    { label: 'General Medicine (GEN_MED)', value: 'General Medicine' },
    { label: 'Pediatrics (PED)', value: 'Pediatrics' },
    { label: 'Orthopedics (ORTHO)', value: 'Orthopedics' },
    { label: 'Cardiology (CARDIO)', value: 'Cardiology' },
    { label: 'Emergency Medicine (ER)', value: 'Emergency Medicine' },
    { label: 'Information Technology (IT)', value: 'Information Technology' },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('Main');
    }
  }, [isAuthenticated]);

  const validate = () => {
    const newErrors = {};
    
    // Name validation - required
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Email validation - required and valid format
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Email is invalid';
    }
    
    // Password validation - required and minimum length
    if (!formData.password || !formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm Password validation - required and must match
    if (!formData.confirmPassword || !formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Department validation - required
    if (!formData.department || !formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      const { confirmPassword, ...registerData } = formData;
      const result = await dispatch(register(registerData));
      if (register.fulfilled.match(result)) {
        // Save token and user data
        // Ensure we have the correct payload structure
        const payload = result.payload;
        
        // Debug: Log payload structure
        if (__DEV__) {
          console.log('Register payload:', JSON.stringify(payload, null, 2));
        }
        
        // Backend returns: { success, message, data: { user, token }, errors }
        const token = payload?.data?.token;
        const user = payload?.data?.user;
        
        if (token && user) {
          // Ensure token is a string before saving
          if (typeof token !== 'string') {
            console.error('Token is not a string:', typeof token, token);
            Alert.alert('Error', 'Invalid token format from server');
            return;
          }
          // Try to save token and user, but don't fail registration if storage fails
          try {
            await storage.saveToken(token);
            await storage.saveUser(user);
          } catch (storageError) {
            // Log but don't block registration - token is in Redux state
            console.warn('Storage save failed, but registration continues:', storageError.message);
          }
          // User and token are already set in Redux by register.fulfilled
          // Just navigate - no need to dispatch again
          navigation.replace('Main');
        } else {
          console.error('Invalid payload structure:', payload);
          Alert.alert('Error', 'Invalid response from server');
        }
      } else {
        // Extract error message from response
        let errorMessage = 'Registration failed';
        if (result.payload) {
          if (typeof result.payload === 'string') {
            errorMessage = result.payload;
          } else if (result.payload.message) {
            errorMessage = result.payload.message;
          } else if (result.payload.errors && Array.isArray(result.payload.errors)) {
            errorMessage = result.payload.errors.join(', ');
          }
        }
        Alert.alert('Registration Failed', errorMessage);
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'An error occurred during registration');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Sign up to get started
          </Text>

          <Input
            label="Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter your name"
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

          <Input
            label="Password *"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
            required
          />

          <Input
            label="Confirm Password *"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
            placeholder="Confirm your password"
            secureTextEntry
            error={errors.confirmPassword}
            required
          />

          <Picker
            label="Department *"
            selectedValue={formData.department}
            onValueChange={(value) => setFormData({ ...formData, department: value })}
            items={departments}
            placeholder="Select your department"
            error={errors.department}
          />

          {error && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {typeof error === 'string' ? error : error.message || 'An error occurred'}
            </Text>
          )}

          <Button
            title="Register"
            onPress={handleRegister}
            loading={isLoading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Text
              style={[styles.link, { color: theme.colors.primary }]}
              onPress={() => navigation.navigate('Login')}
            >
              Sign In
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});

