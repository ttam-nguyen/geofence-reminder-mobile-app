package com.gpsreminder

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.shell.MainReactPackage
import com.facebook.soloader.SoLoader
import java.util.ArrayList

class MainApplication : Application(), ReactApplication {

  private val mReactNativeHost = object : ReactNativeHost(this) {
    override fun getPackages(): List<com.facebook.react.ReactPackage> {
      val packages: MutableList<com.facebook.react.ReactPackage> = ArrayList()
      packages.add(MainReactPackage())
      return packages
    }

    override fun getJSMainModuleName(): String = "index"
    override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
  }

  override val reactNativeHost: ReactNativeHost = mReactNativeHost

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
  }
}
