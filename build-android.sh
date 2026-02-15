#!/bin/bash

# CircuiTry3D Android Build Script
# This script builds the web app and creates a signed Android App Bundle (AAB)

set -e  # Exit on error

echo "=================================="
echo "CircuiTry3D Android Build Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Build web app
echo -e "${YELLOW}Step 2: Building web application...${NC}"
npm run build -- --mode capacitor
echo -e "${GREEN}✓ Web app built${NC}"
echo ""

# Step 3: Sync Capacitor
echo -e "${YELLOW}Step 3: Syncing Capacitor...${NC}"
npx cap sync android
echo -e "${GREEN}✓ Capacitor synced${NC}"
echo ""

# Step 4: Build Android AAB
echo -e "${YELLOW}Step 4: Building Android App Bundle...${NC}"

# Play Store releases require a local signing config.
if [ ! -f "android/key.properties" ]; then
    echo -e "${RED}Error: android/key.properties not found.${NC}"
    echo ""
    echo "To create it:"
    echo "1) Copy android/key.properties.example -> android/key.properties"
    echo "2) Generate a keystore under android/app/keystore/"
    echo "3) Update storeFile/keyAlias/passwords in android/key.properties"
    echo ""
    echo -e "${YELLOW}Note:${NC} Keystores and key.properties must NOT be committed to git."
    exit 1
fi

# Validate storeFile points to an existing file (relative to android/app)
STORE_FILE_REL="$(grep -E '^storeFile=' android/key.properties | cut -d= -f2- | tr -d '\r' | xargs)"
if [ -z "$STORE_FILE_REL" ]; then
    echo -e "${RED}Error: storeFile is missing from android/key.properties${NC}"
    exit 1
fi
KEYSTORE_PATH="android/app/$STORE_FILE_REL"
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo -e "${RED}Error: Keystore not found at: $KEYSTORE_PATH${NC}"
    echo "Update storeFile in android/key.properties or create the keystore."
    exit 1
fi

# Ensure Android SDK location is configured for Gradle.
# Prefer environment variables, but allow pre-existing android/local.properties.
SDK_PATH="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
if [ -n "$SDK_PATH" ]; then
    if [ ! -d "$SDK_PATH" ]; then
        echo -e "${RED}Error: Android SDK path does not exist: $SDK_PATH${NC}"
        echo "Set ANDROID_SDK_ROOT (or ANDROID_HOME) to a valid SDK directory."
        exit 1
    fi
    SDK_ESCAPED="$(printf '%s\n' "$SDK_PATH" | sed 's/\\/\\\\/g')"
    printf "sdk.dir=%s\n" "$SDK_ESCAPED" > android/local.properties
    echo -e "${GREEN}✓ Android SDK configured via local.properties${NC}"
elif [ ! -f "android/local.properties" ]; then
    echo -e "${RED}Error: Android SDK location not configured.${NC}"
    echo "Set ANDROID_SDK_ROOT (or ANDROID_HOME), or create android/local.properties with:"
    echo "sdk.dir=/absolute/path/to/Android/Sdk"
    exit 1
fi

cd android

# Check if gradlew exists
if [ ! -f "gradlew" ]; then
    echo -e "${RED}Error: gradlew not found in android directory${NC}"
    exit 1
fi

# Make gradlew executable
chmod +x gradlew

# Clean previous builds
echo "Cleaning previous builds..."
./gradlew clean

# Build release AAB
echo "Building release AAB..."
./gradlew bundleRelease

cd ..

# Step 5: Verify the AAB was created
AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
    echo -e "${GREEN}✓ AAB built successfully!${NC}"
    echo ""
    echo "=================================="
    echo "Build Summary"
    echo "=================================="
    echo "AAB Location: $AAB_PATH"
    echo "File size: $(du -h "$AAB_PATH" | cut -f1)"
    echo ""
    
    # Copy AAB to root directory for easy access
    cp "$AAB_PATH" "circuitry3d-release.aab"
    echo -e "${GREEN}AAB copied to: circuitry3d-release.aab${NC}"
    echo ""
    
    # Verify signing
    echo "Verifying AAB signing..."
    if command -v jarsigner &> /dev/null; then
        if jarsigner -verify -verbose -certs "$AAB_PATH" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ AAB is properly signed${NC}"
        else
            echo -e "${RED}⚠ Warning: AAB signing verification failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ jarsigner not found, skipping signature verification${NC}"
    fi
    
    echo ""
    echo "=================================="
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo "1. Review the Play Store submission guide: PLAY_STORE_SUBMISSION_GUIDE.md"
    echo "2. Upload circuitry3d-release.aab to Google Play Console"
    echo "3. Complete store listing with assets from play-store-assets/"
    echo ""
else
    echo -e "${RED}Error: AAB file not found at $AAB_PATH${NC}"
    echo "Build may have failed. Check the error messages above."
    exit 1
fi
