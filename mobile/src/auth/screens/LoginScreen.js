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
import { login } from '../../store/slices/authSlice';
import { storage } from '../../services/storage';
import Button from '../../common/components/Button';
import Input from '../../common/components/Input';
import { useTheme } from '../../common/theme/ThemeContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);
  const theme = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('Main');
    }
  }, [isAuthenticated]);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      const result = await dispatch(login({ email, password }));
      if (login.fulfilled.match(result)) {
        // Save token and user data
        // Ensure we have the correct payload structure
        const payload = result.payload;
        
        // Debug: Log payload structure
        if (__DEV__) {
          console.log('Login payload:', JSON.stringify(payload, null, 2));
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
          // Try to save token and user, but don't fail login if storage fails
          try {
            await storage.saveToken(token);
            await storage.saveUser(user);
          } catch (storageError) {
            // Log but don't block login - token is in Redux state
            console.warn('Storage save failed, but login continues:', storageError.message);
          }
          // User and token are already set in Redux by login.fulfilled
          // Just navigate - no need to dispatch again
          navigation.replace('Main');
        } else {
          console.error('Invalid payload structure:', payload);
          Alert.alert('Error', 'Invalid response from server');
        }
      } else {
        // Extract error message from response
        let errorMessage = 'Invalid credentials';
        if (result.payload) {
          if (typeof result.payload === 'string') {
            errorMessage = result.payload;
          } else if (result.payload.message) {
            errorMessage = result.payload.message;
          } else if (result.payload.errors && Array.isArray(result.payload.errors)) {
            errorMessage = result.payload.errors.join(', ');
          }
        }
        Alert.alert('Login Failed', errorMessage);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during login');
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
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Sign in to continue
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
          />

          {error && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {typeof error === 'string' ? error : error.message || 'An error occurred'}
            </Text>
          )}

          <Button
            title="Login"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Text
              style={[styles.link, { color: theme.colors.primary }]}
              onPress={() => navigation.navigate('Register')}
            >
              Sign Up
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

