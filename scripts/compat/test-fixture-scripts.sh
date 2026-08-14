#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/geelabguard-compat-tests.XXXXXX")"
trap 'rm -rf "$TEST_ROOT"' EXIT

assert_fails_with() {
  local expected="$1"
  shift

  local output
  if output=$("$@" 2>&1); then
    echo "Expected command to fail: $*" >&2
    exit 1
  fi

  if [[ "$output" != *"$expected"* ]]; then
    echo "Expected error containing: $expected" >&2
    echo "Actual output: $output" >&2
    exit 1
  fi
}

touch "$TEST_ROOT/plugin.tgz"
mkdir "$TEST_ROOT/existing"

assert_fails_with \
  "Unsupported React Native version: 0.75.0" \
  "$SCRIPT_DIR/create-fixture.sh" 0.75.0 "$TEST_ROOT/plugin.tgz" "$TEST_ROOT/new"

assert_fails_with \
  "Fixture directory already exists" \
  "$SCRIPT_DIR/create-fixture.sh" 0.76.9 "$TEST_ROOT/plugin.tgz" "$TEST_ROOT/existing"

assert_fails_with \
  "Architecture must be legacy or new" \
  "$SCRIPT_DIR/verify-android.sh" "$TEST_ROOT/existing" invalid

assert_fails_with \
  "Architecture must be legacy or new" \
  "$SCRIPT_DIR/verify-ios.sh" "$TEST_ROOT/existing" invalid

echo "Compatibility script tests passed"
