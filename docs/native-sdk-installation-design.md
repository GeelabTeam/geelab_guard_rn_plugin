# Native SDK Installation Design

## Goal

Keep the proprietary GeelabGuard Android and iOS SDK binaries out of GitHub and npm while giving authorized users a clear, repeatable manual installation path.

## Distribution Constraints

- The React Native bridge is public.
- The Android AAR and iOS XCFramework are obtained separately through an authorized GeelabGuard channel.
- The repository and npm package must not download, embed, or publish either native SDK.
- `package.json` explicitly excludes native binary locations and extensions from the npm pack list; npm publication does not rely on `.gitignore` alone.
- Documentation must not invent a download URL or imply that the native SDK license is covered by the bridge's MIT license.

## Required Files

After installing `geelabguard-rn-plugin`, users copy the authorized SDK files into the installed package:

```text
node_modules/geelabguard-rn-plugin/android/libs/geelabguard_android_v2.7.4_20260428.aar
node_modules/geelabguard-rn-plugin/ios/Frameworks/GeelabGuardSDK.xcframework
```

Repository contributors use the equivalent package-root paths:

```text
android/libs/geelabguard_android_v2.7.4_20260428.aar
ios/Frameworks/GeelabGuardSDK.xcframework
```

Reinstalling or pruning `node_modules` may remove manually copied SDK files, so consumers must repeat the copy step before rebuilding native applications.

## Build Guidance

### Android

`android/build.gradle` checks for the expected AAR during Gradle configuration. When it is absent, Gradle fails with an actionable message that names the expected relative path and explains that the SDK must be obtained separately.

### iOS

`GeelabGuard.podspec` checks for the expected XCFramework when CocoaPods evaluates the podspec. When it is absent, `pod install` fails with an actionable message that names the expected relative path and explains that the SDK must be obtained separately.

The checks never print credentials, internal URLs, or local absolute paths.

## Documentation Changes

The root `README.md`, which is also rendered on npm, will:

1. State that native SDK binaries are not bundled.
2. Explain the separate authorization prerequisite.
3. Document the order: install npm package, copy SDK files, run CocoaPods for iOS, then rebuild.
4. Distinguish npm consumer paths from repository contributor paths.
5. Warn that reinstalling `node_modules` removes manually copied SDK files.
6. Add troubleshooting entries for missing Android and iOS SDK files.

## Verification

- Confirm the repository and npm pack list exclude the AAR and XCFramework.
- Confirm Android configuration succeeds when the AAR exists and fails with the intended message when it is absent.
- Confirm CocoaPods accepts the podspec when the XCFramework exists and fails with the intended message when it is absent.
- Run the existing JavaScript tests, type checking, lint, and available native builds with local SDK files present.
