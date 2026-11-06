package com.gpsreminder

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript.
   */
  override fun getMainComponentName(): String = "GPSReminder"

  /**
   * Returns the instance of the ReactActivityDelegate.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      MainActivityDelegate(this, mainComponentName)

  private class MainActivityDelegate(activity: ReactActivity, mainComponentName: String?) :
      ReactActivityDelegate(activity, mainComponentName)
}
