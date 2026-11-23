package com.gpsreminder

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * ArrivalNotifier — posts the arrival notification from native code.
 *
 * The JS layer cannot run when the app process is dead, and that is exactly when Google Play
 * Services reports the DWELL transition (120 s inside the region). Posting from the receiver
 * makes arrival detection work with the app closed.
 *
 * Channel id matches `DEFAULT_CHANNEL_ID` in src/services/notificationService.ts so notification
 * settings stay consistent between JS-scheduled and native-posted notifications.
 */
object ArrivalNotifier {

    const val CHANNEL_ID = "gps_reminder_default"
    private const val CHANNEL_NAME = "GPS Reminders"
    private const val CHANNEL_DESCRIPTION = "Arrival notifications for your reminders"

    /** Keep native notification ids away from notifee's own id space. */
    private const val NOTIFICATION_ID_BASE = 7000

    const val EXTRA_REMINDER_ID = "reminderId"

    fun notifyArrival(context: Context, reminderId: String) {
        val meta = GeofenceEventStore.getReminderMeta(context, reminderId)
        if (meta == null) {
            // No cached metadata yet (reminder registered by an older build) — JS will notify
            // on the next launch once it drains the persisted event.
            android.util.Log.w("Geofencing", "No cached metadata for $reminderId; skipping native notification")
            return
        }

        ensureChannel(context)

        if (!canPostNotifications(context)) {
            android.util.Log.w("Geofencing", "POST_NOTIFICATIONS not granted; skipping native notification")
            return
        }

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_REMINDER_ID, reminderId)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(meta.title)
            .setContentText(meta.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(meta.body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context)
                .notify(NOTIFICATION_ID_BASE + reminderId.hashCode(), notification)
        } catch (error: SecurityException) {
            android.util.Log.e("Geofencing", "Failed to post arrival notification: ${error.message}", error)
        }
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return

        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                description = CHANNEL_DESCRIPTION
            },
        )
    }

    private fun canPostNotifications(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) return false
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }
}
