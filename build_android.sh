#!/bin/bash

# PINN Android Build Script
# This script automates the build process for both APK and AAB files

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KEYSTORE_PATH="android/app/pinn-release-key.keystore"
KEYSTORE_PASSWORD="eqyuac6deV!"
KEY_ALIAS="pinn-key"
BUILD_TOOLS_PATH="/Users/kevinshum/Library/Android/sdk/build-tools/35.0.0"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to increment version numbers
increment_version() {
    print_status "Incrementing version numbers..."
    
    # Read current version from package.json
    CURRENT_VERSION=$(grep '"version"' package.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')
    print_status "Current version: $CURRENT_VERSION"
    
    # Increment patch version (e.g., 1.0.1 -> 1.0.2)
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    
    print_status "New version: $NEW_VERSION"
    
    # Update package.json
    sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
    
    # Update android/app/build.gradle
    CURRENT_VERSION_CODE=$(grep 'versionCode' android/app/build.gradle | sed 's/.*versionCode *\([0-9]*\).*/\1/')
    NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))
    
    sed -i '' "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/" android/app/build.gradle
    sed -i '' "s/versionName \"$CURRENT_VERSION\"/versionName \"$NEW_VERSION\"/" android/app/build.gradle
    
    print_success "Version incremented to $NEW_VERSION (versionCode: $NEW_VERSION_CODE)"
}

# Function to check if required tools exist
check_requirements() {
    print_status "Checking requirements..."
    
    if [ ! -d "android" ]; then
        print_error "Android directory not found. Please run this script from the project root."
        exit 1
    fi
    
    if [ ! -f "$KEYSTORE_PATH" ]; then
        print_error "Keystore file not found at $KEYSTORE_PATH"
        exit 1
    fi
    
    if [ ! -f "$BUILD_TOOLS_PATH/apksigner" ]; then
        print_error "Android build tools not found at $BUILD_TOOLS_PATH"
        exit 1
    fi
    
    print_success "All requirements met"
}

# Function to build APK
build_apk() {
    print_status "Building APK..."
    cd android
    ./gradlew assembleRelease
    cd ..
    print_success "APK build completed"
}

# Function to build AAB
build_aab() {
    print_status "Building AAB (skipping native builds)..."
    cd android
    ./gradlew bundleRelease -x externalNativeBuildRelease
    cd ..
    print_success "AAB build completed"
}

# Function to sign APK
sign_apk() {
    print_status "Signing APK..."
    $BUILD_TOOLS_PATH/apksigner sign \
        --ks "$KEYSTORE_PATH" \
        --ks-key-alias "$KEY_ALIAS" \
        --ks-pass "pass:$KEYSTORE_PASSWORD" \
        --key-pass "pass:$KEYSTORE_PASSWORD" \
        android/app/build/outputs/apk/release/app-release.apk
    print_success "APK signed"
}

# Function to sign AAB
sign_aab() {
    print_status "Signing AAB..."
    jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
        -keystore "$KEYSTORE_PATH" \
        -storepass "$KEYSTORE_PASSWORD" \
        -keypass "$KEYSTORE_PASSWORD" \
        android/app/build/outputs/bundle/release/app-release.aab \
        "$KEY_ALIAS"
    print_success "AAB signed"
}

# Function to verify APK signing
verify_apk() {
    print_status "Verifying APK signature..."
    $BUILD_TOOLS_PATH/apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
    print_success "APK signature verified"
}

# Function to verify AAB signing
verify_aab() {
    print_status "Verifying AAB signature..."
    jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab
    print_success "AAB signature verified"
}

# Function to show file information
show_file_info() {
    print_status "Build completed! Files created:"
    echo ""
    echo "APK: $(pwd)/android/app/build/outputs/apk/release/app-release.apk"
    echo "AAB: $(pwd)/android/app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "File sizes:"
    ls -lh android/app/build/outputs/apk/release/app-release.apk
    ls -lh android/app/build/outputs/bundle/release/app-release.aab
    echo ""
    print_warning "Remember: Use the AAB file for Google Play Store uploads"
}

# Main execution
main() {
    echo "=========================================="
    echo "    PINN Android Build Script"
    echo "=========================================="
    echo ""
    
    check_requirements
    increment_version
    
    # Parse command line arguments
    BUILD_APK=true
    BUILD_AAB=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --apk-only)
                BUILD_AAB=false
                shift
                ;;
            --aab-only)
                BUILD_APK=false
                shift
                ;;
            --help)
                echo "Usage: $0 [--apk-only] [--aab-only] [--help]"
                echo ""
                echo "Options:"
                echo "  --apk-only    Build only APK file"
                echo "  --aab-only    Build only AAB file"
                echo "  --help        Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Build files
    if [ "$BUILD_APK" = true ]; then
        build_apk
        sign_apk
        verify_apk
    fi
    
    if [ "$BUILD_AAB" = true ]; then
        build_aab
        sign_aab
        verify_aab
    fi
    
    show_file_info
    
    print_success "Build process completed successfully!"
    echo ""
    print_warning "SHA-1 Fingerprint should be: EA:28:75:70:8B:24:3F:69:3F:0A:C0:A2:5E:E5:14:DA:27:9C:BC:5D"
}

# Run main function
main "$@"
