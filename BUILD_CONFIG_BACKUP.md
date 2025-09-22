# Build Configuration Backup

## Current Working Configuration (September 21, 2025)

### android/app/build.gradle - Key Sections

```gradle
android {
    namespace 'com.pinn.app'
    defaultConfig {
        applicationId 'com.pinn.app'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('pinn-release-key.keystore')
            storePassword 'eqyuac6deV!'
            keyAlias 'pinn-key'
            keyPassword 'eqyuac6deV!'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds')?.toBoolean() ?: false)
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            crunchPngs (findProperty('android.enablePngCrunchInReleaseBuilds')?.toBoolean() ?: true)
        }
    }
}
```

### Package Structure
- **MainActivity.kt**: `android/app/src/main/java/com/pinn/app/MainActivity.kt`
- **MainApplication.kt**: `android/app/src/main/java/com/pinn/app/MainApplication.kt`

### Keystore Information
- **File**: `android/app/pinn-release-key.keystore`
- **Password**: `eqyuac6deV!`
- **Key Alias**: `pinn-key`
- **SHA-1**: `EA:28:75:70:8B:24:3F:69:3F:0A:C0:A2:5E:E5:14:DA:27:9C:BC:5D`

### App Configuration
- **Name**: PINN
- **Package**: com.pinn.app
- **Version**: 1.0.0

### Build Commands That Work
```bash
# APK
./gradlew assembleRelease

# AAB (skip native builds to avoid CMake issues)
./gradlew bundleRelease -x externalNativeBuildRelease

# Manual signing required after build
```

### Known Issues & Solutions
1. **BuildConfig not found**: Fixed by ensuring package names match in build.gradle
2. **Wrong signing key**: Fixed by adding proper release signing configuration
3. **Native build failures**: Bypassed with `-x externalNativeBuildRelease` flag
4. **Manual signing required**: Gradle signing doesn't work automatically, manual signing needed

### Environment
- **Build Tools**: 35.0.0
- **Target SDK**: 35
- **Min SDK**: 24
- **Gradle**: 8.13
- **Kotlin**: 2.0.21
