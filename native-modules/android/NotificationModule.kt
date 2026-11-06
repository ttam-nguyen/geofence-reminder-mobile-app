/**
 * Android Native Notification Module — wraps NotificationManager.
 *
 * Provides local notification scheduling, cancellation, and permission management.
 */

package com.gpsreminder;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

public class NotificationModule extends ReactContextBaseJavaModule {

    public NotificationModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "NotificationModule";
    }

    /** Schedule a local notification. */
    @ReactMethod
    public void scheduleLocalNotification(ReadableMap params, Promise promise) {
        try {
            String notificationId = params.hasKey("notificationId") ? params.getString("notificationId") : "";
            String title = params.hasKey("title") ? params.getString("title") : "Reminder";
            String body = params.hasKey("body") ? params.getString("body") : "";
            boolean soundEnabled = params.hasKey("soundEnabled") && params.getBoolean("soundEnabled");
            boolean vibrationEnabled = params.hasKey("vibrationEnabled") && params.getBoolean("vibrationEnabled");

            Context context = getReactApplicationContext();
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            // Create the intent to open the app when notification is tapped
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                notificationId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Build the notification
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "gps_reminder_channel")
                .setSmallIcon(getResourceId(context, "ic_notification", "drawable"))
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent);

            // Sound: use default alert sound if enabled
            if (soundEnabled) {
                builder.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI);
            }

            // Vibration: vibrate pattern if enabled
            if (vibrationEnabled) {
                long[] vibrationPattern = {0, 250, 250, 250}; // short burst
                builder.setVibrate(vibrationPattern);
            }

            notificationManager.notify(notificationId.hashCode(), builder.build());

            promise.resolve(new com.facebook.react.bridge.DynamicFromMap(
                new java.util.HashMap<String, Object>() {{
                    put("success", true);
                    put("notificationId", notificationId);
                }}
            ));
        } catch (Exception e) {
            promise.reject("SCHEDULE_ERROR", "Failed to schedule notification: " + e.getMessage(), e);
        }
    }

    /** Cancel a scheduled notification by ID. */
    @ReactMethod
    public void cancelNotification(String notificationId, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancel(notificationId.hashCode());
            promise.resolve(new com.facebook.react.bridge.DynamicFromMap(
                new java.util.HashMap<String, Object>() {{
                    put("success", true);
                }}
            ));
        } catch (Exception e) {
            promise.reject("CANCEL_ERROR", "Failed to cancel notification: " + e.getMessage(), e);
        }
    }

    /** Check current notification permission state. */
    @ReactMethod
    public void checkNotificationPermission(Promise promise) {
        try {
            Context context = getReactApplicationContext();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ — check notification permission directly
                int permission = context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS);
                if (permission == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    promise.resolve("granted");
                } else {
                    // Check if user has previously denied
                    promise.resolve("denied");
                }
            } else {
                // Android 12 and below — notifications are always allowed (no runtime permission)
                promise.resolve("granted");
            }
        } catch (Exception e) {
            promise.reject("CHECK_ERROR", "Failed to check permission: " + e.getMessage(), e);
        }
    }

    /** Request notification permission from user (Android 13+ only). */
    @ReactMethod
    public void requestNotificationPermission(Promise promise) {
        try {
            Context context = getReactApplicationContext();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ requires explicit permission
                // We cannot programmatically grant it, so we guide the user to Settings
                Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);

                // After user grants, next checkNotificationPermission call will return "granted"
                promise.resolve("never_asked");
            } else {
                // Android 12 and below — no runtime permission needed
                promise.resolve("granted");
            }
        } catch (Exception e) {
            promise.reject("REQUEST_ERROR", "Failed to request permission: " + e.getMessage(), e);
        }
    }

    /** Helper to get resource ID by name. */
    private int getResourceId(Context context, String name, String type) {
        return context.getResources().getIdentifier(name, type, context.getPackageName());
    }
}
