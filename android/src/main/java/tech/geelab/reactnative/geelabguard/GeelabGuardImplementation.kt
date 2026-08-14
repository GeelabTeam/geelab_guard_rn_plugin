package tech.geelab.reactnative.geelabguard

import com.facebook.react.bridge.Promise
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

internal class GeelabGuardImplementation(
  private val sdk: GeelabGuardSdk,
  private val executor: Executor = Executors.newSingleThreadExecutor(),
  private val receiptMapper: GeelabGuardReceiptMapper = GeelabGuardReceiptMapper(),
) {
  fun initialize(appId: String, serverUrl: String?, promise: Promise) {
    try {
      sdk.register(appId, serverUrl)
      promise.resolve(null)
    } catch (_: Exception) {
      rejectUnknown(promise)
    }
  }

  fun fetchReceipt(signData: String, promise: Promise) {
    val settled = AtomicBoolean(false)
    try {
      executor.execute {
        try {
          val receipt = sdk.fetchReceipt(signData)
          if (receipt == null) {
            if (settled.compareAndSet(false, true)) {
              promise.reject("NOT_INITIALIZED", ERROR_MESSAGES.getValue("NOT_INITIALIZED"))
            }
          } else {
            val mappedReceipt = receiptMapper.toWritableMap(receipt)
            if (settled.compareAndSet(false, true)) promise.resolve(mappedReceipt)
          }
        } catch (_: Exception) {
          if (settled.compareAndSet(false, true)) rejectUnknown(promise)
        }
      }
    } catch (_: Exception) {
      if (settled.compareAndSet(false, true)) rejectUnknown(promise)
    }
  }

  fun submitReceipt(signData: String, promise: Promise) {
    val settled = AtomicBoolean(false)
    try {
      sdk.submitReceipt(signData) submitCallback@{ status, receipt ->
        if (!settled.compareAndSet(false, true)) return@submitCallback

        if (status == SUCCESS_STATUS && receipt != null) {
          promise.resolve(receiptMapper.toWritableMap(receipt))
        } else {
          val publicCode = publicCode(status)
          promise.reject(
            publicCode,
            ERROR_MESSAGES.getValue(publicCode),
            null,
            receiptMapper.toErrorUserInfo(status, receipt),
          )
        }
      }
    } catch (_: Exception) {
      if (settled.compareAndSet(false, true)) rejectUnknown(promise)
    }
  }

  fun getVersion(promise: Promise) {
    try {
      promise.resolve(sdk.version())
    } catch (_: Exception) {
      rejectUnknown(promise)
    }
  }

  private fun rejectUnknown(promise: Promise) {
    promise.reject("UNKNOWN_NATIVE_ERROR", ERROR_MESSAGES.getValue("UNKNOWN_NATIVE_ERROR"))
  }

  private fun publicCode(status: Int): String = when (status) {
    -200 -> "NOT_INITIALIZED"
    -300 -> "NETWORK_ERROR"
    -500 -> "INVALID_RESPONSE"
    -501 -> "SERVICE_FAILURE"
    else -> "UNKNOWN_NATIVE_ERROR"
  }

  private companion object {
    const val SUCCESS_STATUS = 200

    val ERROR_MESSAGES = mapOf(
      "NOT_INITIALIZED" to "GeelabGuard is not initialized.",
      "NETWORK_ERROR" to "The GeelabGuard request failed due to a network error.",
      "INVALID_RESPONSE" to "GeelabGuard received an invalid service response.",
      "SERVICE_FAILURE" to "The GeelabGuard service reported a failure.",
      "UNKNOWN_NATIVE_ERROR" to "GeelabGuard encountered an unknown native error.",
    )
  }
}
