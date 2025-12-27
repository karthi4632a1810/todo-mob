import * as SecureStore from 'expo-secure-store';

// Conditionally import AsyncStorage as fallback
let AsyncStorage = null;
try {
  const AsyncStorageModule = require('@react-native-async-storage/async-storage');
  AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;
} catch (e) {
  // AsyncStorage not available, will use SecureStore only
  console.warn('AsyncStorage not available, using SecureStore only:', e.message);
}

const TOKEN_KEY = 'authToken';
const USER_KEY = 'userData';
const USE_SECURE_STORAGE = true; // Set to false to use AsyncStorage instead

export const storage = {
  // Token operations
  async saveToken(token) {
    try {
      // Ensure token is a string
      if (!token) {
        throw new Error('Token is required');
      }
      const tokenString = typeof token === 'string' ? token : String(token);
      
      if (USE_SECURE_STORAGE) {
        try {
          // Try SecureStore first
          await SecureStore.setItemAsync(TOKEN_KEY, tokenString);
        } catch (secureError) {
          // If SecureStore fails (keychain issues on Android), fallback to AsyncStorage
          if (AsyncStorage) {
            try {
              console.warn('SecureStore failed, using AsyncStorage fallback:', secureError.message);
              await AsyncStorage.setItem(TOKEN_KEY, tokenString);
            } catch (asyncError) {
              console.error('AsyncStorage also failed:', asyncError);
              // Don't throw - login can continue with token in Redux
            }
          } else {
            console.warn('SecureStore failed and AsyncStorage not available:', secureError.message);
            // Don't throw - login can continue with token in Redux
          }
        }
      } else {
        // Use AsyncStorage directly
        await AsyncStorage.setItem(TOKEN_KEY, tokenString);
      }
    } catch (error) {
      console.error('Error saving token:', error);
      // Don't throw - allow login to continue even if storage fails
      // The token is still in Redux state
    }
  },

  async getToken() {
    try {
      if (USE_SECURE_STORAGE) {
        try {
          return await SecureStore.getItemAsync(TOKEN_KEY);
        } catch (secureError) {
          // Fallback to AsyncStorage
          if (AsyncStorage) {
            return await AsyncStorage.getItem(TOKEN_KEY);
          }
          return null;
        }
      } else {
        return await AsyncStorage.getItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async removeToken() {
    try {
      if (USE_SECURE_STORAGE) {
        try {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        } catch (secureError) {
          // Fallback to AsyncStorage
          if (AsyncStorage) {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // User data operations
  async saveUser(user) {
    try {
      // Ensure user is an object and stringify it
      if (!user) {
        throw new Error('User data is required');
      }
      const userString = typeof user === 'string' ? user : JSON.stringify(user);
      
      if (USE_SECURE_STORAGE) {
        try {
          // Try SecureStore first
          await SecureStore.setItemAsync(USER_KEY, userString);
        } catch (secureError) {
          // If SecureStore fails (keychain issues on Android), fallback to AsyncStorage
          if (AsyncStorage) {
            try {
              console.warn('SecureStore failed, using AsyncStorage fallback:', secureError.message);
              await AsyncStorage.setItem(USER_KEY, userString);
            } catch (asyncError) {
              console.error('AsyncStorage also failed:', asyncError);
              // Don't throw - login can continue with user in Redux
            }
          } else {
            console.warn('SecureStore failed and AsyncStorage not available:', secureError.message);
            // Don't throw - login can continue with user in Redux
          }
        }
      } else {
        // Use AsyncStorage directly
        await AsyncStorage.setItem(USER_KEY, userString);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      // Don't throw - allow login to continue even if storage fails
      // The user is still in Redux state
    }
  },

  async getUser() {
    try {
      let userData;
      if (USE_SECURE_STORAGE) {
        try {
          userData = await SecureStore.getItemAsync(USER_KEY);
        } catch (secureError) {
          // Fallback to AsyncStorage
          if (AsyncStorage) {
            userData = await AsyncStorage.getItem(USER_KEY);
          } else {
            userData = null;
          }
        }
      } else {
        userData = await AsyncStorage.getItem(USER_KEY);
      }
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async removeUser() {
    try {
      if (USE_SECURE_STORAGE) {
        try {
          await SecureStore.deleteItemAsync(USER_KEY);
        } catch (secureError) {
          // Fallback to AsyncStorage
          if (AsyncStorage) {
            await AsyncStorage.removeItem(USER_KEY);
          }
        }
      } else {
        await AsyncStorage.removeItem(USER_KEY);
      }
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  // Clear all auth data
  async clearAll() {
    try {
      await this.removeToken();
      await this.removeUser();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

