import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskAPI } from '../../services/api';

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params, { rejectWithValue }) => {
    try {
      const response = await taskAPI.getTasks(params);
      // Backend returns: { success, message, data: { tasks, count }, errors }
      return response.data.data.tasks;
    } catch (error) {
      // Handle rate limit errors gracefully
      if (error.response?.status === 429 || error.isRateLimit) {
        return rejectWithValue({
          message: 'Too many requests. Please wait a moment and try again.',
          errors: ['Rate limit exceeded'],
          status: 429
        });
      }
      const errorData = error.response?.data;
      return rejectWithValue({
        message: errorData?.message || 'Failed to fetch tasks',
        errors: errorData?.errors || [],
        status: error.response?.status
      });
    }
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await taskAPI.getTaskById(taskId);
      // Backend returns: { success, message, data: { task }, errors }
      return response.data.data.task;
    } catch (error) {
      // Handle rate limit errors gracefully
      if (error.response?.status === 429 || error.isRateLimit) {
        return rejectWithValue({
          message: 'Too many requests. Please wait a moment and try again.',
          errors: ['Rate limit exceeded'],
          status: 429
        });
      }
      const errorData = error.response?.data;
      return rejectWithValue({
        message: errorData?.message || 'Failed to fetch task',
        errors: errorData?.errors || [],
        status: error.response?.status
      });
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const response = await taskAPI.createTask(taskData);
      // Backend returns: { success, message, data: { task }, errors }
      // Axios response.data is the backend response
      return response.data.data.task;
    } catch (error) {
      // Extract detailed error information
      const errorData = error.response?.data;
      if (errorData) {
        // Return the full error object with message and errors array
        return rejectWithValue({
          message: errorData.message || 'Failed to create task',
          errors: errorData.errors || [],
          status: error.response?.status
        });
      }
      // Network or other errors
      return rejectWithValue({
        message: error.message || 'Failed to create task. Please check your connection.',
        errors: [],
        status: error.response?.status
      });
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, taskData }, { rejectWithValue }) => {
    try {
      const response = await taskAPI.updateTask(taskId, taskData);
      // Backend returns: { success, message, data: { task }, errors }
      return response.data.data.task;
    } catch (error) {
      const errorData = error.response?.data;
      return rejectWithValue({
        message: errorData?.message || 'Failed to update task',
        errors: errorData?.errors || [],
        status: error.response?.status
      });
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId, { rejectWithValue }) => {
    try {
      await taskAPI.deleteTask(taskId);
      return taskId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete task'
      );
    }
  }
);

export const updateTaskProgress = createAsyncThunk(
  'tasks/updateTaskProgress',
  async ({ taskId, status, remarks }, { rejectWithValue }) => {
    try {
      const response = await taskAPI.addTaskUpdate(taskId, { status, remarks });
      return response.data.data.task;
    } catch (error) {
      const errorData = error.response?.data;
      return rejectWithValue({
        message: errorData?.message || 'Failed to update task progress',
        errors: errorData?.errors || [],
        status: error.response?.status
      });
    }
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState: {
    tasks: [],
    currentTask: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch task by ID
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.currentTask = action.payload;
      })
      // Create task
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload);
      })
      // Update task
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(
          (task) => task._id === action.payload._id
        );
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.currentTask?._id === action.payload._id) {
          state.currentTask = action.payload;
        }
      })
      // Delete task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(
          (task) => task._id !== action.payload
        );
        if (state.currentTask?._id === action.payload) {
          state.currentTask = null;
        }
      })
      // Update task progress
      .addCase(updateTaskProgress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTaskProgress.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.tasks.findIndex(
          (task) => task._id === action.payload._id
        );
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.currentTask?._id === action.payload._id) {
          state.currentTask = action.payload;
        }
      })
      .addCase(updateTaskProgress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentTask, clearError } = taskSlice.actions;
export default taskSlice.reducer;

