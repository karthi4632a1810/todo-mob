import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../../store/slices/authSlice';
import { storage } from '../../services/storage';
import { useTheme } from '../../common/theme/ThemeContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Decorative Icon Section */}
          <View style={styles.iconContainer}>
            {/* Decorative Dots */}
            <View style={styles.decorativeDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
              <View style={[styles.dot, styles.dot4]} />
              <View style={[styles.dot, styles.dot5]} />
              <View style={[styles.dot, styles.dot6]} />
              <View style={[styles.dot, styles.dot7]} />
              <View style={[styles.dot, styles.dot8]} />
            </View>
            
            {/* Main Icon */}
            <View style={styles.mainIcon}>
              <Ionicons name="checkmark" size={48} color="#ffffff" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            Welcome back!
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors({ ...errors, email: null });
                  }
                }}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {email && /\S+@\S+\.\S+/.test(email) && (
                <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.inputIcon} />
              )}
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TouchableOpacity onPress={() => Alert.alert('Forgot Password', 'Please contact your administrator to reset your password.')}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: null });
                  }
                }}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {error && (
            <Text style={[styles.errorText, { marginTop: 8 }]}>
              {typeof error === 'string' ? error : error.message || 'An error occurred'}
            </Text>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={styles.loginButtonText}>Loading...</Text>
            ) : (
              <Text style={styles.loginButtonText}>Log in</Text>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Get started!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    marginBottom: 32,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeDots: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot1: {
    top: 10,
    left: 20,
    backgroundColor: '#fb923c',
  },
  dot2: {
    top: 25,
    right: 15,
    backgroundColor: '#3b82f6',
  },
  dot3: {
    top: 50,
    right: 5,
    backgroundColor: '#6366f1',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dot4: {
    bottom: 30,
    right: 20,
    backgroundColor: '#fbbf24',
  },
  dot5: {
    bottom: 15,
    left: 25,
    backgroundColor: '#8b5cf6',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dot6: {
    top: 15,
    left: 5,
    backgroundColor: '#06b6d4',
  },
  dot7: {
    bottom: 40,
    left: 10,
    backgroundColor: '#ec4899',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dot8: {
    top: 60,
    left: 15,
    backgroundColor: '#64748b',
  },
  mainIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    ...{
      shadowColor: '#6366f1',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassword: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 14,
  },
  inputIcon: {
    marginLeft: 8,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
});

