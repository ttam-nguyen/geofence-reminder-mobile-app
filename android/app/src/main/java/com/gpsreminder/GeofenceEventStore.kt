package com.gpsreminder

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * GeofenceEventStore — durable storage for geofence transitions and reminder metadata.
 *
 * Why this exists:
 * Google Play Services delivers geofence transitions to [GeofenceEventReceiver] even when the
 * app process is dead. The React context is null in that case, so an in-memory-only handoff
 * silently drops the event. Every transition is therefore persisted here first and drained by
 * JS when the app is next alive.
 */
object GeofenceEventStore {

    private const val PREFS_NAME = "gps_reminder_geofence_store"
    private const val KEY_EVENTS = "pending_events"
    private const val KEY_NEXT_ID = "next_event_id"
    private const val KEY_REMINDER_PREFIX = "reminder_meta_"

    /** Oldest events are dropped past this cap so the prefs file cannot grow without bound. */
    private const val MAX_PENDING_EVENTS = 200

    /** A geofence transition that has not been handed to JS yet. */
    data class PendingEvent(
        val id: Long,
        val reminderId: String,
        val transitionType: Int,
        val at: Long,
        val latitude: Double?,
        val longitude: Double?,
    ) {
        fun toJson(): JSONObject = JSONObject().apply {
            put("id", id)
            put("reminderId", reminderId)
            put("transitionType", transitionType)
            put("at", at)
            if (latitude != null && longitude != null) {
                put("latitude", latitude)
                put("longitude", longitude)
            }
        }

        companion object {
            fun fromJson(json: JSONObject): PendingEvent = PendingEvent(
                id = json.optLong("id"),
                reminderId = json.optString("reminderId"),
                transitionType = json.optInt("transitionType"),
                at = json.optLong("at"),
                latitude = if (json.has("latitude")) json.optDouble("latitude") else null,
                longitude = if (json.has("longitude")) json.optDouble("longitude") else null,
            )
        }
    }

    /**
     * Reminder copy needed to post a notification without JS (app may be closed), plus whether
     * that reminder's current status may notify on arrival at all.
     */
    data class ReminderMeta(val title: String, val body: String, val notifyOnDwell: Boolean)

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ---------------------------------------------------------------- events

    /** Persist a transition. Returns the stored event with its assigned id. */
    @Synchronized
    fun appendEvent(
        context: Context,
        reminderId: String,
        transitionType: Int,
        latitude: Double?,
        longitude: Double?,
    ): PendingEvent {
        val preferences = prefs(context)
        val id = preferences.getLong(KEY_NEXT_ID, 1L)
        val event = PendingEvent(
            id = id,
            reminderId = reminderId,
            transitionType = transitionType,
            at = System.currentTimeMillis(),
            latitude = latitude,
            longitude = longitude,
        )

        val events = readEvents(preferences).toMutableList()
        events.add(event)
        while (events.size > MAX_PENDING_EVENTS) {
            events.removeAt(0)
        }
        writeEvents(preferences, events)
        preferences.edit().putLong(KEY_NEXT_ID, id + 1).apply()

        return event
    }

    /** Read every pending transition and clear the queue atomically. */
    @Synchronized
    fun drainEvents(context: Context): List<PendingEvent> {
        val preferences = prefs(context)
        val events = readEvents(preferences)
        writeEvents(preferences, emptyList())
        return events
    }

    fun pendingEventCount(context: Context): Int = readEvents(prefs(context)).size

    private fun readEvents(preferences: SharedPreferences): List<PendingEvent> {
        val raw = preferences.getString(KEY_EVENTS, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            buildList(array.length()) {
                for (index in 0 until array.length()) {
                    add(PendingEvent.fromJson(array.getJSONObject(index)))
                }
            }
        } catch (error: Exception) {
            android.util.Log.e("Geofencing", "Failed to read pending events: ${error.message}", error)
            emptyList()
        }
    }

    private fun writeEvents(preferences: SharedPreferences, events: List<PendingEvent>) {
        val array = JSONArray()
        events.forEach { array.put(it.toJson()) }
        preferences.edit().putString(KEY_EVENTS, array.toString()).apply()
    }

    // ------------------------------------------------------- reminder metadata

    /**
     * Cache the copy needed to raise a notification while JS is not running.
     *
     * `notifyOnDwell` mirrors the reminder's status at registration time: only ARMED and
     * ARRIVAL_PENDING reminders may alert on arrival. WAITING_FOR_EXIT means the user started
     * inside the radius and must leave and return first, so a DWELL there must stay silent.
     */
    fun saveReminderMeta(
        context: Context,
        reminderId: String,
        title: String,
        body: String,
        notifyOnDwell: Boolean,
    ) {
        prefs(context).edit()
            .putString(KEY_REMINDER_PREFIX + reminderId, JSONObject().apply {
                put("title", title)
                put("body", body)
                put("notifyOnDwell", notifyOnDwell)
            }.toString())
            .apply()
    }

    fun getReminderMeta(context: Context, reminderId: String): ReminderMeta? {
        val raw = prefs(context).getString(KEY_REMINDER_PREFIX + reminderId, null) ?: return null
        return try {
            val json = JSONObject(raw)
            ReminderMeta(
                title = json.optString("title", "GPS Reminder"),
                body = json.optString("body", "You have arrived."),
                // Entries written by older builds have no flag; fail closed so a
                // WAITING_FOR_EXIT reminder cannot alert.
                notifyOnDwell = json.optBoolean("notifyOnDwell", false),
            )
        } catch (error: Exception) {
            null
        }
    }

    fun removeReminderMeta(context: Context, reminderId: String) {
        prefs(context).edit().remove(KEY_REMINDER_PREFIX + reminderId).apply()
    }
}
