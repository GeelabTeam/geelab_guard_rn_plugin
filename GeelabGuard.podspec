require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
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

Pod::Spec.new do |s|
  s.name         = "GeelabGuard"
  s.module_name  = "GeelabGuard"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.4" }
  s.source       = { :git => "https://github.com/GeeCPF/geelabguard-rn-plugin.git", :tag => "#{s.version}" }

  s.source_files = "ios/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/*.h"
  s.vendored_frameworks = geelabguard_framework_relative_path
  s.swift_version = "5.0"
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "OTHER_LDFLAGS" => "$(inherited) -ObjC"
  }

  s.test_spec "Tests" do |test_spec|
    test_spec.platforms = { :ios => "15.1" }
    test_spec.source_files = "ios/Tests/**/*.swift"
  end

  install_modules_dependencies(s)
end
