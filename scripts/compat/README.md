# React Native compatibility fixtures

These scripts recreate the pinned applications used by the compatibility
matrix. Fixtures, dependencies, Pods, Gradle caches, generated Codegen files,
and build products must remain outside this repository.

First build a local package and create a fixture:

```sh
yarn pack --out /tmp/geelabguard-rn-plugin.tgz
scripts/compat/create-fixture.sh \
  0.76.9 \
  /tmp/geelabguard-rn-plugin.tgz \
  /tmp/geelabguard-rn-076
```

Then build each architecture explicitly:

```sh
scripts/compat/verify-android.sh /tmp/geelabguard-rn-076 legacy
scripts/compat/verify-android.sh /tmp/geelabguard-rn-076 new
scripts/compat/verify-ios.sh /tmp/geelabguard-rn-076 legacy
scripts/compat/verify-ios.sh /tmp/geelabguard-rn-076 new
```

Supported fixture versions are `0.71.19`, `0.76.9`, and `0.85.0`. RN 0.71.19
is the Legacy baseline, RN 0.76.9 is tested in both modes, and RN 0.85.0 is
the current New Architecture baseline.

The scripts use the fixture's official Gradle wrapper, Gemfile, and Podfile.
Set `GEELAB_COMPAT_IOS_DESTINATION` to select another simulator. Set
`GEELAB_COMPAT_XCODE_CXX_FLAGS` only when an old React Native dependency needs
an upstream compiler workaround on a newer Xcode; the value is passed to the
fixture build and does not alter plugin sources.

Ruby 4 is newer than the Ruby toolchain supported by RN 0.71.19 and RN 0.76.9.
When reproducing those fixtures with Ruby 4, use an older supported Ruby or
apply the compatibility changes reported by their own CocoaPods scripts. Such
host-toolchain adjustments are not plugin requirements.
