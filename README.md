# geelabguard-rn-plugin

React Native bridge for the GeelabGuard device fingerprinting SDK. It exposes one
Promise-based API for both Native Modules and TurboModules. The proprietary
GeelabGuard Android and iOS SDK binaries are licensed and supplied separately;
they are not included in this repository or npm package.

## Compatibility

- React Native: `>=0.71.0`
- Android: API 21 or later
- iOS: 12.4 or later
- React Native Web: not supported

The consuming application's React Native configuration selects the architecture.
New Architecture applications use the Codegen TurboModule; supported Legacy
applications fall back to `NativeModules.GeelabGuard`. Both registration paths
delegate to the same native implementation on each platform.

| React Native | Architecture     | Android                                      | iOS                                                |
| ------------ | ---------------- | -------------------------------------------- | -------------------------------------------------- |
| 0.85.0       | New Architecture | Example build and bridge unit tests verified | Example simulator build and bridge XCTest verified |
| 0.76.9       | New Architecture | Fixture application build verified           | Fixture simulator build verified                   |
| 0.76.9       | Legacy           | Fixture application build verified           | Fixture simulator build verified                   |
| 0.71.19      | Legacy           | Fixture application build verified           | Fixture simulator build verified                   |

The package declares support for React Native `>=0.71.0`. The table records the
exact representative versions tested on August 11, 2026; it does not imply that
every future React Native release has already been verified. RN 0.71.19 covers
the oldest supported Legacy path, RN 0.76.9 covers both selectable paths, and RN
0.85.0 covers the current New Architecture path.

## Installation

### Native SDK prerequisite

Before building, obtain the following files through an authorized GeelabGuard
channel. They are not distributed through GitHub or npm.

| Platform | Required SDK                              | Package-relative destination                           |
| -------- | ----------------------------------------- | ------------------------------------------------------ |
| Android  | `geelabguard_android_v2.7.4_20260428.aar` | `android/libs/geelabguard_android_v2.7.4_20260428.aar` |
| iOS      | `GeelabGuardSDK.xcframework` 2.8.1        | `ios/Frameworks/GeelabGuardSDK.xcframework`            |

Install the JavaScript package first:

```sh
npm install geelabguard-rn-plugin
```

Copy only the SDK for each platform your application builds.

#### Android

```sh
mkdir -p node_modules/geelabguard-rn-plugin/android/libs
cp /path/to/geelabguard_android_v2.7.4_20260428.aar \
  node_modules/geelabguard-rn-plugin/android/libs/
```

The native SDK manifest supplies `android.permission.INTERNET`, and the plugin's
consumer rules preserve the `tech.geelab.core` and `tech.geelab.geegateway`
namespaces. Your application must use `minSdkVersion` 21 or later.

#### iOS

```sh
mkdir -p node_modules/geelabguard-rn-plugin/ios/Frameworks
cp -R /path/to/GeelabGuardSDK.xcframework \
  node_modules/geelabguard-rn-plugin/ios/Frameworks/

cd ios
pod install
```

The podspec links the framework and adds the required `-ObjC` linker flag. Your
application must target iOS 12.4 or later.

Reinstalling, pruning, or recreating `node_modules` may remove the manually
copied SDK files. Repeat the copy step before the next native build. Rebuild the
native Android or iOS application after installation; reloading JavaScript is
not sufficient.

### Repository development

When working from a clone of this repository, use the same package-relative
destinations directly under the repository root:

```text
android/libs/geelabguard_android_v2.7.4_20260428.aar
ios/Frameworks/GeelabGuardSDK.xcframework
```

#### Privacy manifest responsibility

The vendor integration documentation states that the iOS SDK accesses APIs in
`NSPrivacyAccessedAPICategoryDiskSpace` and
`NSPrivacyAccessedAPICategoryFileTimestamp`. This bridge does not bundle a
`PrivacyInfo.xcprivacy` because no vendor-approved required-reason codes were
provided with the SDK package.

Before App Store submission, obtain the approved reasons from the SDK vendor and
declare them in the host application's privacy manifest. The consuming
application remains responsible for ensuring that its reasons accurately match
its use of the SDK. This package does not claim App Store privacy compliance.

## Usage

```ts
import { GeelabGuard } from 'geelabguard-rn-plugin';

await GeelabGuard.initialize('your-app-id');

const localReceipt = await GeelabGuard.fetchReceipt('business-request-id');
// Send localReceipt.geeToken to your server when using the local flow.

const submittedReceipt = await GeelabGuard.submitReceipt('business-request-id');
// Send submittedReceipt.respondedGeeToken to your server when available.

const nativeSdkVersion = await GeelabGuard.getVersion();
```

Use the optional server URL only when it matches the region configured for the
AppID:

```ts
await GeelabGuard.initialize(
  'your-app-id',
  'https://riskct-eu.geelabapi.com/api/v1/client_report'
);
```

Do not log AppIDs, sign data, tokens, or `originalResponseBase64` in production.

## API

### `initialize(appId, serverUrl?)`

```ts
initialize(appId: string, serverUrl?: string): Promise<void>
```

Registers the separately installed native SDK. Omitting `serverUrl` selects the
vendor SDK's default global endpoint. This Promise confirms that the synchronous
native registration call completed; it does not validate credentials with the
remote service.

An empty AppID or an explicitly empty server URL rejects with
`INVALID_ARGUMENT` before invoking native code.

### `fetchReceipt(signData)`

```ts
fetchReceipt(signData: string): Promise<GeelabGuardReceipt>
```

Creates a local receipt on a background executor. The string may be empty when
the business flow does not need to bind data to the receipt. Call `initialize`
first.

### `submitReceipt(signData)`

```ts
submitReceipt(signData: string): Promise<GeelabGuardReceipt>
```

Creates and submits a receipt through the vendor SDK. For network or service
failures, the rejected `GeelabGuardError` can contain a fallback local receipt.

### `getVersion()`

```ts
getVersion(): Promise<string>
```

Returns the separately installed native SDK version for the current platform.

## Receipt

```ts
type GeelabGuardReceipt = {
  appId: string | null;
  geeToken: string | null;
  geeId: string | null;
  geeIdTimestamp: string | null;
  respondedGeeToken: string | null;
  originalResponseBase64: string | null;
};
```

`originalResponseBase64` is the vendor SDK's binary response encoded as Base64.
Decode it only when required for diagnostics, and do not log it or expose it to
end users.

## Errors

All rejected native operations are normalized to `GeelabGuardError`.

| Public code            | Native code | Meaning                                                 |
| ---------------------- | ----------: | ------------------------------------------------------- |
| `INVALID_ARGUMENT`     |         n/a | A JavaScript argument is invalid.                       |
| `NOT_INITIALIZED`      |        -200 | The AppID is not registered or no receipt is available. |
| `NETWORK_ERROR`        |        -300 | The native submission failed at the network layer.      |
| `INVALID_RESPONSE`     |        -500 | The service response format is invalid.                 |
| `SERVICE_FAILURE`      |        -501 | The service reported a failure.                         |
| `UNKNOWN_NATIVE_ERROR` |       other | The native SDK returned an undocumented failure.        |

```ts
import { GeelabGuard, GeelabGuardError } from 'geelabguard-rn-plugin';

try {
  await GeelabGuard.submitReceipt('business-request-id');
} catch (error) {
  if (error instanceof GeelabGuardError) {
    const fallbackGeeToken = error.receipt?.geeToken;
    // Handle error.code and send the fallback token through your secure flow.
  }
}
```

The bridge exposes only a stable public code, the optional native numeric code,
and an optional normalized fallback receipt. Vendor `userInfo` details are not
forwarded.

## Troubleshooting

### Android SDK is missing

Copy `geelabguard_android_v2.7.4_20260428.aar` to
`node_modules/geelabguard-rn-plugin/android/libs/`, then rebuild the Android
application. Repeat this step after reinstalling `node_modules`.

### iOS SDK is missing

Copy `GeelabGuardSDK.xcframework` to
`node_modules/geelabguard-rn-plugin/ios/Frameworks/`, run `pod install` again,
then rebuild the iOS application. Repeat this step after reinstalling
`node_modules`.

### `GeelabGuard is not linked`

Install native dependencies and rebuild the application. Reloading JavaScript is
not sufficient after adding a native package.

### iOS duplicate symbols

Do not declare another Objective-C class named `GeelabGuard`. The vendor
framework already exports that class; this package registers its React Native
bridge internally as `RNGeelabGuard` while preserving the JavaScript module name.

### Receipt is unavailable

Call and await `initialize` before requesting a receipt. Verify that the AppID and
optional server URL belong to the same configured region.

## Development verification

The following checks are part of the repository workflow:

```sh
corepack yarn install --immutable
corepack yarn test
corepack yarn typecheck
corepack yarn lint
corepack yarn codegen
corepack yarn pack --dry-run
```

Native verification also includes Android unit/build tasks and iOS XCTest plus
an iPhone simulator build after the separately supplied native SDK files are
placed in the repository paths documented above. Successful receipt submission
is skipped when `GEELAB_GUARD_TEST_APP_ID` is not supplied; no credential is
committed.

Pinned compatibility fixtures can be recreated outside the repository with
the scripts in `scripts/compat/`. See `scripts/compat/README.md` for the exact
commands and host-toolchain notes.

## License

MIT
