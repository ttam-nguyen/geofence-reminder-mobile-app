//  NotificationPackage.kt
//  GPSReminder
//
//  React Native package that registers the NotificationModule native module.
//  This must be added to the getPackages() list in MainApplication.java/kt.

package com.gpsreminder

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NotificationPackage : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(NotificationModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
