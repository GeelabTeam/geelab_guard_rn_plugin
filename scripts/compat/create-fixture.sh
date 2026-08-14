#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <0.71.19|0.76.9|0.85.0> <plugin-tarball> [fixture-directory]" >&2
  exit 2
fi

RN_VERSION="$1"
PLUGIN_TARBALL="$2"

case "$RN_VERSION" in
  0.71.19)
    APP_NAME="GeelabGuardCompat071"
    INIT_COMMAND=(
      npx --yes react-native@0.71.19 init "$APP_NAME"
      --version 0.71.19 --npm --skip-install
    )
    ;;
  0.76.9)
    APP_NAME="GeelabGuardCompat076"
    INIT_COMMAND=(
      npx --yes @react-native-community/cli@15.1.3 init "$APP_NAME"
      --version 0.76.9 --pm npm --skip-install --skip-git-init
    )
    ;;
  0.85.0)
    APP_NAME="GeelabGuardCompat085"
    INIT_COMMAND=(
      npx --yes @react-native-community/cli@20.1.0 init "$APP_NAME"
      --version 0.85.0 --pm npm --skip-install --skip-git-init
    )
    ;;
  *)
    echo "Unsupported React Native version: $RN_VERSION" >&2
    exit 2
    ;;
esac

if [[ ! -f "$PLUGIN_TARBALL" ]]; then
  echo "Plugin tarball does not exist: $PLUGIN_TARBALL" >&2
  exit 2
fi

if [[ $# -eq 3 ]]; then
  FIXTURE_DIR="$3"
else
  FIXTURE_PARENT="$(mktemp -d "${TMPDIR:-/tmp}/geelabguard-rn-${RN_VERSION}.XXXXXX")"
  FIXTURE_DIR="$FIXTURE_PARENT/$APP_NAME"
fi

if [[ -e "$FIXTURE_DIR" ]]; then
  echo "Fixture directory already exists: $FIXTURE_DIR" >&2
  exit 2
fi

INIT_COMMAND+=(--directory "$FIXTURE_DIR")
"${INIT_COMMAND[@]}"

npm install "$PLUGIN_TARBALL" \
  --prefix "$FIXTURE_DIR" \
  --save-exact \
  --no-audit \
  --no-fund \
  --cache "${GEELAB_COMPAT_NPM_CACHE:-${TMPDIR:-/tmp}/geelabguard-npm-cache}"

ACTUAL_VERSION="$(node -p "require('$FIXTURE_DIR/node_modules/react-native/package.json').version")"
if [[ "$ACTUAL_VERSION" != "$RN_VERSION" ]]; then
  echo "Expected React Native $RN_VERSION, installed $ACTUAL_VERSION" >&2
  exit 1
fi

test -f "$FIXTURE_DIR/node_modules/geelabguard-rn-plugin/package.json"
echo "$FIXTURE_DIR"
