# Quick Build Reference

## One-Command Build
```bash
./build_android.sh
```

## Manual Build (if script fails)

### 1. Build APK
```bash
cd android && ./gradlew assembleRelease && cd ..
```

### 2. Build AAB  
```bash
cd android && ./gradlew bundleRelease -x externalNativeBuildRelease && cd ..
```

### 3. Sign APK
```bash
/Users/kevinshum/Library/Android/sdk/build-tools/35.0.0/apksigner sign \
  --ks android/app/pinn-release-key.keystore \
  --ks-key-alias pinn-key \
  --ks-pass pass:eqyuac6deV! \
  --key-pass pass:eqyuac6deV! \
  android/app/build/outputs/apk/release/app-release.apk
```

### 4. Sign AAB
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore android/app/pinn-release-key.keystore \
  -storepass eqyuac6deV! \
  -keypass eqyuac6deV! \
  android/app/build/outputs/bundle/release/app-release.aab \
  pinn-key
```

## Key Info
- **Keystore**: `android/app/pinn-release-key.keystore`
- **Password**: `eqyuac6deV!`
- **SHA-1**: `EA:28:75:70:8B:24:3F:69:3F:0A:C0:A2:5E:E5:14:DA:27:9C:BC:5D`
- **Package**: `com.pinn.app`

## Output Files
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
