package tech.geelab.reactnative.geelabguard

import android.content.Context
import tech.geelab.core.GeelabGuard as NativeGeelabGuard
import tech.geelab.core.GeelabGuardReceipt as NativeGeelabGuardReceipt

internal data class GeelabGuardNativeReceipt(
  val appId: String?,
  val geeToken: String?,
  val geeId: String?,
  val geeIdTimestamp: String?,
  val respondedGeeToken: String?,
  val originalResponse: String?,
)

internal interface GeelabGuardSdk {
  fun register(appId: String, serverUrl: String?)

  fun fetchReceipt(signData: String): GeelabGuardNativeReceipt?

  fun submitReceipt(
    signData: String,
    callback: (Int, GeelabGuardNativeReceipt?) -> Unit,
  )

  fun version(): String
}

internal class AndroidGeelabGuardSdk(
  private val applicationContext: Context,
) : GeelabGuardSdk {
  override fun register(appId: String, serverUrl: String?) {
    if (serverUrl == null) {
      NativeGeelabGuard.register(applicationContext, appId)
    } else {
      NativeGeelabGuard.register(applicationContext, appId, serverUrl)
    }
  }

  override fun fetchReceipt(signData: String): GeelabGuardNativeReceipt? =
    NativeGeelabGuard.fetchReceipt(applicationContext, signData)?.toBridgeReceipt()

  override fun submitReceipt(
    signData: String,
    callback: (Int, GeelabGuardNativeReceipt?) -> Unit,
  ) {
    NativeGeelabGuard.submitReceipt(
      applicationContext,
      signData,
      NativeGeelabGuard.CallbackHandler { status, receipt ->
        callback(status?.toInt() ?: UNKNOWN_STATUS, receipt?.toBridgeReceipt())
      },
    )
  }

  override fun version(): String = NativeGeelabGuard.getVersion()

  private fun NativeGeelabGuardReceipt.toBridgeReceipt() = GeelabGuardNativeReceipt(
    appId = appID,
    geeToken = geeToken,
    geeId = geeID,
    geeIdTimestamp = geeIDTimestamp,
    respondedGeeToken = respondedGeeToken,
    originalResponse = originalResponse,
  )

  private companion object {
    const val UNKNOWN_STATUS = Int.MIN_VALUE
  }
}
