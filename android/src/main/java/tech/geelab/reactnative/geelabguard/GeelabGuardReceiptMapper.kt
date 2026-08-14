package tech.geelab.reactnative.geelabguard

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

@OptIn(ExperimentalEncodingApi::class)
internal class GeelabGuardReceiptMapper(
  private val mapFactory: () -> WritableMap = { Arguments.createMap() },
) {
  fun toWritableMap(receipt: GeelabGuardNativeReceipt): WritableMap = mapFactory().apply {
    putNullableString("appId", receipt.appId)
    putNullableString("geeToken", receipt.geeToken)
    putNullableString("geeId", receipt.geeId)
    putNullableString("geeIdTimestamp", receipt.geeIdTimestamp)
    putNullableString("respondedGeeToken", receipt.respondedGeeToken)
    putNullableString(
      "originalResponseBase64",
      receipt.originalResponse?.let { Base64.encode(it.toByteArray(Charsets.UTF_8)) },
    )
  }

  fun toErrorUserInfo(
    nativeCode: Int,
    receipt: GeelabGuardNativeReceipt?,
  ): WritableMap = mapFactory().apply {
    putInt("nativeCode", nativeCode)
    receipt?.let { putMap("receipt", toWritableMap(it)) }
  }

  private fun WritableMap.putNullableString(key: String, value: String?) {
    if (value == null) putNull(key) else putString(key, value)
  }
}
