package tech.geelab.reactnative.geelabguard

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.ReactMethod

@ReactModule(name = GeelabGuardModule.NAME)
class GeelabGuardModule(reactContext: ReactApplicationContext) : NativeGeelabGuardSpec(reactContext) {
    private val implementation = GeelabGuardImplementation(AndroidGeelabGuardSdk(reactContext.applicationContext))

    override fun getName() = NAME

    override fun initialize(appId: String, serverUrl: String?, promise: Promise) {
        implementation.initialize(appId, serverUrl, promise)
    }
    override fun fetchReceipt(signData: String, promise: Promise) {
        implementation.fetchReceipt(signData, promise)
    }
    override fun submitReceipt(signData: String, promise: Promise) {
        implementation.submitReceipt(signData, promise)
    }
    override fun getVersion(promise: Promise) {
        implementation.getVersion(promise)
    }

    companion object { const val NAME = "GeelabGuard" }
}
