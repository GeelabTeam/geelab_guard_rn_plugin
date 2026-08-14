# Manual Native SDK Installation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public React Native package require separately supplied GeelabGuard native SDK files with actionable build errors and complete npm installation instructions.

**Architecture:** Keep the existing package-relative SDK locations so local development and npm consumers use the same Gradle and CocoaPods integration. Add configuration-time existence checks at the two native dependency boundaries, then document the manual copy workflow in the npm-rendered root README and changelog.

**Tech Stack:** React Native, Gradle/Groovy, CocoaPods/Ruby, Markdown

---

### Task 1: Validate separately supplied native SDK files

**Files:**

- Modify: `android/build.gradle:34-62`
- Modify: `GeelabGuard.podspec:14-20`
- Modify: `package.json:15-39`

- [ ] **Step 1: Add the Android SDK prerequisite check**

Guard the existing local flat-directory AAR dependency with an existence check:

```groovy
def geelabGuardAarName = "geelabguard_android_v2.7.4_20260428"
def geelabGuardAarFileName = "${geelabGuardAarName}.aar"
def geelabGuardLibsDir = file("libs")
def geelabGuardAarFile = file("libs/${geelabGuardAarFileName}")

// The proprietary GeelabGuard SDK is supplied separately and must never be
// committed to this repository or published in the npm package.
if (!geelabGuardAarFile.isFile()) {
  throw new GradleException(
    "[geelabguard-rn-plugin] Missing GeelabGuard Android SDK. " +
    "Obtain ${geelabGuardAarFileName} through an authorized GeelabGuard channel " +
    "and copy it to the package-relative path android/libs/${geelabGuardAarFileName}. " +
    "See the installation section in README.md."
  )
}

rootProject.allprojects {
  repositories {
    flatDir {
      dirs geelabGuardLibsDir
    }
  }
}
```

Use the checked file in `dependencies`:

```groovy
dependencies {
  implementation "com.facebook.react:react-android"
  implementation(name: geelabGuardAarName, ext: "aar")
  testImplementation "junit:junit:4.13.2"
}
```

- [ ] **Step 2: Verify Android configuration succeeds with the local AAR**

Run:

```bash
cd example/android
./gradlew :geelabguard-rn-plugin:tasks --no-daemon --console=plain
```

Expected: `BUILD SUCCESSFUL` and no missing-SDK error.

- [ ] **Step 3: Add the iOS SDK prerequisite check**

Add these variables before `Pod::Spec.new` and keep the vendored framework declaration relative:

```ruby
geelabguard_framework_relative_path = "ios/Frameworks/GeelabGuardSDK.xcframework"
geelabguard_framework_path = File.join(__dir__, geelabguard_framework_relative_path)

# The proprietary GeelabGuard SDK is supplied separately and must never be
# committed to this repository or published in the npm package.
unless File.directory?(geelabguard_framework_path)
  raise Pod::Informative, <<~MESSAGE
    [geelabguard-rn-plugin] Missing GeelabGuard iOS SDK.
    Obtain GeelabGuardSDK.xcframework through an authorized GeelabGuard channel
    and copy it to the package-relative path:
      ios/Frameworks/GeelabGuardSDK.xcframework
    See the installation section in README.md.
  MESSAGE
end
```

Set:

```ruby
s.vendored_frameworks = geelabguard_framework_relative_path
```

- [ ] **Step 4: Verify CocoaPods accepts the locally supplied framework**

Run:

```bash
cd example/ios
bundle exec pod install
```

Expected: `Pod installation complete!` and no missing-SDK error.

- [ ] **Step 5: Exclude native binaries from the npm package**

Add explicit npm pack exclusions after the existing test exclusions in `package.json.files`:

```json
"!android/libs",
"!ios/Frameworks",
"!**/*.aar",
"!**/*.framework",
"!**/*.xcframework",
"!**/*.dylib",
"!**/*.so"
```

Run `corepack yarn pack --dry-run` and confirm no native SDK binary is listed.

- [ ] **Step 6: Commit the native prerequisite checks**

```bash
git add android/build.gradle GeelabGuard.podspec package.json
git commit -m "build(native): require separately supplied SDK files"
```

### Task 2: Document the npm installation prerequisite

**Files:**

- Modify: `README.md:3-73`
- Modify: `README.md:113-116`
- Modify: `README.md:198-214`
- Modify: `CHANGELOG.md:3-10`

- [ ] **Step 1: Correct the package description**

State that the bridge supports both architectures but does not distribute native SDK binaries:

```markdown
React Native bridge for the GeelabGuard device fingerprinting SDK. It exposes one
Promise-based API for both Native Modules and TurboModules. The proprietary
GeelabGuard Android and iOS SDK binaries are licensed and supplied separately;
they are not included in this repository or npm package.
```

- [ ] **Step 2: Replace the installation section with the manual copy workflow**

Document these ordered requirements:

````markdown
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
````

Keep the existing privacy-manifest responsibility section immediately after the iOS installation content.

- [ ] **Step 3: Remove remaining bundled-SDK claims**

Change the `initialize` description to:

```markdown
Registers the separately installed native SDK. Omitting `serverUrl` selects the
vendor SDK's default global endpoint.
```

- [ ] **Step 4: Add missing-SDK troubleshooting**

Add these entries before `GeelabGuard is not linked`:

```markdown
### Android SDK is missing

Copy `geelabguard_android_v2.7.4_20260428.aar` to
`node_modules/geelabguard-rn-plugin/android/libs/`, then rebuild the Android
application. Repeat this step after reinstalling `node_modules`.

### iOS SDK is missing

Copy `GeelabGuardSDK.xcframework` to
`node_modules/geelabguard-rn-plugin/ios/Frameworks/`, run `pod install` again,
then rebuild the iOS application. Repeat this step after reinstalling
`node_modules`.
```

- [ ] **Step 5: Correct the unreleased changelog**

Remove the claim that the native SDKs are bundled and add:

```markdown
### Changed

- Native Android and iOS SDK binaries must be obtained through an authorized
  GeelabGuard channel and copied into the installed package before native builds.
```

- [ ] **Step 6: Verify documentation consistency**

Run:

```bash
rg -n "bundles|bundled|No additional Maven dependency" README.md CHANGELOG.md
```

Expected: no stale claim that GitHub or npm contains the proprietary SDK binaries.

- [ ] **Step 7: Commit the public installation documentation**

```bash
git add README.md CHANGELOG.md docs/native-sdk-installation-design.md docs/native-sdk-installation-plan.md
git commit -m "docs(install): document separate native SDK setup"
```

### Task 3: Validate the publishable package

**Files:**

- Verify: `.gitignore`
- Verify: `package.json`
- Verify: `android/build.gradle`
- Verify: `GeelabGuard.podspec`
- Verify: `README.md`

- [ ] **Step 1: Run repository checks**

```bash
corepack yarn test --runInBand
corepack yarn typecheck
corepack yarn lint
```

Expected: all commands exit successfully.

- [ ] **Step 2: Inspect the npm package file list**

```bash
corepack yarn pack --dry-run
```

Expected: bridge source, compiled JavaScript/types, Gradle files, podspec, and README are included; no `.aar`, `.framework`, `.xcframework`, `.so`, or `.dylib` file is listed.

- [ ] **Step 3: Scan tracked files for excluded binaries and local configuration**

```bash
git ls-files \
  | rg '\.(aar|so|dylib|p12|mobileprovision|keystore)$|(^|/)Frameworks/' \
  | rg -v '^example/android/app/debug.keystore$'
git grep -n -I -E '/Users/|DEVELOPMENT_TEAM|BEGIN.*PRIVATE KEY'
```

Expected: both commands produce no sensitive publication finding. The standard example `debug.keystore` remains the only intentional signing-file exception and is excluded from the scan explicitly.

- [ ] **Step 4: Review the final change set before any push**

```bash
git status --short
git diff --stat
git diff
```

Expected: only the approved native prerequisite checks, installation documentation, changelog, design, and plan files are changed.
