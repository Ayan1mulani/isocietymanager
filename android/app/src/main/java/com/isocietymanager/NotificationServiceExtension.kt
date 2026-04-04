package com.sumasamu.iSocietyManager

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

class MyNotificationServiceExtension : INotificationServiceExtension {

    companion object {
        private const val TAG = "NotifServiceExtension"
        private const val CHANNEL_ID = "visitor_channel_v5"
        private const val NOTIF_ID = 1001
    }

    override fun onNotificationReceived(event: INotificationReceivedEvent) {
        val notification = event.notification
        val context = event.context

        Log.d(TAG, "onNotificationReceived → title='${notification.title}'")

        val title = notification.title?.trim()?.lowercase()

        // ✅ IMPORTANT: match title correctly
        if (title != "add visit") {
            Log.d(TAG, "Not visitor notification → $title")
            return
        }

        // ✅ Foreground → let JS handle
        if (AppState.isInForeground) {
            Log.d(TAG, "App is FOREGROUND → JS handles")
            return
        }

        val raw = notification.additionalData ?: run {
            Log.e(TAG, "No additionalData")
            event.preventDefault()
            return
        }

        val data = raw.optJSONObject("data") ?: raw

        val visitorId = data.optString("id", "")
        if (visitorId.isEmpty()) {
            Log.e(TAG, "visitorId missing")
            event.preventDefault()
            return
        }

        val visitorName = data.optString("visitor_name", "Visitor")

        val intent = Intent(context, VisitorIncomingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP

            putExtra("visitor_id", visitorId)
            putExtra("visitor_name", visitorName)
            putExtra("visitor_phone", data.optString("visitor_phone_no"))
            putExtra("visitor_photo", data.optString("visitor_img"))
            putExtra("visit_purpose", data.optString("visit_purpose"))
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            NOTIF_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        ensureChannel(context)

        val notificationBuilder = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visitor Arrived")
            .setContentText("$visitorName is at the gate")
            .setPriority(Notification.PRIORITY_MAX)
            .setCategory(Notification.CATEGORY_CALL)
            .setFullScreenIntent(pendingIntent, true)
            .setAutoCancel(true)

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, notificationBuilder.build())

        Log.d(TAG, "Notification shown → launching full screen")

        event.preventDefault()
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val nm = context.getSystemService(NotificationManager::class.java)

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
    }
}