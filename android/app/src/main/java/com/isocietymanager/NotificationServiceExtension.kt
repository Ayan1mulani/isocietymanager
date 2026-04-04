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
        private const val TAG         = "NotifServiceExtension"
        private const val CHANNEL_ID  = "visitor_channel_v5"

        /**
         * How long a visitorId is considered "already handled".
         *
         * Why 10 minutes?
         *  - OneSignal sometimes re-delivers the same push within seconds → blocked ✅
         *  - If the guard re-rings after 10 min it means the visitor is genuinely
         *    still waiting (network hiccup, resident didn't respond, etc.) → allowed ✅
         *
         * Change to e.g. 5 * 60 * 1000L for 5 min, or 0L to disable expiry.
         */
        private const val DEDUP_WINDOW_MS = 10 * 60 * 1000L   // 10 minutes

        /**
         * In-memory map: visitorId → timestamp when it was first handled.
         * Cleared automatically once the window expires.
         */
        private val handledAt = HashMap<String, Long>()
    }

    override fun onNotificationReceived(event: INotificationReceivedEvent) {
        val notification = event.notification
        val context = event.context

        Log.d(TAG, "onNotificationReceived → ${notification.title}")

        // ── 1. Only handle "Add Visit" push notifications ──────────────────────
        val title = notification.title?.trim()?.lowercase()
        if (title != "add visit") {
            Log.d(TAG, "Not a visitor notification → ignoring")
            return
        }

        // ── 2. Extract payload ──────────────────────────────────────────────────
        val raw  = notification.additionalData ?: run {
            Log.e(TAG, "No additionalData → ignoring")
            return
        }
        val data = raw.optJSONObject("data") ?: raw

        val visitorId   = data.optString("id", "")
        val visitorName = data.optString("visitor_name", "Visitor")

        if (visitorId.isEmpty()) {
            Log.e(TAG, "visitorId empty → ignoring")
            return
        }

        val now = System.currentTimeMillis()

        // ── 3. Dedup: in-memory (fast path, same process lifetime) ──────────────
        //
        //  • If the id was recorded AND the window hasn't expired → duplicate, block it.
        //  • If the id was recorded BUT the window HAS expired   → visitor is still
        //    waiting / came back; remove old entry and let it through.
        //  • If the id was never recorded                        → first delivery, allow.
        synchronized(handledAt) {
            val recordedAt = handledAt[visitorId]
            if (recordedAt != null) {
                val age = now - recordedAt
                if (age < DEDUP_WINDOW_MS) {
                    Log.d(TAG, "Duplicate blocked (memory) → $visitorId  age=${age / 1000}s")
                    event.preventDefault()
                    return
                }
                // Window expired → treat as a fresh visit
                Log.d(TAG, "Dedup window expired (memory) → $visitorId  age=${age / 1000}s → allowing")
                handledAt.remove(visitorId)
            }
            handledAt[visitorId] = now
        }

        // ── 4. Dedup: persistent (survives process restarts) ────────────────────
        //
        //  Stores the epoch-ms timestamp instead of a plain boolean so we can
        //  apply the same expiry logic even after the app was killed and restarted.
        val prefs = context.getSharedPreferences("notif_dedup", Context.MODE_PRIVATE)

        val storedAt = prefs.getLong(visitorId, 0L)
        if (storedAt != 0L) {
            val age = now - storedAt
            if (age < DEDUP_WINDOW_MS) {
                Log.d(TAG, "Duplicate blocked (storage) → $visitorId  age=${age / 1000}s")
                event.preventDefault()
                return
            }
            Log.d(TAG, "Dedup window expired (storage) → $visitorId  age=${age / 1000}s → allowing")
        }

        // commit() is intentional — synchronous write so a concurrent delivery on
        // another thread immediately sees the lock before we do any heavy work.
        prefs.edit().putLong(visitorId, now).commit()

        // ── 4b. Housekeeping: prune entries older than the window ────────────────
        //
        //  SharedPreferences grows forever without this. We do it after writing the
        //  new entry (cheap, runs ~once per notification).
        pruneExpiredDedup(prefs, now)

        // ── 5. Build notification ID from visitorId so we can cancel it later ───
        val notifId = visitorId.hashCode()

        // Cancel any stale notification for the same visitor (e.g. from a retry)
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(notifId)

        // ── 6. Build the full-screen / tap intent ───────────────────────────────
        val intent = Intent(context, VisitorIncomingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("visitor_id",    visitorId)
            putExtra("visitor_name",  visitorName)
            putExtra("visitor_phone", data.optString("visitor_phone_no"))
            putExtra("visitor_photo", data.optString("visitor_img"))
            putExtra("visit_purpose", data.optString("visit_purpose"))
            putExtra("notif_id",      notifId)
        }

        // Use notifId as request code so that different visitors get distinct PendingIntents
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            notifId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val contentPendingIntent = PendingIntent.getActivity(
            context,
            notifId + 1000,          // different slot so FLAG_UPDATE_CURRENT doesn't collide
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // ── 7. Action buttons ───────────────────────────────────────────────────
        val acceptPendingIntent = PendingIntent.getBroadcast(
            context,
            notifId + 1,
            Intent(context, VisitorActionReceiver::class.java).apply {
                putExtra("action",      "ACCEPT")
                putExtra("visitor_id",  visitorId)
                putExtra("notif_id",    notifId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val declinePendingIntent = PendingIntent.getBroadcast(
            context,
            notifId + 2,
            Intent(context, VisitorActionReceiver::class.java).apply {
                putExtra("action",      "DECLINE")
                putExtra("visitor_id",  visitorId)
                putExtra("notif_id",    notifId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // ── 8. Ensure notification channel exists ───────────────────────────────
        ensureChannel(context)

        // ── 9. Post the notification ─────────────────────────────────────────────
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visitor Arrived")
            .setContentText("$visitorName is at the gate")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(contentPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)           // keep it until the user acts (ongoing=true wins)
            .addAction(0, "Accept",  acceptPendingIntent)
            .addAction(0, "Decline", declinePendingIntent)

        nm.notify(notifId, builder.build())

        Log.d(TAG, "Notification posted → notifId=$notifId visitor=$visitorName")

        // Prevent OneSignal from also posting its default notification
        event.preventDefault()
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    /**
     * Remove all SharedPreferences entries whose timestamp is older than
     * [DEDUP_WINDOW_MS]. Keeps the file small no matter how many visitors
     * pass through over days / weeks.
     */
    private fun pruneExpiredDedup(
        prefs: android.content.SharedPreferences,
        now: Long
    ) {
        val expired = prefs.all
            .filterValues { v -> v is Long && (now - v) >= DEDUP_WINDOW_MS }
            .keys

        if (expired.isEmpty()) return

        prefs.edit().apply {
            expired.forEach { remove(it) }
        }.apply()   // async is fine here — this is just cleanup

        Log.d(TAG, "Pruned ${expired.size} expired dedup entries")
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val nm = context.getSystemService(NotificationManager::class.java)

        // Only create the channel once; Android ignores subsequent calls with the
        // same ID *unless* you delete and recreate it (hence the versioned ID).
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return

        val soundUri = Uri.parse("android.resource://${context.packageName}/raw/visitor_alert")

        val channel = NotificationChannel(
            CHANNEL_ID,
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
        Log.d(TAG, "Notification channel created → $CHANNEL_ID")
    }
}