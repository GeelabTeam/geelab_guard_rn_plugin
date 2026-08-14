#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <GeelabGuardSpec/GeelabGuardSpec.h>
@interface RNGeelabGuard : NSObject <NativeGeelabGuardSpec>
#else
@interface RNGeelabGuard : NSObject <RCTBridgeModule>
#endif
@end
