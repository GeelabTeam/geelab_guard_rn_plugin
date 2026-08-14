#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <fixture-directory> <legacy|new>" >&2
  exit 2
fi

FIXTURE_DIR="$1"
ARCHITECTURE="$2"

case "$ARCHITECTURE" in
  legacy) NEW_ARCH_ENABLED=0 ;;
  new) NEW_ARCH_ENABLED=1 ;;
  *)
    echo "Architecture must be legacy or new: $ARCHITECTURE" >&2
    exit 2
    ;;
esac

if [[ ! -f "$FIXTURE_DIR/ios/Podfile" ]]; then
  echo "iOS fixture is incomplete: $FIXTURE_DIR" >&2
  exit 2
fi

APP_NAME="$(node -p "require('$FIXTURE_DIR/package.json').name")"
DESTINATION="${GEELAB_COMPAT_IOS_DESTINATION:-platform=iOS Simulator,name=iPhone 17}"
CXX_FLAGS="${GEELAB_COMPAT_XCODE_CXX_FLAGS:--Wno-deprecated-literal-operator}"

(
  cd "$FIXTURE_DIR/ios"
  bundle install
  env RCT_NEW_ARCH_ENABLED="$NEW_ARCH_ENABLED" bundle exec pod install
  xcodebuild build \
    -quiet \
    -workspace "$APP_NAME.xcworkspace" \
    -scheme "$APP_NAME" \
    -configuration Debug \
    -destination "$DESTINATION" \
    "OTHER_CPLUSPLUSFLAGS=\$(inherited) $CXX_FLAGS"
)
