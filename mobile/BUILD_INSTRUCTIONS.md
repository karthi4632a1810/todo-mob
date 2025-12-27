# Building the Todo App

This guide will help you build and export your React Native Expo app for Android and iOS.

## Prerequisites

1. **EAS CLI** (already installed)
2. **Expo Account** - Sign up at https://expo.dev (free)
3. **Android Studio** (for Android builds) or **Xcode** (for iOS builds, macOS only)

## Step 1: Login to Expo

```bash
cd mobile
eas login
```

Enter your Expo account credentials.

## Step 2: Configure EAS Project (First Time Only)

```bash
eas build:configure
```

This will create/update the `eas.json` file and link your project to Expo.

## Step 3: Build the App

### For Android APK (Preview/Testing):

```bash
eas build --platform android --profile preview
```

This will:
- Build an APK file that can be installed on any Android device
- Upload it to Expo servers
- Provide a download link

### For Android AAB (Production/Play Store):

```bash
eas build --platform android --profile production
```

### For iOS (Requires macOS and Apple Developer Account):

```bash
eas build --platform ios --profile preview
```

### For Both Platforms:

```bash
eas build --platform all --profile preview
```

## Step 4: Download the Build

After the build completes:
1. You'll get a URL in the terminal
2. Visit the URL or check your Expo dashboard: https://expo.dev
3. Download the APK (Android) or IPA (iOS) file

## Alternative: Local Build (Advanced)

If you want to build locally without Expo servers:

### Android:
```bash
eas build --platform android --profile preview --local
```

### iOS (macOS only):
```bash
eas build --platform ios --profile preview --local
```

**Note:** Local builds require:
- Android: Android Studio and Android SDK
- iOS: Xcode and Apple Developer account

## Quick Start Commands

```bash
# Navigate to mobile directory
cd mobile

# Login to Expo (first time)
eas login

# Configure project (first time)
eas build:configure

# Build Android APK for testing
eas build --platform android --profile preview

# Build Android AAB for Play Store
eas build --platform android --profile production
```

## Important Notes

1. **API URL**: Make sure to update the API URL in `mobile/src/services/api.js` before building for production
2. **Environment Variables**: Consider using environment variables for API URLs
3. **Icons & Splash**: Add custom icons and splash screens in `assets/` folder if needed
4. **Version**: Update version in `app.json` before each production build

## Troubleshooting

- If build fails, check the Expo dashboard for detailed logs
- Make sure all dependencies are installed: `npm install`
- Clear cache if needed: `npx expo start --clear`

