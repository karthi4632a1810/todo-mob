import React from 'react';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';

// Role-based guard component
export const RoleGuard = ({ allowedRoles, children, fallback }) => {
  const { user } = useSelector((state) => state.auth);

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.text}>Access Denied</Text>
        <Text style={styles.subtext}>
          You don't have permission to access this resource.
        </Text>
      </View>
    );
  }

  return children;
};

// Department-based guard
export const DepartmentGuard = ({ allowedDepartments, children, fallback }) => {
  const { user } = useSelector((state) => state.auth);

  if (!user || !allowedDepartments.includes(user.department)) {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.text}>Access Denied</Text>
        <Text style={styles.subtext}>
          You don't have access to this department's data.
        </Text>
      </View>
    );
  }

  return children;
};

// Hook for role checking
export const useRole = () => {
  const { user } = useSelector((state) => state.auth);

  return {
    isDirector: user?.role === 'DIRECTOR',
    isHOD: user?.role === 'HOD',
    isEmployee: user?.role === 'EMPLOYEE',
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles) => roles.includes(user?.role),
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});

