#import "GeelabGuard.h"
#if __has_include(<GeelabGuard/GeelabGuard-Swift.h>)
#import <GeelabGuard/GeelabGuard-Swift.h>
#else
#import "GeelabGuard-Swift.h"
#endif

@interface RNGeelabGuard ()
@property(nonatomic, strong) GeelabGuardImplementation *implementation;
@end

@implementation RNGeelabGuard
RCT_EXPORT_MODULE(GeelabGuard)

- (instancetype)init {
  self = [super init];
  if (self) { self.implementation = [GeelabGuardImplementation new]; }
  return self;
}

RCT_REMAP_METHOD(initialize, initialize:(NSString *)appId
serverUrl:(NSString * _Nullable)serverUrl
resolve:(RCTPromiseResolveBlock)resolve
reject:(RCTPromiseRejectBlock)reject) {
  [self.implementation initializeWithAppId:appId serverUrl:serverUrl resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(fetchReceipt, fetchReceipt:(NSString *)signData
resolve:(RCTPromiseResolveBlock)resolve
reject:(RCTPromiseRejectBlock)reject) {
  [self.implementation fetchReceiptWithSignData:signData resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(submitReceipt, submitReceipt:(NSString *)signData
resolve:(RCTPromiseResolveBlock)resolve
reject:(RCTPromiseRejectBlock)reject) {
  [self.implementation submitReceiptWithSignData:signData resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(getVersion, getVersion:(RCTPromiseResolveBlock)resolve
reject:(RCTPromiseRejectBlock)reject) {
  [self.implementation getVersionWithResolve:resolve reject:reject];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeGeelabGuardSpecJSI>(params);
}
#endif
@end
