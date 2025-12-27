import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { getCurrentUser, clearCredentials } from '../store/slices/authSlice';
import { storage } from '../services/storage';
import { setCredentials } from '../store/slices/authSlice';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for stored credentials on app start
    const loadStoredCredentials = async () => {
      try {
        const storedToken = await storage.getToken();
        const storedUser = await storage.getUser();
        
        if (storedToken && storedUser) {
          dispatch(setCredentials({ token: storedToken, user: storedUser }));
          // Optionally verify token by fetching current user
          // Don't await to avoid blocking render
          dispatch(getCurrentUser()).then((result) => {
            // If verification fails, clear storage silently
            if (getCurrentUser.rejected.match(result)) {
              storage.clearAll();
              dispatch(clearCredentials());
            }
          }).catch(err => {
            // Silently handle errors - don't log expected 401s
            if (err?.response?.status !== 401) {
              console.error('Error verifying token:', err);
            }
            storage.clearAll();
            dispatch(clearCredentials());
          });
        }
      } catch (error) {
        console.error('Error loading stored credentials:', error);
        // Clear potentially corrupted storage
        try {
          await storage.clearAll();
        } catch (clearError) {
          console.error('Error clearing storage:', clearError);
        }
      }
    };

    loadStoredCredentials();
  }, [dispatch]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

