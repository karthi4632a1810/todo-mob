import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI, authAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Button from '../../common/components/Button';
import { useTheme } from '../../common/theme/ThemeContext';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { user, token } = useSelector((state) => state.auth);
  const theme = useTheme();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validate()) return;

    if (!token) {
      Alert.alert('Error', 'Authentication token is missing. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      // First verify current password by attempting login
      try {
        await authAPI.login({
          email: user.email,
          password: formData.currentPassword,
        });
      } catch (loginError) {
        Alert.alert('Error', 'Current password is incorrect');
        setLoading(false);
        return;
      }

      // If current password is correct, update to new password
      await userAPI.updateUser(user._id, {
        password: formData.newPassword,
      });

      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Clear form
            setFormData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      let errorMessage = 'Failed to change password';
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

  const PasswordInput = ({ label, value, onChangeText, error, showPassword, onTogglePassword, placeholder }) => (
    <View style={styles.passwordInputContainer}>
      <Text style={[styles.passwordLabel, { color: theme.colors.text }]}>{label}</Text>
      <View style={styles.passwordInputWrapper}>
        <TextInput
          style={[
            styles.passwordInput,
            {
              borderColor: error ? theme.colors.error : theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onTogglePassword} style={styles.eyeIcon}>
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={[styles.topBar, { backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Change Password</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.content}>
          <Card style={styles.formCard}>
            <PasswordInput
              label="Current Password *"
              value={formData.currentPassword}
              onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
              error={errors.currentPassword}
              showPassword={showCurrentPassword}
              onTogglePassword={() => setShowCurrentPassword(!showCurrentPassword)}
              placeholder="Enter current password"
            />

            <PasswordInput
              label="New Password *"
              value={formData.newPassword}
              onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
              error={errors.newPassword}
              showPassword={showNewPassword}
              onTogglePassword={() => setShowNewPassword(!showNewPassword)}
              placeholder="Enter new password"
            />

            <PasswordInput
              label="Confirm New Password *"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              error={errors.confirmPassword}
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              placeholder="Confirm new password"
            />

            <Button
              title="Change Password"
              onPress={handleChangePassword}
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
  passwordInputContainer: {
    marginBottom: 20,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  passwordInputWrapper: {
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
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  saveButton: {
    marginTop: 8,
  },
});

