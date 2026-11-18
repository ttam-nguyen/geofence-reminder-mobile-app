package com.gpsreminder

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * GeofencingPackage — Task 8.3 Android native module registration.
 *
 * Registers the GeofencingModule native module with the React Native bridge.
 */
@Suppress("DEPRECATION")
class GeofencingPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(GeofencingModule(reactContext))
    }

    @Suppress("unused") // Called by React Native on older versions.
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
