# Build APK Instructions

## Quick Build (Recommended)

Run these commands in your terminal:

```bash
cd mobile

# 1. Initialize EAS project (first time only)
eas init

# When prompted:
# - Create a new project? (y/n): y
# - Project name: todo-app (or press Enter for default)

# 2. Build Android APK
eas build --platform android --profile preview
```

## Alternative: Build with Production Profile

For production-ready APK:

```bash
cd mobile
eas build --platform android --profile production
```

## What Happens Next

1. EAS will upload your code to Expo servers
2. Build will run in the cloud (takes 10-20 minutes)
3. You'll get a download link when build completes
4. Download the APK file
5. Install on any Android device

## Check Build Status

After starting the build, you can:
- Check status in terminal
- Visit: https://expo.dev/accounts/aadarsh050/projects/todo-app/builds
- You'll receive an email when build completes

## Download APK

Once build is complete:
1. Click the download link in terminal or Expo dashboard
2. Download the `.apk` file
3. Transfer to Android device
4. Enable "Install from Unknown Sources" in Android settings
5. Install the APK

## Troubleshooting

- **Build fails?** Check the error logs in Expo dashboard
- **Need to update API URL?** Update `mobile/src/services/api.js` before building
- **Want to test locally?** Use `npx expo start` for development

