package tech.geelab.reactnative.geelabguard

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import java.lang.reflect.Proxy
import java.util.concurrent.Executor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GeelabGuardImplementationTest {
  private val directExecutor = Executor { it.run() }

  @Test
  fun `initialize selects regional register overload`() {
    val sdk = FakeSdk()
    val promise = RecordingPromise()
    val implementation = implementation(sdk)

    implementation.initialize(
      "app-id",
      "https://riskct-eu.geelabapi.com/api/v1/client_report",
      promise.value,
    )

    assertEquals("app-id", sdk.registeredAppId)
    assertEquals(
      "https://riskct-eu.geelabapi.com/api/v1/client_report",
      sdk.registeredServerUrl,
    )
    assertEquals(1, promise.settlementCount)
    assertNull(promise.resolvedValue)
  }

  @Test
  fun `initialize keeps an omitted server URL null`() {
    val sdk = FakeSdk()
    val implementation = implementation(sdk)

    implementation.initialize("app-id", null, RecordingPromise().value)

    assertEquals("app-id", sdk.registeredAppId)
    assertNull(sdk.registeredServerUrl)
  }

  @Test
  fun `fetchReceipt runs on the executor and rejects a null receipt`() {
    val sdk = FakeSdk().apply { fetchedReceipt = null }
    val executor = QueueExecutor()
    val promise = RecordingPromise()
    val implementation = implementation(sdk, executor)

    implementation.fetchReceipt("order-1", promise.value)

    assertFalse(promise.isSettled)
    executor.runAll()
    assertEquals("order-1", sdk.fetchedSignData)
    assertEquals("NOT_INITIALIZED", promise.rejectionCode)
    assertEquals(1, promise.settlementCount)
  }

  @Test
  fun `fetchReceipt maps nullable fields and Base64 encodes original response`() {
    val sdk = FakeSdk().apply {
      fetchedReceipt = GeelabGuardNativeReceipt(
        appId = "app-id",
        geeToken = "gee-token",
        geeId = null,
        geeIdTimestamp = "timestamp",
        respondedGeeToken = null,
        originalResponse = "response",
      )
    }
    val promise = RecordingPromise()

    implementation(sdk).fetchReceipt("order-1", promise.value)

    val receipt = promise.resolvedValue as ReadableMap
    assertEquals("app-id", receipt.getString("appId"))
    assertEquals("gee-token", receipt.getString("geeToken"))
    assertTrue(receipt.isNull("geeId"))
    assertEquals("timestamp", receipt.getString("geeIdTimestamp"))
    assertTrue(receipt.isNull("respondedGeeToken"))
    assertEquals("cmVzcG9uc2U=", receipt.getString("originalResponseBase64"))
  }

  @Test
  fun `fetchReceipt settles only once when the executor throws after running`() {
    val executor = Executor { command ->
      command.run()
      throw IllegalStateException("executor failed after running")
    }
    val promise = RecordingPromise()

    implementation(FakeSdk(), executor).fetchReceipt("order-1", promise.value)

    assertEquals(1, promise.settlementCount)
  }

  @Test
  fun `submitReceipt resolves a successful receipt`() {
    val sdk = FakeSdk()
    val promise = RecordingPromise()

    implementation(sdk).submitReceipt("order-1", promise.value)

    val receipt = promise.resolvedValue as ReadableMap
    assertEquals("responded-token", receipt.getString("respondedGeeToken"))
    assertNull(promise.rejectionCode)
  }

  @Test
  fun `submitReceipt maps documented native status codes`() {
    val expected = mapOf(
      -200 to "NOT_INITIALIZED",
      -300 to "NETWORK_ERROR",
      -500 to "INVALID_RESPONSE",
      -501 to "SERVICE_FAILURE",
    )

    expected.forEach { (nativeCode, publicCode) ->
      val sdk = FakeSdk().apply { submitStatus = nativeCode }
      val promise = RecordingPromise()

      implementation(sdk).submitReceipt("order-1", promise.value)

      assertEquals(publicCode, promise.rejectionCode)
      assertEquals(nativeCode, promise.userInfo?.getInt("nativeCode"))
      assertEquals(
        "fallback-token",
        promise.userInfo?.getMap("receipt")?.getString("geeToken"),
      )
    }
  }

  @Test
  fun `submitReceipt maps an undocumented status to unknown native error`() {
    val sdk = FakeSdk().apply { submitStatus = 999 }
    val promise = RecordingPromise()

    implementation(sdk).submitReceipt("order-1", promise.value)

    assertEquals("UNKNOWN_NATIVE_ERROR", promise.rejectionCode)
    assertEquals(999, promise.userInfo?.getInt("nativeCode"))
  }

  @Test
  fun `submitReceipt settles only once when the SDK invokes its callback twice`() {
    val sdk = FakeSdk().apply { callbackCount = 2 }
    val promise = RecordingPromise()

    implementation(sdk).submitReceipt("order-1", promise.value)

    assertEquals(1, promise.settlementCount)
  }

  @Test
  fun `getVersion resolves the native SDK version`() {
    val promise = RecordingPromise()

    implementation(FakeSdk()).getVersion(promise.value)

    assertEquals("2.7.4", promise.resolvedValue)
  }

  private fun implementation(
    sdk: GeelabGuardSdk,
    executor: Executor = directExecutor,
  ) = GeelabGuardImplementation(
    sdk = sdk,
    executor = executor,
    receiptMapper = GeelabGuardReceiptMapper { JavaOnlyMap() },
  )
}

private class FakeSdk : GeelabGuardSdk {
  var registeredAppId: String? = null
  var registeredServerUrl: String? = null
  var fetchedSignData: String? = null
  var fetchedReceipt: GeelabGuardNativeReceipt? = defaultReceipt()
  var submitStatus = 200
  var submittedReceipt: GeelabGuardNativeReceipt? = defaultReceipt()
  var callbackCount = 1

  override fun register(appId: String, serverUrl: String?) {
    registeredAppId = appId
    registeredServerUrl = serverUrl
  }

  override fun fetchReceipt(signData: String): GeelabGuardNativeReceipt? {
    fetchedSignData = signData
    return fetchedReceipt
  }

  override fun submitReceipt(
    signData: String,
    callback: (Int, GeelabGuardNativeReceipt?) -> Unit,
  ) {
    repeat(callbackCount) { callback(submitStatus, submittedReceipt) }
  }

  override fun version(): String = "2.7.4"

  private companion object {
    fun defaultReceipt() = GeelabGuardNativeReceipt(
      appId = "app-id",
      geeToken = "fallback-token",
      geeId = "gee-id",
      geeIdTimestamp = "timestamp",
      respondedGeeToken = "responded-token",
      originalResponse = "response",
    )
  }
}

private class QueueExecutor : Executor {
  private val commands = mutableListOf<Runnable>()

  override fun execute(command: Runnable) {
    commands += command
  }

  fun runAll() {
    commands.toList().forEach(Runnable::run)
    commands.clear()
  }
}

private class RecordingPromise {
  var settlementCount = 0
  var resolvedValue: Any? = null
  var rejectionCode: String? = null
  var userInfo: ReadableMap? = null

  val isSettled: Boolean
    get() = settlementCount > 0

  val value: Promise = Proxy.newProxyInstance(
    Promise::class.java.classLoader,
    arrayOf(Promise::class.java),
  ) { _, method, arguments ->
    when (method.name) {
      "resolve" -> {
        settlementCount += 1
        resolvedValue = arguments?.firstOrNull()
      }
      "reject" -> {
        settlementCount += 1
        rejectionCode = arguments?.firstOrNull() as? String
        userInfo = arguments?.lastOrNull() as? ReadableMap
      }
    }
    null
  } as Promise
}
