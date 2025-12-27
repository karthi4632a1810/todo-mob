import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error) {
      // Extract detailed error information
      const errorData = error.response?.data;
      if (errorData) {
        // Return the full error object with message and errors array
        return rejectWithValue({
          message: errorData.message || 'Login failed',
          errors: errorData.errors || [],
          status: error.response?.status
        });
      }
      // Network or other errors
      return rejectWithValue({
        message: error.message || 'Login failed. Please check your connection.',
        errors: [],
        status: error.response?.status
      });
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response.data;
    } catch (error) {
      // Extract detailed error information
      const errorData = error.response?.data;
      if (errorData) {
        // Return the full error object with message and errors array
        return rejectWithValue({
          message: errorData.message || 'Registration failed',
          errors: errorData.errors || [],
          status: error.response?.status
        });
      }
      // Network or other errors
      return rejectWithValue({
        message: error.message || 'Registration failed. Please check your connection.',
        errors: [],
        status: error.response?.status
      });
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();
      // Backend returns: { success, message, data: { user }, errors }
      return response.data.data.user;
    } catch (error) {
      // Silently handle 401 errors (token expired/invalid) - don't show error
      if (error.response?.status === 401) {
        return rejectWithValue(null); // Return null to indicate silent failure
      }
      return rejectWithValue(
        error.response?.data?.message || 'Failed to get user'
      );
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      return null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Logout failed'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        // Backend returns: { success, message, data: { user, token }, errors }
        // action.payload is response.data which is the backend response
        const user = action.payload?.data?.user || action.payload?.user;
        const token = action.payload?.data?.token || action.payload?.token;
        state.user = user;
        state.token = token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        // Backend returns: { success, message, data: { user, token }, errors }
        // action.payload is response.data which is the backend response
        const user = action.payload?.data?.user || action.payload?.user;
        const token = action.payload?.data?.token || action.payload?.token;
        state.user = user;
        state.token = token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        // Only set error if payload is not null (silent failures return null)
        if (action.payload !== null) {
          state.error = action.payload;
        }
        // Clear authentication if token is invalid
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

