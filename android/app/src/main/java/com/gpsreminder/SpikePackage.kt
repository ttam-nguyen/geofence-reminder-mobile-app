package com.gpsreminder

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * SpikePackage — Task 8.1 compatibility verification.
 *
 * Registers the SpikeModule native module with the React Native bridge.
 * This package will be REMOVED after Task 8.1 passes and replaced by the
 * full GeofencingPackage (Task 8.2/8.3).
 */
class SpikePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(SpikeModule(reactContext))
    }

    @Deprecated("Not used in New Architecture. Override createViewManagers() only for legacy UIManager packages.")
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
