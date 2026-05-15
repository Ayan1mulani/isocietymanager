package com.factech.maxestate

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

class MyNotificationServiceExtension : INotificationServiceExtension {

    companion object {
        private const val TAG = "NotifServiceExtension"

        private const val VISITOR_CHANNEL_ID = "visitor_channel_v9"
        private const val STAFF_CHANNEL_ID   = "staff_channel_v3"

        private const val DEDUP_WINDOW_MS = 10 * 60 * 1000L // 10 minutes

        private const val KEY_VISITOR_SOUND = "NATIVE_SOUND_ENABLED"
        private const val KEY_STAFF_SOUND   = "NATIVE_STAFF_SOUND_ENABLED"

        private val handledAt = HashMap<String, Long>()
    }

   override fun onNotificationReceived(event: INotificationReceivedEvent) {
    val notification = event.notification
    val context = event.context

    Log.d(TAG, "🔥 EXTENSION RECEIVED NOTIFICATION → ${notification.title}")

    val raw = notification.additionalData
    val data = raw?.optJSONObject("data") ?: raw
    val type = data?.optString("type", "")?.uppercase()
    val title = notification.title?.trim()?.lowercase() ?: ""

    // Check if this is a notification we need to handle manually
    if (type == "STAFF" || title.contains("add visit")) {
        
        // 🔥 CRITICAL FIX: Tell OneSignal immediately NOT to show its own notification
        event.preventDefault()

        if (type == "STAFF") {
            handleStaffNotification(event, context, data!!)
        } else {
            handleVisitorNotification(event, context, data)
        }
    } else {
        // Let OneSignal display it normally if it's a generic or marketing message
        Log.d(TAG, "Standard notification, letting OneSignal handle it.")
    }
}
    private fun isSoundEnabled(context: Context, key: String): Boolean {
        val prefs = context.getSharedPreferences("${context.packageName}_preferences", Context.MODE_PRIVATE)
        return prefs.getString(key, "true") == "true"
    }

    private fun handleStaffNotification(event: INotificationReceivedEvent, context: Context, data: org.json.JSONObject) {
        val staffName = data.optString("name", "Staff")
        val isExit = data.optInt("exit", 0) == 1
        val staffId = data.optString("id", "")

        if (staffId.isEmpty()) return

        val key = "staff_${staffId}_${if (isExit) "exit" else "entry"}"
        val now = System.currentTimeMillis()

        synchronized(handledAt) {
            val last = handledAt[key]
            if (last != null && now - last < DEDUP_WINDOW_MS) {
                event.preventDefault()
                return
            }
            handledAt[key] = now
        }

        val prefs = context.getSharedPreferences("notif_dedup", Context.MODE_PRIVATE)
        val stored = prefs.getLong(key, 0L)
        if (stored != 0L && now - stored < DEDUP_WINDOW_MS) {
            event.preventDefault()
            return
        }
        prefs.edit().putLong(key, now).apply()

        ensureStaffChannel(context)

        val builder = NotificationCompat.Builder(context, STAFF_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(if (isExit) "Staff Exited" else "Staff Arrived")
            .setContentText(if (isExit) "$staffName has exited the society" else "$staffName has entered the society")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)

        if (!isSoundEnabled(context, KEY_STAFF_SOUND)) {
            builder.setSilent(true)
        }

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(key.hashCode(), builder.build())

        event.preventDefault()
    }

    private fun handleVisitorNotification(event: INotificationReceivedEvent, context: Context, data: org.json.JSONObject?) {
        val visitorId = data?.optString("id", "") ?: return
        val visitorName = data.optString("visitor_name", "Visitor")
        val now = System.currentTimeMillis()

        synchronized(handledAt) {
            val last = handledAt[visitorId]
            if (last != null && now - last < DEDUP_WINDOW_MS) {
                event.preventDefault()
                return
            }
            handledAt[visitorId] = now
        }

        val prefs = context.getSharedPreferences("notif_dedup", Context.MODE_PRIVATE)
        val stored = prefs.getLong(visitorId, 0L)
        if (stored != 0L && now - stored < DEDUP_WINDOW_MS) {
            event.preventDefault()
            return
        }
        prefs.edit().putLong(visitorId, now).apply()

        ensureVisitorChannel(context)
        val notifId = visitorId.hashCode()

        // 🚀 ACCURATE LOCK SCREEN DETECTION
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
        val activelyUsingPhone = powerManager.isInteractive && !keyguardManager.isKeyguardLocked

        val intent = Intent(context, VisitorIncomingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("visitor_id", visitorId)
            putExtra("visitor_name", visitorName)
            putExtra("visitor_phone", data.optString("visitor_phone_no"))
            putExtra("visitor_photo", data.optString("visitor_img"))
            putExtra("visit_purpose", data.optString("visit_purpose"))
            putExtra("notif_id", notifId)
        }

        val fullScreenIntent = PendingIntent.getActivity(
            context, notifId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val acceptIntent = PendingIntent.getBroadcast(
            context, notifId + 1,
            Intent(context, VisitorActionReceiver::class.java).apply {
                putExtra("action", "ACCEPT")
                putExtra("visitor_id", visitorId)
                putExtra("notif_id", notifId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val declineIntent = PendingIntent.getBroadcast(
            context, notifId + 2,
            Intent(context, VisitorActionReceiver::class.java).apply {
                putExtra("action", "DECLINE")
                putExtra("visitor_id", visitorId)
                putExtra("notif_id", notifId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, VISITOR_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visitor Arrived")
            .setContentText("$visitorName is at the gate")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .addAction(0, "Decline", declineIntent)
            .addAction(0, "Accept", acceptIntent)

        // 🚀 THE LOGIC: If screen is ON, just show banner. If OFF, wake screen up.
        if (activelyUsingPhone) {
            builder.setContentIntent(fullScreenIntent)
        } else {
            builder.setFullScreenIntent(fullScreenIntent, true)
        }

        // Only mute if the user explicitly turned off sounds in your app's settings
        if (!isSoundEnabled(context, KEY_VISITOR_SOUND)) {
            builder.setSilent(true)
        }

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(notifId, builder.build())
        
        context.getSharedPreferences("notif_active", Context.MODE_PRIVATE)
            .edit().putInt("visitor_notif_id", notifId).apply()

        event.preventDefault()
    }

    private fun ensureStaffChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(STAFF_CHANNEL_ID) != null) return

        val channel = NotificationChannel(STAFF_CHANNEL_ID, "Staff Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
            enableVibration(true)
            setSound(
                Uri.parse("android.resource://${context.packageName}/raw/door_bell"),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
            )
        }
        nm.createNotificationChannel(channel)
    }

    private fun ensureVisitorChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(VISITOR_CHANNEL_ID) != null) return

        val channel = NotificationChannel(VISITOR_CHANNEL_ID, "Visitor Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
            enableVibration(true)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            setSound(
                Uri.parse("android.resource://${context.packageName}/raw/visitor_alert"),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
            )
        }
        nm.createNotificationChannel(channel)
    }
}