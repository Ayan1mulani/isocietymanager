package com.sumasamu.iSocietyManager

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import kotlin.concurrent.thread

class VisitorActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG              = "VisitorActionReceiver"
        private const val PROGRESS_CHANNEL = "visitor_action_channel"
        private const val RESULT_CHANNEL   = "visitor_result_channel"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action    = intent.getStringExtra("action")     ?: return
        val visitorId = intent.getStringExtra("visitor_id") ?: return
        val notifId   = intent.getIntExtra("notif_id", visitorId.hashCode())

        Log.d(TAG, "onReceive → action=$action visitorId=$visitorId notifId=$notifId")

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // ── 1. Dismiss the incoming visitor notification immediately ─────────────
        nm.cancel(notifId)

        // ── 2. Show an indeterminate "processing" notification ───────────────────
        val progressId = notifId + 9000
        showProgressNotification(context, nm, progressId, action)

        // ── 3. Run the API call on a background thread ───────────────────────────
        //    goAsync() keeps the BroadcastReceiver alive past its 10-second limit.
        val pending = goAsync()

        thread {
            try {
                // Single call — all API logic lives in VisitorApiHelper
                val result = VisitorApiHelper.call(context, action, visitorId)

                // ── 4. Dismiss progress, show result ─────────────────────────────
                nm.cancel(progressId)
                showResultNotification(context, nm, notifId + 9001, result.success, result.message)

                Log.d(TAG, "Done → success=${result.success} code=${result.code}")

                // ── 5. Tell the Activity to close itself if it is open ────────────
                context.sendBroadcast(
                    Intent("com.sumasamu.iSocietyManager.VISITOR_HANDLED").apply {
                        putExtra("visitor_id", visitorId)
                        putExtra("action",     action)
                        putExtra("success",    result.success)
                        setPackage(context.packageName)
                    }
                )
            } finally {
                pending.finish()
            }
        }
    }

    // ── Notification helpers ──────────────────────────────────────────────────────

    private fun showProgressNotification(
        context: Context,
        nm:      NotificationManager,
        id:      Int,
        action:  String
    ) {
        ensureChannel(nm, PROGRESS_CHANNEL, "Visitor Action Progress", NotificationManager.IMPORTANCE_LOW)

        nm.notify(
            id,
            androidx.core.app.NotificationCompat.Builder(context, PROGRESS_CHANNEL)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(if (action == "ACCEPT") "Allowing visitor…" else "Declining visitor…")
                .setProgress(0, 0, true)
                .setOngoing(true)
                .setAutoCancel(false)
                .build()
        )
    }

    private fun showResultNotification(
        context: Context,
        nm:      NotificationManager,
        id:      Int,
        success: Boolean,
        message: String
    ) {
        ensureChannel(nm, RESULT_CHANNEL, "Visitor Action Result", NotificationManager.IMPORTANCE_DEFAULT)

        nm.notify(
            id,
            androidx.core.app.NotificationCompat.Builder(context, RESULT_CHANNEL)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(if (success) "Done" else "Action Failed")
                .setContentText(message)
                .setAutoCancel(true)
                .build()
        )
    }

    private fun ensureChannel(nm: NotificationManager, id: String, name: String, importance: Int) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        if (nm.getNotificationChannel(id) != null) return
        nm.createNotificationChannel(NotificationChannel(id, name, importance))
    }
}