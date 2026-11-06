//  GeofenceBroadcastReceiver.kt
//  GPSReminder
//
//  BroadcastReceiver that receives geofence transition events from Android.
//  Forwards events to the JS layer via the GeofenceManager.

package com.gpsreminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.GeofenceTransitions

class GeofenceBroadcastReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    val result = GeofenceTransitions.geofenceTransition(intent)
    val triggeringGeofences = GeofenceTransitions.triggeringGeofences(intent)

    if (triggeringGeofences == null || triggeringGeofences.isEmpty()) {
      return
    }

    val geofenceManager = (context as? com.facebook.react.bridge.ReactContext)?.getNativeModule(
      GeofenceManager::class.java
    ) ?: return

    for (geofence in triggeringGeofences) {
      val requestId = geofence.requestId

      // Determine event type from transition code
      val eventType = when (result) {
        GeofenceTransitions.GEOFENCE_TRANSITION_ENTER -> "ENTER"
        GeofenceTransitions.GEOFENCE_TRANSITION_EXIT -> "EXIT"
        GeofenceTransitions.GEOFENCE_TRANSITION_DWELL -> "DWELL"
        else -> "UNKNOWN"
      }

      // Get the center coordinates of the geofence region
      val circularRegion = geofence.region as? com.google.android.gms.location.Geofence.CircularRegion
      if (circularRegion != null) {
        geofenceManager.sendGeofenceEvent(
          requestId = requestId,
          eventType = eventType,
          latitude = circularRegion.latitude,
          longitude = circularRegion.longitude,
          accuracy = circularRegion.radius
        )
      }
    }
  }
}
