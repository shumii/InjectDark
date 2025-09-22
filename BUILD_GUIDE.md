# PINN Android Build Guide

## Overview
This guide documents the working build process for the PINN Android app, including how to build both APK and AAB files for Google Play Store upload.

## Prerequisites
- Android SDK installed and configured
- Java Development Kit (JDK)
- Gradle wrapper in the project
- Production keystore file: `android/app/pinn-release-key.keystore`

## Build Configuration

### Keystore Details
- **File**: `android/app/pinn-release-key.keystore`
- **Password**: `eqyuac6deV!`
- **Key Alias**: `pinn-key`
- **SHA-1 Fingerprint**: `EA:28:75:70:8B:24:3F:69:3F:0A:C0:A2:5E:E5:14:DA:27:9C:BC:5D`

### Package Information
- **App Name**: PINN
- **Package ID**: `com.pinn.app`
- **Version**: 1.0.0

## Build Process

### 1. Navigate to Android Directory
```bash
cd android
```

### 2. Build APK (Release)
```bash
./gradlew assembleRelease
```

### 3. Build AAB (Release) - Skip Native Build Issues
```bash
./gradlew bundleRelease -x externalNativeBuildRelease
```

### 4. Manual Signing (Required)

#### Sign APK
```bash
/Users/kevinshum/Library/Android/sdk/build-tools/35.0.0/apksigner sign \
  --ks app/pinn-release-key.keystore \
  --ks-key-alias pinn-key \
  --ks-pass pass:eqyuac6deV! \
  --key-pass pass:eqyuac6deV! \
  app/build/outputs/apk/release/app-release.apk
```

#### Sign AAB
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore app/pinn-release-key.keystore \
  -storepass eqyuac6deV! \
  -keypass eqyuac6deV! \
  app/build/outputs/bundle/release/app-release.aab \
  pinn-key
```

### 5. Verify Signing

#### Verify APK
```bash
/Users/kevinshum/Library/Android/sdk/build-tools/35.0.0/apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```

#### Verify AAB
```bash
jarsigner -verify app/build/outputs/bundle/release/app-release.aab
```

## Output Files
- **APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`

## Common Issues & Solutions

### Issue: BuildConfig Not Found
**Cause**: Package name mismatch in build.gradle
**Solution**: Ensure `namespace` and `applicationId` in `android/app/build.gradle` match the package structure:
```gradle
namespace 'com.pinn.app'
defaultConfig {
    applicationId 'com.pinn.app'
}
```

### Issue: Wrong Signing Key
**Cause**: Release build using debug signing config
**Solution**: Ensure `build.gradle` has proper release signing configuration:
```gradle
signingConfigs {
    release {
        storeFile file('pinn-release-key.keystore')
        storePassword 'eqyuac6deV!'
        keyAlias 'pinn-key'
        keyPassword 'eqyuac6deV!'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

### Issue: Native Build Failures
**Cause**: CMake/native compilation issues
**Solution**: Skip native builds for AAB: `./gradlew bundleRelease -x externalNativeBuildRelease`

## Google Play Store Upload
- Use the **AAB file** for Google Play Store uploads
- The APK can be used for direct distribution or testing
- Both files are signed with the correct production keystore

## Environment Variables
Make sure these are set:
```bash
export ANDROID_HOME=/Users/kevinshum/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

## Last Successful Build
- **Date**: September 21, 2025
- **Build Tools**: 35.0.0
- **Target SDK**: 35
- **Min SDK**: 24
- **Gradle**: 8.13
- **Kotlin**: 2.0.21

## Notes
- Always verify the SHA-1 fingerprint matches: `EA:28:75:70:8B:24:3F:69:3F:0A:C0:A2:5E:E5:14:DA:27:9C:BC:5D`
- The keystore password is: `eqyuac6deV!`
- Manual signing is currently required due to Gradle signing configuration issues
- Native build issues can be bypassed for AAB builds using the `-x externalNativeBuildRelease` flag
