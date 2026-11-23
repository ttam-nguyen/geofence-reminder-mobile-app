package com.gpsreminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent

/**
 * GeofenceEventReceiver — receives geofence transitions from Google Play Services.
 *
 * Behaviour:
 * 1. Every transition is persisted to [GeofenceEventStore] first. Play Services delivers these
 *    transitions whether or not the app is running, so an in-memory handoff loses events.
 * 2. DWELL (loitering delay = stationary duration) means "user is parked inside the region".
 *    A notification is posted directly from native code, because JS may not be alive.
 * 3. If the React context is alive, a lightweight `geofenceEventQueued` signal asks JS to drain.
 *    JS drains once and removes the events, so nothing is processed twice.
 */
class GeofenceEventReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "Geofencing"

        /** Set by [GeofencingModule]. Null while the app process is dead. */
        var reactContext: ReactApplicationContext? = null

        const val GEOFENCE_ACTION = "com.gpsreminder.GEOFENCE_EVENT"

        const val TRANSITION_ENTER = 1
        const val TRANSITION_EXIT = 2
        const val TRANSITION_DWELL = 4

        /** Emitted to JS as a "queue has events, please drain" signal. */
        const val EVENT_GEOFENCE_QUEUED = "geofenceEventQueued"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val geofencingEvent = GeofencingEvent.fromIntent(intent) ?: run {
            Log.w(TAG, "onReceive: not a geofencing event")
            return
        }

        if (geofencingEvent.hasError()) {
            Log.e(TAG, "Geofencing error code ${geofencingEvent.errorCode}")
            return
        }

        val transitionType = geofencingEvent.geofenceTransition
        val reminderId = geofencingEvent.triggeringGeofences?.firstOrNull()?.requestId ?: run {
            Log.w(TAG, "onReceive: no triggering geofence")
            return
        }

        val location = geofencingEvent.triggeringLocation
        val event = GeofenceEventStore.appendEvent(
            context = context,
            reminderId = reminderId,
            transitionType = transitionType,
            latitude = location?.latitude,
            longitude = location?.longitude,
        )

        Log.i(
            TAG,
            "transition=${label(transitionType)} reminder=$reminderId eventId=${event.id} " +
                "at=${location?.latitude},${location?.longitude} jsAlive=${reactContext != null}",
        )

        // DWELL has already waited the loitering delay inside the region, so arrival is
        // confirmed. Notify now — JS may never wake up.
        if (transitionType == Geofence.GEOFENCE_TRANSITION_DWELL) {
            ArrivalNotifier.notifyArrival(context, reminderId)
        }

        notifyJsQueueChanged()
    }

    private fun notifyJsQueueChanged() {
        val context = reactContext ?: return
        try {
            val payload = Arguments.createMap().apply {
                putInt("pendingCount", GeofenceEventStore.pendingEventCount(context))
            }
            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_GEOFENCE_QUEUED, payload)
        } catch (error: Exception) {
            Log.e(TAG, "Failed to signal JS about queued events: ${error.message}", error)
        }
    }

    private fun label(transitionType: Int): String = when (transitionType) {
        Geofence.GEOFENCE_TRANSITION_ENTER -> "ENTER"
        Geofence.GEOFENCE_TRANSITION_EXIT -> "EXIT"
        Geofence.GEOFENCE_TRANSITION_DWELL -> "DWELL"
        else -> "UNKNOWN($transitionType)"
    }
}
