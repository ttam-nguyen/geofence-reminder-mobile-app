package com.gpsreminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * GeofenceEventReceiver — BroadcastReceiver that receives geofence transitions from Android.
 * Dispatches events to JavaScript when a geofence boundary is crossed.
 *
 * Uses the Google Play Services GeofencingEvent API (getGeofenceTransition / getTriggeringLocation).
 */
class GeofenceEventReceiver : BroadcastReceiver() {

    companion object {
        // Static reference to ReactApplicationContext for event dispatch.
        // Set by GeofencingModule during initialization.
        var reactContext: ReactApplicationContext? = null

        const val GEOFENCE_ACTION = "com.gpsreminder.GEOFENCE_EVENT"
        const val EXTRA_REMINDER_ID = "reminder_id"

        // Transition type constants (matching JS spec).
        const val TRANSITION_ENTER = 1
        const val TRANSITION_EXIT = 2
        const val TRANSITION_DWELL = 4

        // Event names for JS bridge.
        const val EVENT_GEOFENCE_ENTER = "geofenceEnter"
        const val EVENT_GEOFENCE_EXIT = "geofenceExit"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val reactContext = reactContext ?: return

        val geofencingEvent = com.google.android.gms.location.GeofencingEvent.fromIntent(intent)
            ?: return

        // Use the simple API: getGeofenceTransition() returns a single int.
        val transitionType = geofencingEvent.geofenceTransition

        when (transitionType) {
            com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_ENTER -> {
                dispatchEvent(reactContext, geofencingEvent, TRANSITION_ENTER)
            }
            com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_EXIT -> {
                dispatchEvent(reactContext, geofencingEvent, TRANSITION_EXIT)
            }
            com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_DWELL -> {
                // Optional supporting signal only — may indicate the user has been
                // inside the geofence for a sustained period. Used to accelerate
                // arrival detection but NOT as the sole trigger.
                dispatchEvent(reactContext, geofencingEvent, TRANSITION_DWELL)
            }
        }
    }

    private fun dispatchEvent(
        reactContext: ReactApplicationContext,
        event: com.google.android.gms.location.GeofencingEvent,
        transitionType: Int
    ) {
        try {
            val reminderId = event.triggeringGeofences?.firstOrNull()?.requestId ?: return

            val params = Arguments.createMap().apply {
                putString("reminderId", reminderId)
                putInt("transitionType", transitionType)
                event.triggeringLocation?.let { loc ->
                    putDouble("latitude", loc.latitude)
                    putDouble("longitude", loc.longitude)
                }
            }

            // Emit event to JS via the device event emitter.
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(
                    if (transitionType == com.gpsreminder.GeofenceEventReceiver.TRANSITION_ENTER)
                        EVENT_GEOFENCE_ENTER
                    else
                        EVENT_GEOFENCE_EXIT,
                    params
                )

            // Debug logging (always logged, cheap).
            val eventLabel = when (transitionType) {
                TRANSITION_ENTER -> "ENTER"
                TRANSITION_EXIT -> "EXIT"
                else -> "DWELL"
            }
            android.util.Log.d(
                "Geofencing",
                "$eventLabel: $reminderId at ${event.triggeringLocation?.latitude},${event.triggeringLocation?.longitude}"
            )
        } catch (e: Exception) {
            // Log but don't crash — geofence events are best-effort.
            android.util.Log.e("Geofencing", "Failed to dispatch event: ${e.message}", e)
        }
    }
}
