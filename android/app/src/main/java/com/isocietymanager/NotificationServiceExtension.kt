package com.sumasamu.iSocietyManager

import android.app.*
import android.content.Context
import android.content.Intent
import android.app.KeyguardManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import com.onesignal.notifications.INotificationReceivedEvent
import androidx.core.app.NotificationCompat

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

        Log.d(TAG, "onNotificationReceived → ${notification.title}")

        val title = notification.title?.trim()?.lowercase()

        if (title != "add visit") return

        val raw = notification.additionalData ?: return
        val data = raw.optJSONObject("data") ?: raw

        val visitorId = data.optString("id", "")
        val visitorName = data.optString("visitor_name", "Visitor")

        if (visitorId.isEmpty()) return

        val intent = Intent(context, VisitorIncomingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
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

        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val isLocked = keyguardManager.isKeyguardLocked

      
        // 🔴 LOCKED → FULL SCREEN
        if (isLocked) {
            Log.d(TAG, "LOCKED → opening full screen")
            event.preventDefault()
            context.startActivity(intent)
            return
        }

        // 🟡 BACKGROUND → NORMAL NOTIFICATION
        Log.d(TAG, "BACKGROUND → showing notification")

        val acceptIntent = Intent(context, VisitorActionReceiver::class.java).apply {
            putExtra("action", "ACCEPT")
            putExtra("visitor_id", visitorId)
        }

        val declineIntent = Intent(context, VisitorActionReceiver::class.java).apply {
            putExtra("action", "DECLINE")
            putExtra("visitor_id", visitorId)
        }

        val acceptPendingIntent = PendingIntent.getBroadcast(
            context, 1, acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val declinePendingIntent = PendingIntent.getBroadcast(
            context, 2, declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        ensureChannel(context)

       val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visitor Arrived")
            .setContentText("$visitorName is at the gate")
           .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .addAction(0, "Accept", acceptPendingIntent)
            .addAction(0, "Decline", declinePendingIntent)
            .setAutoCancel(true)

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, builder.build())

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