package com.sumasamu.iSocietyManager

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

/**
 * MyNotificationServiceExtension
 * ────────────────────────────────
 * Intercepts every OneSignal push BEFORE it is displayed.
 *
 * FOREGROUND  → return immediately (JS / Notifee handles it via foregroundWillDisplay)
 * BACKGROUND  → launch VisitorIncomingActivity full-screen + prevent OneSignal default
 * KILLED      → launch VisitorIncomingActivity full-screen + prevent OneSignal default
 *
 * NEVER writes to SharedPrefs here — that is VisitorIncomingActivity's job.
 */
class MyNotificationServiceExtension : INotificationServiceExtension {

    companion object {
        private const val TAG        = "NotifServiceExtension"
        private const val CHANNEL_ID = "visitor_channel_v4"
        private const val NOTIF_ID   = 1001
        private const val VISITOR_TITLE = "Add Visit"
    }

    override fun onNotificationReceived(event: INotificationReceivedEvent) {
        val notification = event.notification
        val context      = event.context

        Log.d(TAG, "onNotificationReceived → title='${notification.title}'")

        // ── Only handle visitor notifications ───────────────────────────
        if (notification.title != VISITOR_TITLE) {
            Log.d(TAG, "onNotificationReceived → not a visitor notification, letting OneSignal handle")
            return
        }

        // ── FOREGROUND: let JS handle it ────────────────────────────────
        if (isAppInForeground(context)) {
            Log.d(TAG, "onNotificationReceived → app is FOREGROUND, JS will handle")
            return // Do NOT preventDefault — let OneSignal deliver to JS listener
        }

        // ── BACKGROUND or KILLED: launch full-screen activity ───────────
        Log.d(TAG, "onNotificationReceived → app is BACKGROUND/KILLED, handling natively")

        val raw  = notification.additionalData
        val data = raw?.optJSONObject("data") ?: raw

        val visitorId    = data?.optString("id")              ?: ""
        val visitorName  = data?.optString("visitor_name")    ?: "Visitor"
        val visitorPhone = data?.optString("visitor_phone_no") ?: ""
        val visitorPhoto = data?.optString("visitor_img")     ?: ""
        val purpose      = data?.optString("visit_purpose")   ?: ""
        val startTime    = data?.optString("visit_start_time") ?: ""

        Log.d(TAG, "onNotificationReceived → parsed: id=$visitorId name=$visitorName phone=$visitorPhone")

        if (visitorId.isEmpty()) {
            Log.e(TAG, "onNotificationReceived → visitorId is empty, aborting")
            event.preventDefault()
            return
        }

        // ── Build full-screen intent ────────────────────────────────────
        val activityIntent = Intent(context, VisitorIncomingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK        or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP       or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP

            putExtra("visitor_id",       visitorId)
            putExtra("visitor_name",     visitorName)
            putExtra("visitor_phone",    visitorPhone)
            putExtra("visitor_photo",    visitorPhoto)
            putExtra("visit_purpose",    purpose)
            putExtra("visit_start_time", startTime)
        }

        val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else
            PendingIntent.FLAG_UPDATE_CURRENT

        val pendingIntent = PendingIntent.getActivity(context, NOTIF_ID, activityIntent, piFlags)
        Log.d(TAG, "onNotificationReceived → PendingIntent created")

        // ── Notification channel ────────────────────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ensureChannel(context)
        }

        // ── Build and post notification (triggers full-screen intent) ───
        val soundUri = Uri.parse("android.resource://${context.packageName}/raw/visitor_alert")

        val builtNotification = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visitor Arrived")
            .setContentText("$visitorName is at the gate")
            .setPriority(Notification.PRIORITY_MAX)
            .setCategory(Notification.CATEGORY_CALL)
            .setSound(soundUri)
            .setFullScreenIntent(pendingIntent, true)
            .setAutoCancel(true)
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, builtNotification)

        Log.d(TAG, "onNotificationReceived → notification posted with id=$NOTIF_ID")

        // Prevent OneSignal from showing its own notification
        event.preventDefault()
        Log.d(TAG, "onNotificationReceived → OneSignal default prevented")
    }

    /* ═══════════════════════════════════════════════════════════════════
       Channel setup — recreates channel each time to ensure sound is set
    ═══════════════════════════════════════════════════════════════════ */
    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val nm = context.getSystemService(NotificationManager::class.java)

        // Delete old channels to force sound update
        listOf("visitor_channel", "visitor_channel_v2", "visitor_channel_v3").forEach {
            nm.deleteNotificationChannel(it)
        }

        if (nm.getNotificationChannel(CHANNEL_ID) != null) {
            Log.d(TAG, "ensureChannel → channel $CHANNEL_ID already exists")
            return
        }

        val soundUri = Uri.parse("android.resource://${context.packageName}/raw/visitor_alert")

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Visitor Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            enableVibration(true)
            enableLights(true)
            setSound(
                soundUri,
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build()
            )
        }

        nm.createNotificationChannel(channel)
        Log.d(TAG, "ensureChannel → created channel $CHANNEL_ID with sound=$soundUri")
    }

    /* ═══════════════════════════════════════════════════════════════════
       Foreground check
    ═══════════════════════════════════════════════════════════════════ */
    private fun isAppInForeground(context: Context): Boolean {
        val am        = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val processes = am.runningAppProcesses ?: return false

        val isFg = processes.any {
            it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
            it.processName == context.packageName
        }

        Log.d(TAG, "isAppInForeground → $isFg")
        return isFg
    }
}