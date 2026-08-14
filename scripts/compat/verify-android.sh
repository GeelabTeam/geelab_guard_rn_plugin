#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <fixture-directory> <legacy|new>" >&2
  exit 2
fi

FIXTURE_DIR="$1"
ARCHITECTURE="$2"

case "$ARCHITECTURE" in
  legacy) NEW_ARCH_ENABLED=false ;;
  new) NEW_ARCH_ENABLED=true ;;
  *)
    echo "Architecture must be legacy or new: $ARCHITECTURE" >&2
    exit 2
    ;;
esac

if [[ ! -x "$FIXTURE_DIR/android/gradlew" ]]; then
  echo "Android fixture is incomplete: $FIXTURE_DIR" >&2
  exit 2
fi

(
  cd "$FIXTURE_DIR/android"
  ./gradlew app:assembleDebug \
    --no-daemon \
    --console=plain \
    "-PnewArchEnabled=$NEW_ARCH_ENABLED"
)
