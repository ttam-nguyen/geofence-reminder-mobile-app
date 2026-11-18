package com.gpsreminder

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

/**
 * SpikeModule — Task 8.1 compatibility verification.
 *
 * A minimal native module exposing `ping()` and `getPlatform()` to verify
 * that custom native modules can be created, linked, and called from JS
 * on RN 0.88 New Architecture (Fabric).
 *
 * This module will be REMOVED after Task 8.1 passes and replaced by the
 * full GeofencingModule (Task 8.2/8.3).
 */
@ReactModule(name = SpikeModule.NAME)
class SpikeModule(reactContext: ReactApplicationContext?) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    /** Returns "ok" — verifies JS → native call works. */
    @ReactMethod
    fun ping(promise: com.facebook.react.bridge.Promise) {
        promise.resolve("ok")
    }

    /** Returns the platform string — verifies native → JS data flow. */
    @ReactMethod
    fun getPlatform(promise: com.facebook.react.bridge.Promise) {
        promise.resolve("android")
    }

    companion object {
        const val NAME = "SpikeModule"
    }
}
