# Todo Mobile App

A React Native mobile application built with Expo, featuring Redux Toolkit for state management, JWT authentication, and role-based navigation.

## Features

- **Authentication**: Login and registration with JWT token storage
- **Role-Based Navigation**: Different screens and features based on user role (DIRECTOR, HOD, EMPLOYEE)
- **Task Management**: Create, view, update, and delete tasks
- **Approvals**: HOD and DIRECTOR can approve/reject tasks
- **Reports**: View task statistics and performance metrics
- **Diary**: View today's tasks
- **Profile**: View and manage user profile
- **Secure Storage**: JWT tokens stored securely using expo-secure-store
- **API Integration**: Axios client with automatic JWT token injection

## Tech Stack

- React Native with Expo
- Redux Toolkit for state management
- React Navigation for navigation
- Axios for API calls
- Expo Secure Store for secure token storage
- Feature-based folder structure

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)
- Backend API running (see backend README)

## Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, defaults to localhost):
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For physical device testing, replace `localhost` with your computer's IP address:
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000/api
```

## Running the App

### Development Mode:
```bash
npm start
```

This will start the Expo development server. You can then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with Expo Go app on your physical device

### Platform-Specific:
```bash
npm run android  # Android
npm run ios      # iOS
npm run web      # Web
```

## Project Structure

```
mobile/
├── src/
│   ├── auth/              # Authentication feature
│   │   └── screens/
│   ├── dashboard/         # Dashboard feature
│   │   └── screens/
│   ├── tasks/             # Tasks feature
│   │   └── screens/
│   ├── approvals/         # Approvals feature (HOD/DIRECTOR)
│   │   └── screens/
│   ├── reports/           # Reports feature (HOD/DIRECTOR)
│   │   └── screens/
│   ├── diary/             # Diary feature
│   │   └── screens/
│   ├── notifications/     # Notifications feature
│   │   └── screens/
│   ├── profile/           # Profile feature
│   │   └── screens/
│   ├── common/            # Shared components and utilities
│   │   ├── components/    # Reusable UI components
│   │   └── theme/         # Theme configuration
│   ├── navigation/        # Navigation configuration
│   │   ├── AppNavigator.js
│   │   ├── AuthNavigator.js
│   │   ├── MainNavigator.js
│   │   └── guards.js      # Role-based guards
│   ├── services/          # API and storage services
│   │   ├── api.js         # Axios client with interceptors
│   │   └── storage.js     # Secure storage utilities
│   └── store/             # Redux store
│       ├── index.js
│       └── slices/        # Redux slices
│           ├── authSlice.js
│           ├── taskSlice.js
│           └── userSlice.js
├── App.js                 # Root component
├── app.json               # Expo configuration
└── package.json
```

## Features by Role

### DIRECTOR
- Full access to all features
- Can view all departments' data
- Can approve/reject tasks
- Can view all reports and statistics

### HOD (Head of Department)
- Access to department-specific data
- Can approve/reject tasks in their department
- Can view department reports
- Can manage users in their department

### EMPLOYEE
- Can view and manage their own tasks
- Can create tasks
- Can view diary entries
- Limited access to other features

## API Integration

The app uses Axios with automatic JWT token injection. The API client is configured in `src/services/api.js` and includes:

- Request interceptor: Automatically adds JWT token to requests
- Response interceptor: Handles 401 errors and clears storage

## State Management

Redux Toolkit is used for state management with the following slices:

- **authSlice**: Authentication state (user, token, login/logout)
- **taskSlice**: Task management state
- **userSlice**: User management state

## Navigation

The app uses React Navigation with:

- **AuthNavigator**: Login and Register screens
- **MainNavigator**: Main app screens with bottom tabs
- **Role-based guards**: Conditional rendering based on user role

## Theme

A global theme is provided through `ThemeContext` with:
- Colors (primary, secondary, background, etc.)
- Spacing values
- Border radius values
- Typography styles

## Common Components

Reusable UI components in `src/common/components/`:
- **Button**: Customizable button with variants
- **Input**: Form input with label and error handling
- **Card**: Container component with consistent styling

## Troubleshooting

### API Connection Issues
- Make sure the backend server is running
- Check that the API URL in `.env` is correct
- For physical devices, use your computer's IP address instead of `localhost`

### Authentication Issues
- Clear app data and try logging in again
- Check that JWT tokens are being stored correctly
- Verify backend JWT_SECRET is configured

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Expo cache: `expo start -c`

## Development Tips

- Use React Native Debugger for debugging Redux state
- Enable remote debugging in Expo Go for better debugging experience
- Use `console.log` for API responses during development
- Test on both iOS and Android for platform-specific issues

