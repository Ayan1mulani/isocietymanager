package com.isocietymanager

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent  // ← was missing
import android.os.Build
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

class MyNotificationServiceExtension : INotificationServiceExtension {

    override fun onNotificationReceived(event: INotificationReceivedEvent) {
        val notification = event.notification

        if (notification.title != "Add Visit") return

        val context = event.context
        val raw = notification.additionalData
        val data = raw?.optJSONObject("data") ?: raw

        val visitorId    = data?.optString("id")               ?: ""
        val visitorName  = data?.optString("visitor_name")     ?: "Visitor"
        val visitorPhone = data?.optString("visitor_phone_no") ?: ""
        val visitorPhoto = data?.optString("visitor_img")      ?: ""
        val purpose      = data?.optString("visit_purpose")    ?: ""
        val startTime    = data?.optString("visit_start_time") ?: ""

        if (visitorId.isEmpty()) return

        // ✅ Build Intent separately (not inline) — fixes "Unresolved reference"
        val activityIntent = Intent(context, VisitorIncomingActivity::class.java)
        activityIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                               Intent.FLAG_ACTIVITY_CLEAR_TOP or
                               Intent.FLAG_ACTIVITY_SINGLE_TOP
        activityIntent.putExtra("visitor_id",       visitorId)
        activityIntent.putExtra("visitor_name",     visitorName)
        activityIntent.putExtra("visitor_phone",    visitorPhone)
        activityIntent.putExtra("visitor_photo",    visitorPhoto)
        activityIntent.putExtra("visit_purpose",    purpose)
        activityIntent.putExtra("visit_start_time", startTime)

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else
            PendingIntent.FLAG_UPDATE_CURRENT

        val pendingIntent = PendingIntent.getActivity(context, 0, activityIntent, flags)

        val channelId = "visitor_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Visitor Alerts",
                NotificationManager.IMPORTANCE_HIGH
            )
            val nm = context.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }

        val builtNotification = Notification.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visitor Arrived")
            .setContentText("$visitorName is at the gate")
            .setPriority(Notification.PRIORITY_MAX)
            .setCategory(Notification.CATEGORY_CALL)
            .setFullScreenIntent(pendingIntent, true)
            .setAutoCancel(true)
            .build()

        val notificationManager =
            context.getSystemService(android.content.Context.NOTIFICATION_SERVICE)
                    as NotificationManager

        notificationManager.notify(1001, builtNotification)

        event.preventDefault()
    }
}