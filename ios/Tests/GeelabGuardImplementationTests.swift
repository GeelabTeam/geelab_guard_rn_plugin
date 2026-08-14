import XCTest
@testable import GeelabGuard

final class GeelabGuardImplementationTests: XCTestCase {
  func testInitializeUsesRegionalServerURL() {
    let sdk = FakeSdk()
    let promise = RecordingPromise()
    let implementation = makeImplementation(sdk: sdk)

    implementation.initialize(
      appId: "app-id",
      serverUrl: "https://riskct-eu.geelabapi.com/api/v1/client_report",
      resolve: promise.resolve,
      reject: promise.reject
    )

    XCTAssertEqual(sdk.registeredAppId, "app-id")
    XCTAssertEqual(
      sdk.registeredServerUrl,
      "https://riskct-eu.geelabapi.com/api/v1/client_report"
    )
    XCTAssertEqual(promise.settlementCount, 1)
  }

  func testInitializeKeepsOmittedServerURLNil() {
    let sdk = FakeSdk()
    let implementation = makeImplementation(sdk: sdk)

    implementation.initialize(
      appId: "app-id",
      serverUrl: nil,
      resolve: { _ in },
      reject: { _, _, _ in }
    )

    XCTAssertEqual(sdk.registeredAppId, "app-id")
    XCTAssertNil(sdk.registeredServerUrl)
  }

  func testFetchReceiptRunsOnExecutorAndRejectsNilReceipt() {
    let sdk = FakeSdk()
    sdk.fetchedReceipt = nil
    let executor = QueueExecutor()
    let promise = RecordingPromise()
    let implementation = makeImplementation(sdk: sdk, executor: executor)

    implementation.fetchReceipt(
      signData: "order-1",
      resolve: promise.resolve,
      reject: promise.reject
    )

    XCTAssertEqual(promise.settlementCount, 0)
    executor.runAll()
    XCTAssertEqual(sdk.fetchedSignData, Data("order-1".utf8))
    XCTAssertEqual(promise.rejectionCode, "NOT_INITIALIZED")
    XCTAssertEqual(promise.settlementCount, 1)
  }

  func testFetchReceiptMapsNullableFieldsAndBase64Response() {
    let sdk = FakeSdk()
    sdk.fetchedReceipt = GeelabGuardNativeReceipt(
      appId: "app-id",
      geeToken: "gee-token",
      geeId: nil,
      geeIdTimestamp: "timestamp",
      respondedGeeToken: nil,
      originalResponse: Data("response".utf8)
    )
    let promise = RecordingPromise()

    makeImplementation(sdk: sdk).fetchReceipt(
      signData: "order-1",
      resolve: promise.resolve,
      reject: promise.reject
    )

    let receipt = promise.resolvedValue as? [String: Any]
    XCTAssertEqual(receipt?["appId"] as? String, "app-id")
    XCTAssertEqual(receipt?["geeToken"] as? String, "gee-token")
    XCTAssertTrue(receipt?["geeId"] is NSNull)
    XCTAssertEqual(receipt?["geeIdTimestamp"] as? String, "timestamp")
    XCTAssertTrue(receipt?["respondedGeeToken"] is NSNull)
    XCTAssertEqual(receipt?["originalResponseBase64"] as? String, "cmVzcG9uc2U=")
  }

  func testSubmitReceiptResolvesSuccessfulReceipt() {
    let sdk = FakeSdk()
    let promise = RecordingPromise()

    makeImplementation(sdk: sdk).submitReceipt(
      signData: "order-1",
      resolve: promise.resolve,
      reject: promise.reject
    )

    XCTAssertEqual(sdk.submittedSignData, Data("order-1".utf8))
    let receipt = promise.resolvedValue as? [String: Any]
    XCTAssertEqual(receipt?["respondedGeeToken"] as? String, "responded-token")
    XCTAssertNil(promise.rejectionCode)
  }

  func testSubmitReceiptMapsDocumentedErrorCodesAndFallbackReceipt() {
    let expected = [
      -200: "NOT_INITIALIZED",
      -300: "NETWORK_ERROR",
      -500: "INVALID_RESPONSE",
      -501: "SERVICE_FAILURE",
    ]

    for (nativeCode, publicCode) in expected {
      let sdk = FakeSdk()
      sdk.submitError = NSError(domain: "GeelabGuard", code: nativeCode)
      let promise = RecordingPromise()

      makeImplementation(sdk: sdk).submitReceipt(
        signData: "order-1",
        resolve: promise.resolve,
        reject: promise.reject
      )

      XCTAssertEqual(promise.rejectionCode, publicCode)
      XCTAssertEqual(promise.rejectionError?.userInfo["nativeCode"] as? Int, nativeCode)
      let receipt = promise.rejectionError?.userInfo["receipt"] as? [String: Any]
      XCTAssertEqual(receipt?["geeToken"] as? String, "fallback-token")
    }
  }

  func testSubmitReceiptMapsUnknownErrorCode() {
    let sdk = FakeSdk()
    sdk.submitError = NSError(domain: "GeelabGuard", code: 999)
    let promise = RecordingPromise()

    makeImplementation(sdk: sdk).submitReceipt(
      signData: "order-1",
      resolve: promise.resolve,
      reject: promise.reject
    )

    XCTAssertEqual(promise.rejectionCode, "UNKNOWN_NATIVE_ERROR")
    XCTAssertEqual(promise.rejectionError?.userInfo["nativeCode"] as? Int, 999)
  }

  func testSubmitReceiptRejectsEmptyNativeResultWithoutInventingNativeCode() {
    let sdk = FakeSdk()
    sdk.submittedReceipt = nil
    let promise = RecordingPromise()

    makeImplementation(sdk: sdk).submitReceipt(
      signData: "order-1",
      resolve: promise.resolve,
      reject: promise.reject
    )

    XCTAssertEqual(promise.rejectionCode, "UNKNOWN_NATIVE_ERROR")
    XCTAssertNil(promise.rejectionError?.userInfo["nativeCode"])
  }

  func testSubmitReceiptDoesNotExposeNativeErrorDetails() {
    let sdk = FakeSdk()
    sdk.submitError = NSError(
      domain: "GeelabGuard",
      code: -300,
      userInfo: ["sensitive": "raw-response"]
    )
    let promise = RecordingPromise()

    makeImplementation(sdk: sdk).submitReceipt(
      signData: "order-1",
      resolve: promise.resolve,
      reject: promise.reject
    )

    XCTAssertEqual(
      promise.rejectionMessage,
      "The GeelabGuard request failed due to a network error."
    )
    XCTAssertNil(promise.rejectionError?.userInfo["sensitive"])
  }

  func testSubmitReceiptSettlesOnlyOnceWhenCompletionRunsTwice() {
    let sdk = FakeSdk()
    sdk.completionCount = 2
    let promise = RecordingPromise()

    makeImplementation(sdk: sdk).submitReceipt(
      signData: "order-1",
      resolve: promise.resolve,
      reject: promise.reject
    )

    XCTAssertEqual(promise.settlementCount, 1)
  }

  func testGetVersionResolvesNativeVersion() {
    let promise = RecordingPromise()

    makeImplementation(sdk: FakeSdk()).getVersion(
      resolve: promise.resolve,
      reject: promise.reject
    )

    XCTAssertEqual(promise.resolvedValue as? String, "2.8.1")
  }

  private func makeImplementation(
    sdk: GeelabGuardSdk,
    executor: GeelabGuardExecutor = DirectExecutor()
  ) -> GeelabGuardImplementation {
    GeelabGuardImplementation(sdk: sdk, executor: executor)
  }
}

private final class FakeSdk: GeelabGuardSdk {
  var registeredAppId: String?
  var registeredServerUrl: String?
  var fetchedSignData: Data?
  var fetchedReceipt: GeelabGuardNativeReceipt? = .fixture()
  var submittedReceipt: GeelabGuardNativeReceipt? = .fixture()
  var submittedSignData: Data?
  var submitError: NSError?
  var completionCount = 1

  func register(appId: String, serverUrl: String?) {
    registeredAppId = appId
    registeredServerUrl = serverUrl
  }

  func fetchReceipt(signData: Data?) -> GeelabGuardNativeReceipt? {
    fetchedSignData = signData
    return fetchedReceipt
  }

  func submitReceipt(
    signData: Data?,
    completion: @escaping (GeelabGuardNativeReceipt?, NSError?) -> Void
  ) {
    submittedSignData = signData
    for _ in 0..<completionCount {
      completion(submittedReceipt, submitError)
    }
  }

  var version: String { "2.8.1" }
}

private extension GeelabGuardNativeReceipt {
  static func fixture() -> GeelabGuardNativeReceipt {
    GeelabGuardNativeReceipt(
      appId: "app-id",
      geeToken: "fallback-token",
      geeId: "gee-id",
      geeIdTimestamp: "timestamp",
      respondedGeeToken: "responded-token",
      originalResponse: Data("response".utf8)
    )
  }
}

private struct DirectExecutor: GeelabGuardExecutor {
  func execute(_ operation: @escaping () -> Void) {
    operation()
  }
}

private final class QueueExecutor: GeelabGuardExecutor {
  private var operations: [() -> Void] = []

  func execute(_ operation: @escaping () -> Void) {
    operations.append(operation)
  }

  func runAll() {
    let pending = operations
    operations.removeAll()
    pending.forEach { $0() }
  }
}

private final class RecordingPromise {
  var settlementCount = 0
  var resolvedValue: Any?
  var rejectionCode: String?
  var rejectionMessage: String?
  var rejectionError: NSError?

  lazy var resolve: (Any?) -> Void = { [weak self] value in
    self?.settlementCount += 1
    self?.resolvedValue = value
  }

  lazy var reject: (String?, String?, Error?) -> Void = {
    [weak self] code, message, error in
    self?.settlementCount += 1
    self?.rejectionCode = code
    self?.rejectionMessage = message
    self?.rejectionError = error.map { $0 as NSError }
  }
}
