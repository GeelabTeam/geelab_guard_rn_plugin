import Foundation
import React

protocol GeelabGuardExecutor {
  func execute(_ operation: @escaping () -> Void)
}

private struct GeelabGuardQueueExecutor: GeelabGuardExecutor {
  private let queue = DispatchQueue(
    label: "tech.geelab.reactnative.geelabguard.fetch",
    qos: .utility
  )

  func execute(_ operation: @escaping () -> Void) {
    queue.async(execute: operation)
  }
}

@objc(GeelabGuardImplementation)
public final class GeelabGuardImplementation: NSObject {
  private let sdk: GeelabGuardSdk
  private let executor: GeelabGuardExecutor
  private let receiptMapper: GeelabGuardReceiptMapper

  @objc public override convenience init() {
    self.init(
      sdk: IOSGeelabGuardSdk(),
      executor: GeelabGuardQueueExecutor()
    )
  }

  init(
    sdk: GeelabGuardSdk,
    executor: GeelabGuardExecutor,
    receiptMapper: GeelabGuardReceiptMapper = GeelabGuardReceiptMapper()
  ) {
    self.sdk = sdk
    self.executor = executor
    self.receiptMapper = receiptMapper
    super.init()
  }

  @objc(initializeWithAppId:serverUrl:resolve:reject:)
  public func initialize(
    appId: String,
    serverUrl: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    sdk.register(appId: appId, serverUrl: serverUrl)
    resolve(nil)
  }

  @objc(fetchReceiptWithSignData:resolve:reject:)
  public func fetchReceipt(
    signData: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let settlement = GeelabGuardPromiseSettlement()
    let sdk = self.sdk
    let receiptMapper = self.receiptMapper

    executor.execute {
      guard let receipt = sdk.fetchReceipt(signData: Data(signData.utf8)) else {
        settlement.run {
          reject(
            "NOT_INITIALIZED",
            Self.errorMessages["NOT_INITIALIZED"],
            nil
          )
        }
        return
      }

      settlement.run {
        resolve(receiptMapper.toDictionary(receipt))
      }
    }
  }

  @objc(submitReceiptWithSignData:resolve:reject:)
  public func submitReceipt(
    signData: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let settlement = GeelabGuardPromiseSettlement()

    sdk.submitReceipt(signData: Data(signData.utf8)) { [receiptMapper] receipt, error in
      settlement.run {
        if error == nil, let receipt = receipt {
          resolve(receiptMapper.toDictionary(receipt))
          return
        }

        let publicCode = Self.publicCode(for: error?.code)
        let sanitizedError = Self.sanitizedError(
          nativeCode: error?.code,
          receipt: receipt,
          receiptMapper: receiptMapper
        )
        reject(publicCode, Self.errorMessages[publicCode], sanitizedError)
      }
    }
  }

  @objc(getVersionWithResolve:reject:)
  public func getVersion(
    resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    resolve(sdk.version)
  }

  private static func publicCode(for nativeCode: Int?) -> String {
    switch nativeCode {
    case -200:
      return "NOT_INITIALIZED"
    case -300:
      return "NETWORK_ERROR"
    case -500:
      return "INVALID_RESPONSE"
    case -501:
      return "SERVICE_FAILURE"
    default:
      return "UNKNOWN_NATIVE_ERROR"
    }
  }

  private static func sanitizedError(
    nativeCode: Int?,
    receipt: GeelabGuardNativeReceipt?,
    receiptMapper: GeelabGuardReceiptMapper
  ) -> NSError {
    var userInfo: [String: Any] = [:]
    if let nativeCode = nativeCode {
      userInfo["nativeCode"] = nativeCode
    }
    if let receipt = receipt {
      userInfo["receipt"] = receiptMapper.toDictionary(receipt)
    }

    return NSError(
      domain: "tech.geelab.reactnative.geelabguard",
      code: nativeCode ?? 0,
      userInfo: userInfo
    )
  }

  private static let errorMessages = [
    "NOT_INITIALIZED": "GeelabGuard is not initialized.",
    "NETWORK_ERROR": "The GeelabGuard request failed due to a network error.",
    "INVALID_RESPONSE": "GeelabGuard received an invalid service response.",
    "SERVICE_FAILURE": "The GeelabGuard service reported a failure.",
    "UNKNOWN_NATIVE_ERROR": "GeelabGuard encountered an unknown native error.",
  ]
}

private final class GeelabGuardPromiseSettlement {
  private let lock = NSLock()
  private var isSettled = false

  func run(_ operation: () -> Void) {
    lock.lock()
    guard !isSettled else {
      lock.unlock()
      return
    }
    isSettled = true
    lock.unlock()
    operation()
  }
}
