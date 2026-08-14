import Foundation
import GeelabGuardSDK

struct GeelabGuardNativeReceipt {
  let appId: String?
  let geeToken: String?
  let geeId: String?
  let geeIdTimestamp: String?
  let respondedGeeToken: String?
  let originalResponse: Data?
}

protocol GeelabGuardSdk {
  func register(appId: String, serverUrl: String?)

  func fetchReceipt(signData: Data?) -> GeelabGuardNativeReceipt?

  func submitReceipt(
    signData: Data?,
    completion: @escaping (GeelabGuardNativeReceipt?, NSError?) -> Void
  )

  var version: String { get }
}

final class IOSGeelabGuardSdk: GeelabGuardSdk {
  func register(appId: String, serverUrl: String?) {
    if let serverUrl = serverUrl {
      GeelabGuardSDK.GeelabGuard.register(
        withAppID: appId,
        serverURL: serverUrl
      )
    } else {
      GeelabGuardSDK.GeelabGuard.register(withAppID: appId)
    }
  }

  func fetchReceipt(signData: Data?) -> GeelabGuardNativeReceipt? {
    GeelabGuardSDK.GeelabGuard.fetchReceipt(withSign: signData)?.toBridgeReceipt()
  }

  func submitReceipt(
    signData: Data?,
    completion: @escaping (GeelabGuardNativeReceipt?, NSError?) -> Void
  ) {
    GeelabGuardSDK.GeelabGuard.submitReceipt(withSign: signData) { receipt, error in
      completion(
        receipt?.toBridgeReceipt(),
        error.map { $0 as NSError }
      )
    }
  }

  var version: String {
    GeelabGuardSDK.GeelabGuard.sdkVersion()
  }
}

private extension GeelabGuardSDK.GeelabGuardReceipt {
  func toBridgeReceipt() -> GeelabGuardNativeReceipt {
    GeelabGuardNativeReceipt(
      appId: appID,
      geeToken: geeToken,
      geeId: geeID,
      geeIdTimestamp: geeIDTimestamp,
      respondedGeeToken: respondedGeeToken,
      originalResponse: originalResponse
    )
  }
}
