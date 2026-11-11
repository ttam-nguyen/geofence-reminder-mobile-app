//  GeofenceManager.kt
//  GPSReminder
//
//  Android native module wrapping Google Play Services Geofencing API.
//  Manages Geofence registration, permission states, and event emission.

package com.gpsreminder

import android.content.Context
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManager.RCTDeviceEventEmitter
import com.google.android.gms.location.*
import kotlin.math.min

class GeofenceManager(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val NAME = "GeofencingModule"
    private const val EVENT_NAME = "GeofenceEvent"
  }

  override fun getName(): String = NAME

  private val geofencingClient: GeofencingClient by lazy {
    LocationServices.getGeofencingClient(reactContext)
  }

  private val locationManager: android.location.LocationManager by lazy {
    reactContext.getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
  }

  // Registered geofences: requestId -> Geofence
  private val registeredGeofences = mutableMapOf<String, Geofence>()

  // MARK: - Register Geofence

  @ReactMethod
  fun registerGeofence(params: ReadableMap, promise: Promise) {
    try {
      val requestId = params.getString("requestId") ?: run {
        promise.reject("INVALID_PARAMS", "requestId is required", null)
        return
      }

      val latitude = params.getDouble("latitude")
      val longitude = params.getDouble("longitude")
      val radiusMeters = params.getDouble("radiusMeters").toFloat()

      // Check location permission
      val permissionStatus = checkLocationPermissions()
      if (permissionStatus == "denied" || permissionStatus == "restricted") {
        promise.reject("PERMISSION_DENIED", "Location permission is denied or restricted", null)
        return
      }

      // Android limit: 500 geofences per app (much higher than iOS)
      if (registeredGeofences.size >= 500) {
        promise.reject("REGION_LIMIT_EXCEEDED", "Android supports a maximum of 500 geofences. Current count: ${registeredGeofences.size}", null)
        return
      }

      val notifyOnEntry = params.getBoolean("notifyOnEntry")
      val notifyOnExit = params.getBoolean("notifyOnExit")

      // Android Geofence always fires both enter and exit events,
      // but we can control which trigger types to monitor.
      var triggerTypes = Geofence.GEOFENCE_TRANSITION_ENTER

      // For MVP, always monitor entry. Exit is supported but not acted upon.
      if (notifyOnExit) {
        triggerTypes = Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT
      }

      val geofence = Geofence.Builder()
        .setRequestId(requestId)
        .setCircularRegion(latitude, longitude, radiusMeters)
        .setNotificationResponsiveness(Geofence.GEOFENCE_NOTIFICATION_RESPONSIVENESS_ON_CLOSEST_APPROACH)
        .setLooselyMatching(false)
        .setTransitionTypes(triggerTypes)
        .build()

      registeredGeofences[requestId] = geofence

      val geofencingRequest = GeofencingRequest.Builder()
        .setInitialDelay(GeofencingRequest.INITIAL_DELAY_NONE)
        .setHighestAccuracy(GeofencingRequest.HIGH_ACCURACY)
        .addGeofence(geofence)
        .build()

      geofencingClient.addGeofences(geofencingRequest, getGeofencePendingIntent())
        .addOnSuccessListener { promise.resolve(Arguments.createMap().apply { putBoolean("success", true) }) }
        .addOnFailureListener { promise.reject("REGISTER_FAILED", it.message ?: "Failed to register geofence", it) }

    } catch (e: Exception) {
      promise.reject("ERROR", e.message, e)
    }
  }

  // MARK: - Unregister Geofence

  @ReactMethod
  fun unregisterGeofence(requestId: String, promise: Promise) {
    try {
      if (!registeredGeofences.containsKey(requestId)) {
        promise.reject("NOT_FOUND", "Geofence with id $requestId not found", null)
        return
      }

      registeredGeofences.remove(requestId)

      geofencingClient.removeGeofences(listOf(requestId))
        .addOnSuccessListener { promise.resolve(Arguments.createMap().apply { putBoolean("success", true) }) }
        .addOnFailureListener { promise.reject("UNREGISTER_FAILED", it.message ?: "Failed to unregister geofence", it) }

    } catch (e: Exception) {
      promise.reject("ERROR", e.message, e)
    }
  }

  // MARK: - Unregister All

  @ReactMethod
  fun unregisterAllGeofences(promise: Promise) {
    try {
      if (registeredGeofences.isEmpty()) {
        promise.resolve(Arguments.createMap().apply { putBoolean("success", true) })
        return
      }

      val requestIds = registeredGeofences.keys.toList()
      registeredGeofences.clear()

      geofencingClient.removeGeofences(requestIds)
        .addOnSuccessListener { promise.resolve(Arguments.createMap().apply { putBoolean("success", true) }) }
        .addOnFailureListener { promise.reject("UNREGISTER_ALL_FAILED", it.message ?: "Failed to unregister all geofences", it) }

    } catch (e: Exception) {
      promise.reject("ERROR", e.message, e)
    }
  }

  // MARK: - Check Permissions

  @ReactMethod
  fun checkPermissions(promise: Promise) {
    try {
      val locationPermission = getLocationPermissionStatus()

      // Android 13+ notification permission (API 33+)
      val notificationPermission = if (reactContext.applicationInfo.targetSdkVersion >= 33) {
        val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        if (notificationManager.isNotificationPolicyAccessGranted) {
          "granted"
        } else {
          // Check if notifications are blocked for this app
          val apps = android.provider.Settings.Secure.getString(reactContext.contentResolver, "notification_policy_access_state")
          if (apps == null) "never_asked" else "denied"
        }
      } else {
        // Pre-Android 13: notifications are always allowed (no permission needed)
        "granted"
      }

      val result = Arguments.createMap().apply {
        putString("locationPermission", locationPermission)
        putString("notificationPermission", notificationPermission)
        putBoolean("backgroundLocationAllowed", hasBackgroundLocationPermission())
      }

      promise.resolve(result)

    } catch (e: Exception) {
      promise.reject("ERROR", e.message, e)
    }
  }

  // MARK: - Request Location Permission

  @ReactMethod
  fun requestLocationPermission(promise: Promise) {
    // Android uses ActivityRequestManager for permissions — this is handled
    // by a separate PermissionModule. For now, return the current status.
    val status = getLocationPermissionStatus()
    promise.resolve(status)
  }

  // MARK: - Request Background Permission (Android 10+)

  @ReactMethod
  fun requestBackgroundPermission(promise: Promise) {
    // Android 10+ requires explicit background location permission.
    // This is handled via the PermissionModule's requestPermissions() call.
    // For now, return false — the JS side should use the PermissionModule.
    promise.resolve(false)
  }

  // MARK: - Google Play Services Check

  @ReactMethod
  fun isGooglePlayServicesAvailable(promise: Promise) {
    val resultCode = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(reactContext)
    promise.resolve(resultCode == ConnectionResult.SUCCESS)
  }

  // MARK: - Private Helpers

  private fun getLocationPermissionStatus(): String {
    val fineLocation = reactContext.checkSelfPermission("android.permission.ACCESS_FINE_LOCATION")
    val coarseLocation = reactContext.checkSelfPermission("android.permission.ACCESS_COARSE_LOCATION")

    if (fineLocation == android.content.pm.PackageManager.PERMISSION_GRANTED ||
        coarseLocation == android.content.pm.PackageManager.PERMISSION_GRANTED) {
      return "granted"
    }

    // Check if the permission was previously denied and "never ask again" selected
    val activity = currentActivity
    if (activity != null) {
      if (!activity.shouldShowRequestPermissionRationale("android.permission.ACCESS_FINE_LOCATION") &&
          !activity.shouldShowRequestPermissionRationale("android.permission.ACCESS_COARSE_LOCATION")) {
        return "never_asked"
      }
    }

    return "denied"
  }

  private fun hasBackgroundLocationPermission(): Boolean {
    if (reactContext.applicationInfo.targetSdkVersion < 29) {
      return true // Pre-Android 10: background location is included with foreground permission
    }

    return reactContext.checkSelfPermission("android.permission.ACCESS_BACKGROUND_LOCATION") == android.content.pm.PackageManager.PERMISSION_GRANTED
  }

  // MARK: - Geofence Pending Intent

  private fun getGeofencePendingIntent(): PendingIntent {
    val intent = Intent(reactContext, GeofenceBroadcastReceiver::class.java).apply {
      action = "com.gpsreminder.GEOFENCE_EVENT"
    }

    return PendingIntent.getBroadcast(
      reactContext,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
    )
  }

  // MARK: - Send Event to JS

  private fun sendGeofenceEvent(requestId: String, eventType: String, latitude: Double, longitude: Double, accuracy: Float) {
    val event = Arguments.createMap().apply {
      putString("requestId", requestId)
      putString("eventType", eventType)
      putDouble("timestamp", System.currentTimeMillis().toDouble())
      putDouble("latitude", latitude)
      putDouble("longitude", longitude)
      putDouble("horizontalAccuracy", accuracy.toDouble())
    }

    reactContext.getJSModule(RCTDeviceEventEmitter::class.java)
      .emit(EVENT_NAME, event)
  }
}
