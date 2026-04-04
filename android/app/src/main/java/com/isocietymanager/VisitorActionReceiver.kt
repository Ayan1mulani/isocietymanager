package com.sumasamu.iSocietyManager

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import org.json.JSONObject
import java.net.URL
import kotlin.concurrent.thread

class VisitorActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.getStringExtra("action") ?: return
        val visitorId = intent.getStringExtra("visitor_id") ?: return

        Log.d("VisitorReceiver", "Action=$action Visitor=$visitorId")

        // ✅ Stop notification sound
        stopSound(context)

        // ✅ Cancel notification
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(1001)

        // ✅ Show loading toast
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, "Processing...", Toast.LENGTH_SHORT).show()
        }

        thread {
            try {
                val prefs = context.getSharedPreferences("VisitorAuth", Context.MODE_PRIVATE)

                val apiToken  = prefs.getString("apiToken", "") ?: ""
                val userId    = prefs.getString("userId", "") ?: ""
                val societyId = prefs.getString("societyId", "") ?: ""
                val roleId    = prefs.getString("roleId", "") ?: ""
                val unitId    = prefs.getString("unitId", "") ?: ""
                val flatNo    = prefs.getString("flatNo", "") ?: ""

                val userObj = JSONObject().apply {
                    put("user_id", userId)
                    put("group_id", roleId)
                    put("flat_no", flatNo)
                    put("unit_id", unitId)
                    put("society_id", societyId)
                }

                val userStr = userObj.toString().replace("\"", "%22")

                val url = "https://vms-api.isocietymanager.com/v1/society/$societyId/allowVisit" +
                        "?api-token=$apiToken&user-id=$userStr"

                val allow = if (action == "ACCEPT") 1 else 0

                val body = JSONObject().apply {
                    put("allow", allow)
                    put("visitId", visitorId)
                }

                val conn = URL(url).openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true

                conn.outputStream.write(body.toString().toByteArray())

                val code = conn.responseCode

                Log.d("VisitorReceiver", "Response=$code")

                Handler(Looper.getMainLooper()).post {
                    if (code in 200..299) {
                        Toast.makeText(
                            context,
                            if (action == "ACCEPT") "✅ Visitor Allowed"
                            else "❌ Visitor Denied",
                            Toast.LENGTH_LONG
                        ).show()
                    } else {
                        Toast.makeText(context, "Failed ❌", Toast.LENGTH_LONG).show()
                    }
                }

            } catch (e: Exception) {
                Log.e("VisitorReceiver", "Error=${e.message}")

                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(context, "Network Error ❌", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun stopSound(context: Context) {
        try {
            val uri = Uri.parse("android.resource://${context.packageName}/raw/visitor_alert")
            val player = MediaPlayer.create(context, uri)
            player?.stop()
            player?.release()
        } catch (e: Exception) {
            Log.e("VisitorReceiver", "Sound stop error")
        }
    }
}