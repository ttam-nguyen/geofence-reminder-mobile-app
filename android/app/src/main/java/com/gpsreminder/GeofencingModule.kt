package com.gpsreminder

import android.app.PendingIntent
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks

/**
 * GeofencingModule — Google Play Services Geofencing API bridge.
 *
 * Registration uses ENTER | EXIT | DWELL transitions. DWELL fires after
 * [STATIONARY_DURATION_SECONDS] of loitering inside the region, which is the native equivalent
 * of the JS stationary qualification and the only arrival signal that survives a dead app.
 */
@com.facebook.react.module.annotations.ReactModule(name = GeofencingModule.NAME)
class GeofencingModule(reactContext: ReactApplicationContext?) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "GeofencingModule"
        const val GEOFENCE_ACTION = "com.gpsreminder.GEOFENCE_EVENT"

        private const val MIN_GEOFENCE_RADIUS_METERS: Float = 200f
        private const val STATIONARY_DURATION_SECONDS: Long = 120L
        private const val MAX_REGIONS: Int = 100

        const val TRANSITION_ENTER = 1
        const val TRANSITION_EXIT = 2
        const val TRANSITION_DWELL = 4
    }

    private val context: ReactApplicationContext? = reactContext

    private data class RegisteredGeofence(
        val geofence: Geofence,
        val lat: Double,
        val lon: Double,
        val rad: Float,
    )

    private val registeredGeofences = mutableMapOf<String, RegisteredGeofence>()
    private var geofencePendingIntent: PendingIntent? = null

    override fun getName(): String = NAME

    init {
        GeofenceEventReceiver.reactContext = reactContext
    }

    override fun invalidate() {
        GeofenceEventReceiver.reactContext = null
        super.invalidate()
    }

    /**
     * Register (or refresh) a geofence.
     *
     * `title` and `body` are cached natively so [ArrivalNotifier] can post the arrival
     * notification while the JS layer is not running.
     */
    @ReactMethod
    fun registerGeofence(
        reminderId: String,
        latitude: Double,
        longitude: Double,
        radius: Float,
        title: String?,
        body: String?,
        notifyOnDwell: Boolean?,
        promise: Promise,
    ) {
        val appContext = context ?: run { promise.reject("NO_CONTEXT", "No application context"); return }

        try {
            if (title != null && body != null) {
                GeofenceEventStore.saveReminderMeta(
                    context = appContext,
                    reminderId = reminderId,
                    title = title,
                    body = body,
                    notifyOnDwell = notifyOnDwell != false,
                )
            }

            val existing = registeredGeofences[reminderId]
            if (existing != null &&
                existing.lat == latitude &&
                existing.lon == longitude
            ) {
                // Already registered with the same region — only metadata changed.
                promise.resolve(null)
                return
            }

            if (existing == null && registeredGeofences.size >= MAX_REGIONS) {
                promise.reject(
                    "CAPACITY_EXCEEDED",
                    "Android limit of $MAX_REGIONS geofences reached. Unregister some before registering new ones.",
                    null,
                )
                return
            }

            val actualRadius = maxOf(radius, MIN_GEOFENCE_RADIUS_METERS)
            val loiteringDelayMs = (STATIONARY_DURATION_SECONDS * 1000).toInt()

            val geofence = Geofence.Builder()
                .setRequestId(reminderId)
                .setCircularRegion(latitude, longitude, actualRadius)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                // DWELL is the native arrival signal: Play Services waits the loitering delay
                // inside the region and then reports it, with or without the app running.
                .setTransitionTypes(
                    Geofence.GEOFENCE_TRANSITION_ENTER or
                        Geofence.GEOFENCE_TRANSITION_EXIT or
                        Geofence.GEOFENCE_TRANSITION_DWELL,
                )
                .setLoiteringDelay(loiteringDelayMs)
                .build()

            registeredGeofences[reminderId] = RegisteredGeofence(
                geofence = geofence,
                lat = latitude,
                lon = longitude,
                rad = actualRadius,
            )

            rebuildGeofencePendingIntent()
            registerAllGeofences(promise)
        } catch (error: Exception) {
            promise.reject("REGISTER_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun unregisterGeofence(reminderId: String, promise: Promise) {
        val appContext = context ?: run { promise.reject("NO_CONTEXT", "No application context"); return }

        try {
            GeofenceEventStore.removeReminderMeta(appContext, reminderId)

            if (registeredGeofences.remove(reminderId) == null) {
                promise.resolve(null)
                return
            }

            if (registeredGeofences.isEmpty()) {
                removeGeofences(promise)
            } else {
                rebuildGeofencePendingIntent()
                registerAllGeofences(promise)
            }
        } catch (error: Exception) {
            promise.reject("UNREGISTER_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun listRegisteredGeofences(promise: Promise) {
        val array = Arguments.createArray()
        for ((reminderId, info) in registeredGeofences) {
            val map = Arguments.createMap().apply {
                putString("reminderId", reminderId)
                putDouble("latitude", info.lat)
                putDouble("longitude", info.lon)
                putDouble("radius", info.rad.toDouble())
            }
            array.pushMap(map)
        }
        promise.resolve(array)
    }

    /**
     * Hand every persisted geofence transition to JS and clear the queue.
     * JS calls this after the app starts, on resume, and whenever `geofenceEventQueued` fires.
     */
    @ReactMethod
    fun drainPendingGeofenceEvents(promise: Promise) {
        val appContext = context ?: run { promise.reject("NO_CONTEXT", "No application context"); return }

        try {
            val events = GeofenceEventStore.drainEvents(appContext)
            val array: WritableArray = Arguments.createArray()
            events.forEach { event ->
                array.pushMap(Arguments.createMap().apply {
                    putDouble("id", event.id.toDouble())
                    putString("reminderId", event.reminderId)
                    putInt("transitionType", event.transitionType)
                    putDouble("at", event.at.toDouble())
                    if (event.latitude != null && event.longitude != null) {
                        putDouble("latitude", event.latitude)
                        putDouble("longitude", event.longitude)
                    }
                })
            }
            promise.resolve(array)
        } catch (error: Exception) {
            promise.reject("DRAIN_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun getPendingGeofenceEventCount(promise: Promise) {
        val appContext = context ?: run { promise.resolve(0); return }
        promise.resolve(GeofenceEventStore.pendingEventCount(appContext))
    }

    @ReactMethod
    fun getAuthorizationStatus(promise: Promise) {
        val appContext = context ?: run { promise.resolve("unspecified"); return }

        val status = appContext.applicationContext.checkPermission(
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.os.Process.myPid(),
            android.os.Process.myUid(),
        )

        when (status) {
            android.content.pm.PackageManager.PERMISSION_GRANTED -> promise.resolve("granted")
            android.content.pm.PackageManager.PERMISSION_DENIED -> promise.resolve("denied")
            else -> promise.resolve("unspecified")
        }
    }

    @ReactMethod
    fun requestLocationPermission(promise: Promise) {
        // Permissions are requested from JS (geolocation module / PermissionsAndroid).
        promise.resolve(null)
    }

    // ---------------------------------------------------------------- internal

    private fun rebuildGeofencePendingIntent() {
        val appContext = context ?: return

        geofencePendingIntent?.cancel()

        val intent = Intent(appContext, GeofenceEventReceiver::class.java).apply {
            action = GEOFENCE_ACTION
        }

        geofencePendingIntent = PendingIntent.getBroadcast(
            appContext,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
    }

    private fun registerAllGeofences(promise: Promise) {
        val appContext = context ?: run { promise.resolve(null); return }

        if (registeredGeofences.isEmpty()) {
            removeGeofences(promise)
            return
        }

        val pendingIntent = geofencePendingIntent ?: run {
            promise.reject("NO_PENDING_INTENT", "Geofence pending intent was not built")
            return
        }

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(registeredGeofences.values.map { it.geofence })
            .build()

        try {
            val client = LocationServices.getGeofencingClient(appContext)
            Tasks.await(client.addGeofences(request, pendingIntent))
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("REGISTER_ERROR", "Failed to register geofences: ${error.message}", error)
        }
    }

    private fun removeGeofences(promise: Promise) {
        val appContext = context ?: run { promise.resolve(null); return }
        val pendingIntent = geofencePendingIntent ?: run { promise.resolve(null); return }

        try {
            val client = LocationServices.getGeofencingClient(appContext)
            Tasks.await(client.removeGeofences(pendingIntent))
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("REMOVE_ERROR", "Failed to remove geofences: ${error.message}", error)
        }
    }
}
