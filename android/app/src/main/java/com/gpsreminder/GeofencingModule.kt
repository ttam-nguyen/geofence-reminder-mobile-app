package com.gpsreminder

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks

/**
 * GeofencingModule — Task 8.3 Android native geofencing module.
 *
 * Wraps Google Play Services Geofencing API for region monitoring (200m outer boundary)
 * and coordinates with the arrival detection service for stationary qualification.
 *
 * Replaces SpikeModule after Task 8.1 passes.
 */
@com.facebook.react.module.annotations.ReactModule(name = GeofencingModule.NAME)
class GeofencingModule(reactContext: ReactApplicationContext?) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "GeofencingModule"
        const val GEOFENCE_ACTION = "com.gpsreminder.GEOFENCE_EVENT"

        // Production constants (matching JS/Android spec)
        private const val GEOFAENCE_RADIUS: Float = 200f
        private const val STATIONARY_SPEED_THRESHOLD_MPS: Float = 0.89408f  // <2 mph
        private const val STATIONARY_DURATION_SECONDS: Long = 120L
        private const val MAX_REGIONS: Int = 100  // Android per-app limit

        // Transition type constants (matching JS spec)
        const val TRANSITION_ENTER = 1  // GeofenceTransitions.GEOFENCE_TRANSITION_ENTER
        const val TRANSITION_EXIT = 2   // GeofenceTransitions.GEOFENCE_TRANSITION_EXIT
        const val TRANSITION_DWELL = 4  // GeofenceTransitions.GEOFENCE_TRANSITION_DWELL (optional, supporting only)
    }

    private val context: ReactApplicationContext? = reactContext

    // Registered geofences: reminderId → pair of (Geofence, region info).
    // We store region info separately because Geofence doesn't expose circularRegion in this API version.
    private data class RegisteredGeofence(val geofence: Geofence, val lat: Double, val lon: Double, val rad: Float)
    private val registeredGeofences = mutableMapOf<String, RegisteredGeofence>()

    // PendingIntent for geofence events (single instance, reused)
    private var geofencePendingIntent: PendingIntent? = null

    override fun getName(): String = NAME

    init {
        // Initialize the static reference in GeofenceEventReceiver.
        GeofenceEventReceiver.reactContext = reactContext
    }

    /**
     * Register a geofence for the given reminder.
     */
    @ReactMethod
    fun registerGeofence(
        reminderId: String,
        latitude: Double,
        longitude: Double,
        radius: Float,
        promise: Promise
    ) {
        try {
            val actualRadius = maxOf(radius, GEOFAENCE_RADIUS)

            // Validate capacity.
            if (registeredGeofences.size >= MAX_REGIONS) {
                promise.reject(
                    "CAPACITY_EXCEEDED",
                    "Android limit of $MAX_REGIONS geofences reached. Unregister some before registering new ones.",
                    null
                )
                return
            }

            // Check if already registered — skip duplicate.
            if (registeredGeofences.containsKey(reminderId)) {
                promise.resolve(null)
                return
            }

            // Create the geofence.
            val geofence = Geofence.Builder()
                .setRequestId(reminderId)
                .setCircularRegion(latitude, longitude, actualRadius)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setLoiteringDelay((STATIONARY_DURATION_SECONDS * 1000).toInt())  // DWELL delay = stationary duration
                .build()

            registeredGeofences[reminderId] = RegisteredGeofence(
                geofence = geofence,
                lat = latitude,
                lon = longitude,
                rad = actualRadius
            )

            // Rebuild the pending intent with all registered geofences.
            rebuildGeofencePendingIntent()

            // Register all geofences at once (required by Android API).
            registerAllGeofences(promise)
        } catch (e: Exception) {
            promise.reject("REGISTER_ERROR", e.message, e)
        }
    }

    /**
     * Unregister a geofence for the given reminder.
     */
    @ReactMethod
    fun unregisterGeofence(reminderId: String, promise: Promise) {
        try {
            if (registeredGeofences.remove(reminderId) != null) {
                // Rebuild and re-register remaining geofences.
                if (registeredGeofences.isEmpty()) {
                    removeGeofences(promise)
                } else {
                    rebuildGeofencePendingIntent()
                    registerAllGeofences(promise)
                }
            } else {
                // Already unregistered — not an error.
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("UNREGISTER_ERROR", e.message, e)
        }
    }

    /**
     * List all registered geofences.
     */
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
     * Get the current location permission status.
     */
    @ReactMethod
    fun getAuthorizationStatus(promise: Promise) {
        val context = this.context ?: run { promise.resolve("unspecified"); return }

        val status = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            context.applicationContext.checkPermission(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.os.Process.myPid(),
                android.os.Process.myUid()
            )
        } else {
            @Suppress("DEPRECATION")
            context.applicationContext.checkPermission(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.os.Process.myPid(),
                android.os.Process.myUid()
            )
        }

        when (status) {
            android.content.pm.PackageManager.PERMISSION_GRANTED -> promise.resolve("granted")
            android.content.pm.PackageManager.PERMISSION_DENIED -> promise.resolve("denied")
            else -> promise.resolve("unspecified")  // not determined / restricted
        }
    }

    /**
     * Request location permission (Android).
     */
    @ReactMethod
    fun requestLocationPermission(promise: Promise) {
        // Permissions are requested from JS via @react-native-community/geolocation.
        // This method is a no-op placeholder for consistency with iOS API.
        promise.resolve(null)
    }

    // MARK: - Internal helpers

    /**
     * Build or rebuild the PendingIntent that receives geofence transition events.
     */
    private fun rebuildGeofencePendingIntent() {
        val context = this.context ?: return

        // Cancel existing intent to avoid duplicates.
        geofencePendingIntent?.cancel()

        val intent = Intent(context, GeofenceEventReceiver::class.java).apply {
            action = GEOFENCE_ACTION
        }

        geofencePendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )
    }

    /**
     * Register all geofences at once (Android API requires bulk registration).
     */
    private fun registerAllGeofences(promise: Promise) {
        val context = this.context ?: run { promise.resolve(null); return }

        if (registeredGeofences.isEmpty()) {
            removeGeofences(promise)
            return
        }

        val geofenceList = registeredGeofences.values.map { it.geofence }
        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(geofenceList)
            .build()

        try {
            val geofencingClient = LocationServices.getGeofencingClient(context)
            val result = Tasks.await(geofencingClient.addGeofences(request, geofencePendingIntent!!))
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("REGISTER_ERROR", "Failed to register geofences: ${e.message}", e)
        }
    }

    /**
     * Remove all registered geofences.
     */
    private fun removeGeofences(promise: Promise) {
        val context = this.context ?: run { promise.resolve(null); return }

        try {
            if (geofencePendingIntent != null) {
                val geofencingClient = LocationServices.getGeofencingClient(context)
                Tasks.await(geofencingClient.removeGeofences(geofencePendingIntent!!))
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("REMOVE_ERROR", "Failed to remove geofences: ${e.message}", e)
        }
    }
}
