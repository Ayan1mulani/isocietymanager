package com.sumasamu.iSocietyManager

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

        // ── Visitor channel (existing) ──────────────────────────────────────
        private const val VISITOR_CHANNEL_ID = "visitor_channel_v5"

        // ── Staff channel (new) ─────────────────────────────────────────────
        private const val STAFF_CHANNEL_ID = "staff_channel_v1"

        private const val DEDUP_WINDOW_MS = 10 * 60 * 1000L // 10 minutes

        private val handledAt = HashMap<String, Long>()
    }

    override fun onNotificationReceived(event: INotificationReceivedEvent) {
        val notification = event.notification
        val context = event.context

        Log.d(TAG, "onNotificationReceived → title='${notification.title}'")

        val raw = notification.additionalData
        val data = raw?.optJSONObject("data") ?: raw

        // ── Route to the correct handler ────────────────────────────────────
        val notifType = data?.optString("type", "")?.uppercase()

        when {
            notifType == "STAFF" -> handleStaffNotification(event, context, data!!)
            notification.title?.trim()?.lowercase() == "add visit" -> handleVisitorNotification(event, context, data)
            else -> {
                Log.d(TAG, "Unhandled notification type → displaying normally")
                // Let OneSignal display it with default behaviour
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  STAFF HANDLER — plays door_bell.mp3
    // ════════════════════════════════════════════════════════════════════════
    private fun handleStaffNotification(
        event: INotificationReceivedEvent,
        context: Context,
        data: org.json.JSONObject
    ) {
        val staffName = data.optString("name", "Staff")
        val isExit    = data.optInt("exit", 0) == 1
        val staffId   = data.optString("id", "")

        Log.d(TAG, "handleStaffNotification → $staffName exit=$isExit")

        if (staffId.isEmpty()) {
            Log.e(TAG, "staffId empty → ignoring")
            return
        }

        // Dedup key includes exit flag so entry + exit are separate events
        val dedupKey = "staff_${staffId}_${if (isExit) "exit" else "entry"}"
        val now = System.currentTimeMillis()

        synchronized(handledAt) {
            val recordedAt = handledAt[dedupKey]
            if (recordedAt != null && (now - recordedAt) < DEDUP_WINDOW_MS) {
                Log.d(TAG, "Staff duplicate blocked → $dedupKey")
                event.preventDefault()
                return
            }
            handledAt[dedupKey] = now
        }

        val prefs    = context.getSharedPreferences("notif_dedup", Context.MODE_PRIVATE)
        val storedAt = prefs.getLong(dedupKey, 0L)
        if (storedAt != 0L && (now - storedAt) < DEDUP_WINDOW_MS) {
            Log.d(TAG, "Staff duplicate blocked (storage) → $dedupKey")
            event.preventDefault()
            return
        }
        prefs.edit().putLong(dedupKey, now).apply()

        val notifId    = dedupKey.hashCode()
        val title      = if (isExit) "Staff Exited" else "Staff Arrived"
        val body       = if (isExit) "$staffName has exited the society" else "$staffName has entered the society"

        ensureStaffChannel(context) // ← door_bell channel

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(notifId)

        // Tap opens the app
        val tapIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
            ?.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP }

        val tapPending = if (tapIntent != null) PendingIntent.getActivity(
            context, notifId + 5000, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        ) else null

        val builder = NotificationCompat.Builder(context, STAFF_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .apply { if (tapPending != null) setContentIntent(tapPending) }

        nm.notify(notifId, builder.build())

        Log.d(TAG, "Staff notification posted → $title $staffName")

        // Prevent OneSignal from also posting its default notification
        event.preventDefault()
    }

    // ════════════════════════════════════════════════════════════════════════
    //  VISITOR HANDLER — unchanged, plays visitor_alert sound
    // ════════════════════════════════════════════════════════════════════════
    private fun handleVisitorNotification(
        event: INotificationReceivedEvent,
        context: Context,
        data: org.json.JSONObject?
    ) {
        val visitorId   = data?.optString("id", "") ?: ""
        val visitorName = data?.optString("visitor_name", "Visitor") ?: "Visitor"

        if (visitorId.isEmpty()) {
            Log.e(TAG, "visitorId empty → ignoring")
            return
        }

        val now = System.currentTimeMillis()

        synchronized(handledAt) {
            val recordedAt = handledAt[visitorId]
            if (recordedAt != null) {
                val age = now - recordedAt
                if (age < DEDUP_WINDOW_MS) {
                    Log.d(TAG, "Visitor duplicate blocked (memory) → $visitorId age=${age / 1000}s")
                    event.preventDefault()
                    return
                }
                handledAt.remove(visitorId)
            }
            handledAt[visitorId] = now
        }

        val prefs    = context.getSharedPreferences("notif_dedup", Context.MODE_PRIVATE)
        val storedAt = prefs.getLong(visitorId, 0L)
        if (storedAt != 0L) {
            val age = now - storedAt
            if (age < DEDUP_WINDOW_MS) {
                Log.d(TAG, "Visitor duplicate blocked (storage) → $visitorId age=${age / 1000}s")
                event.preventDefault()
                return
            }
        }
        prefs.edit().putLong(visitorId, now).commit()
        pruneExpiredDedup(prefs, now)

        val notifId = visitorId.hashCode()

        val intent = Intent(context, VisitorIncomingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("visitor_id",    visitorId)
            putExtra("visitor_name",  visitorName)
            putExtra("visitor_phone", data?.optString("visitor_phone_no"))
            putExtra("visitor_photo", data?.optString("visitor_img"))
            putExtra("visit_purpose", data?.optString("visit_purpose"))
            putExtra("notif_id",      notifId)
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(
            context, notifId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val contentPendingIntent = PendingIntent.getActivity(
            context, notifId + 1000, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val acceptPendingIntent = PendingIntent.getBroadcast(
            context, notifId + 1,
            Intent(context, VisitorActionReceiver::class.java).apply {
                putExtra("action",     "ACCEPT")
                putExtra("visitor_id", visitorId)
                putExtra("notif_id",   notifId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val declinePendingIntent = PendingIntent.getBroadcast(
            context, notifId + 2,
            Intent(context, VisitorActionReceiver::class.java).apply {
                putExtra("action",     "DECLINE")
                putExtra("visitor_id", visitorId)
                putExtra("notif_id",   notifId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        ensureVisitorChannel(context)

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(notifId)

        val builder = NotificationCompat.Builder(context, VISITOR_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visitor Arrived")
            .setContentText("$visitorName is at the gate")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(contentPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .addAction(0, "Accept",  acceptPendingIntent)
            .addAction(0, "Decline", declinePendingIntent)

        nm.notify(notifId, builder.build())
        Log.d(TAG, "Visitor notification posted → notifId=$notifId visitor=$visitorName")

        event.preventDefault()
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CHANNEL HELPERS
    // ════════════════════════════════════════════════════════════════════════

    /** Staff channel — uses door_bell.mp3 */
    private fun ensureStaffChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(STAFF_CHANNEL_ID) != null) return

        // ← points to res/raw/door_bell.mp3
        val soundUri = Uri.parse("android.resource://${context.packageName}/raw/door_bell")

        val channel = NotificationChannel(
            STAFF_CHANNEL_ID,
            "Staff Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            enableVibration(true)
            setSound(
                soundUri,
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build()
            )
        }
        nm.createNotificationChannel(channel)
        Log.d(TAG, "Staff notification channel created → $STAFF_CHANNEL_ID")
    }

    /** Visitor channel — uses visitor_alert sound (unchanged) */
    private fun ensureVisitorChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(VISITOR_CHANNEL_ID) != null) return

        val soundUri = Uri.parse("android.resource://${context.packageName}/raw/visitor_alert")

        val channel = NotificationChannel(
            VISITOR_CHANNEL_ID,
            "Visitor Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            enableVibration(true)
            setSound(
                soundUri,
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build()
            )
        }
        nm.createNotificationChannel(channel)
        Log.d(TAG, "Visitor notification channel created → $VISITOR_CHANNEL_ID")
    }

    private fun pruneExpiredDedup(prefs: android.content.SharedPreferences, now: Long) {
        val expired = prefs.all
            .filterValues { v -> v is Long && (now - v) >= DEDUP_WINDOW_MS }
            .keys
        if (expired.isEmpty()) return
        prefs.edit().apply { expired.forEach { remove(it) } }.apply()
        Log.d(TAG, "Pruned ${expired.size} expired dedup entries")
    }
}