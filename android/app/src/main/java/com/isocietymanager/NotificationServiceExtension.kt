package com.isocietymanager
import android.net.Uri
import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

class MyNotificationServiceExtension : INotificationServiceExtension {

    override fun onNotificationReceived(event: INotificationReceivedEvent) {
        val notification = event.notification

        // 🔒 Only handle specific notification
        if (notification.title != "Add Visit") return

        // 🟢 If app is foreground → let JS (Notifee) handle
        if (isAppInForeground(event.context)) {
            return
        }

        // 🔵 BACKGROUND / KILLED STATE
        val context = event.context
        val raw = notification.additionalData
        val data = raw?.optJSONObject("data") ?: raw

        val visitorId    = data?.optString("id") ?: ""
        val visitorName  = data?.optString("visitor_name") ?: "Visitor"
        val visitorPhone = data?.optString("visitor_phone_no") ?: ""
        val visitorPhoto = data?.optString("visitor_img") ?: ""
        val purpose      = data?.optString("visit_purpose") ?: ""
        val startTime    = data?.optString("visit_start_time") ?: ""

        if (visitorId.isEmpty()) return

        /* ======================================================
           🔥 INTENT → OPEN FULL SCREEN ACTIVITY
        ====================================================== */
        val intent = Intent(context, VisitorIncomingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP

            putExtra("visitor_id", visitorId)
            putExtra("visitor_name", visitorName)
            putExtra("visitor_phone", visitorPhone)
            putExtra("visitor_photo", visitorPhoto)
            putExtra("visit_purpose", purpose)
            putExtra("visit_start_time", startTime)
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else
            PendingIntent.FLAG_UPDATE_CURRENT

        val pendingIntent = PendingIntent.getActivity(context, 0, intent, flags)

        /* ======================================================
           🔊 CHANNEL WITH SOUND (CRITICAL FIX)
        ====================================================== */
        val channelId = "visitor_channel_v3"

            val soundUri = Uri.parse("android.resource://${context.packageName}/raw/visitor_alert")


if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {


    val nm = context.getSystemService(NotificationManager::class.java)

    nm.deleteNotificationChannel("visitor_channel")
    nm.deleteNotificationChannel("visitor_channel_v2")
    nm.deleteNotificationChannel(channelId)

    val channel = NotificationChannel(
        channelId,
        "Visitor Alerts",
        NotificationManager.IMPORTANCE_HIGH
    ).apply {
        enableVibration(true)
        enableLights(true)

        setSound(
            soundUri,
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE) // 🔥 important
                .build()
        )
    }

    nm.createNotificationChannel(channel)
}

        /* ======================================================
           🔔 BUILD NOTIFICATION
        ====================================================== */
        val builtNotification = Notification.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visitor Arrived")
            .setContentText("$visitorName is at the gate")
            .setPriority(Notification.PRIORITY_MAX)
            .setCategory(Notification.CATEGORY_CALL)
           .setSound(soundUri)
            .setFullScreenIntent(pendingIntent, true)
            .setAutoCancel(true)
            .build()

        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        notificationManager.notify(1001, builtNotification)

        // ❌ Prevent OneSignal default notification
        event.preventDefault()
    }

    /* ======================================================
       CHECK FOREGROUND STATE
    ====================================================== */
    private fun isAppInForeground(context: Context): Boolean {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val processes = am.runningAppProcesses ?: return false

        return processes.any {
            it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
            it.processName == context.packageName
        }
    }
}