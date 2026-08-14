import Foundation

struct GeelabGuardReceiptMapper {
  func toDictionary(_ receipt: GeelabGuardNativeReceipt) -> [String: Any] {
    [
      "appId": nullable(receipt.appId),
      "geeToken": nullable(receipt.geeToken),
      "geeId": nullable(receipt.geeId),
      "geeIdTimestamp": nullable(receipt.geeIdTimestamp),
      "respondedGeeToken": nullable(receipt.respondedGeeToken),
      "originalResponseBase64": nullable(
        receipt.originalResponse?.base64EncodedString()
      ),
    ]
  }

  private func nullable(_ value: Any?) -> Any {
    value ?? NSNull()
  }
}
