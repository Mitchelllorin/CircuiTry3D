#!/usr/bin/env bash

# Installs Android command-line SDK components required for release builds.
# Usage:
#   ./scripts/setup-android-sdk.sh
#   ./scripts/setup-android-sdk.sh /custom/sdk/path

set -euo pipefail

SDK_ROOT="${1:-${ANDROID_SDK_ROOT:-$HOME/android-sdk}}"
TOOLS_VERSION="11076708"
TOOLS_ZIP_URL="https://dl.google.com/android/repository/commandlinetools-linux-${TOOLS_VERSION}_latest.zip"
TOOLS_DIR="${SDK_ROOT}/cmdline-tools/latest"
TOOLS_BIN="${TOOLS_DIR}/bin"

echo "=================================="
echo "CircuiTry3D Android SDK Setup"
echo "=================================="
echo "SDK root: ${SDK_ROOT}"
echo ""

if ! command -v java >/dev/null 2>&1; then
  echo "Error: Java is required. Install JDK 17+ first."
  exit 1
fi

mkdir -p "${SDK_ROOT}/cmdline-tools"

if [ ! -x "${TOOLS_BIN}/sdkmanager" ]; then
  TMP_ZIP="$(mktemp /tmp/android-cmdline-tools-XXXXXX.zip)"
  TMP_DIR="$(mktemp -d /tmp/android-cmdline-tools-XXXXXX)"

  echo "Downloading Android command-line tools..."
  curl -fsSL "${TOOLS_ZIP_URL}" -o "${TMP_ZIP}"

  echo "Extracting command-line tools..."
  unzip -q "${TMP_ZIP}" -d "${TMP_DIR}"
  rm -rf "${TOOLS_DIR}"
  mkdir -p "${TOOLS_DIR}"
  cp -R "${TMP_DIR}/cmdline-tools/." "${TOOLS_DIR}/"

  rm -rf "${TMP_DIR}" "${TMP_ZIP}"
fi

echo "Installing SDK components (platform-tools, Android 35, build-tools 35.0.0)..."
yes | "${TOOLS_BIN}/sdkmanager" --sdk_root="${SDK_ROOT}" \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0"

yes | "${TOOLS_BIN}/sdkmanager" --sdk_root="${SDK_ROOT}" --licenses >/dev/null

echo ""
echo "Android SDK setup complete."
echo ""
echo "Next steps:"
echo "  export ANDROID_SDK_ROOT=\"${SDK_ROOT}\""
echo "  export PATH=\"${TOOLS_BIN}:${SDK_ROOT}/platform-tools:\$PATH\""
echo "  ./build-android.sh"

