package com.gpsreminder

import android.app.Application
import com.agontuk.RNFusedLocation.RNFusedLocationPackage
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.shell.MainReactPackage
import com.facebook.soloader.SoLoader
import com.reactnativecommunity.netinfo.NetInfoPackage
import com.rnmaps.maps.MapsPackage
import com.swmansion.gesturehandler.RNGestureHandlerPackage
import com.swmansion.rnscreens.RNScreensPackage
import com.th3rdwave.safeareacontext.SafeAreaContextPackage
import org.linusu.RNGetRandomValuesPackage
import org.pgsqlite.SQLitePluginPackage
import java.util.ArrayList

class MainApplication : Application(), ReactApplication {

  private val mReactNativeHost = object : ReactNativeHost(this) {
    override fun getPackages(): List<com.facebook.react.ReactPackage> {
      val packages: MutableList<com.facebook.react.ReactPackage> = ArrayList()
      packages.add(MainReactPackage())
      packages.add(NetInfoPackage())
      packages.add(RNFusedLocationPackage())
      packages.add(RNGestureHandlerPackage())
      packages.add(RNGetRandomValuesPackage())
      packages.add(MapsPackage())
      packages.add(SafeAreaContextPackage())
      packages.add(RNScreensPackage())
      packages.add(SQLitePluginPackage())
      packages.add(GeofencingPackage())
      packages.add(NotificationPackage())
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
