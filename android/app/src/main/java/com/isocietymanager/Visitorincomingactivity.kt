package com.sumasamu.iSocietyManager

import android.app.Activity
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.BitmapFactory
import android.os.*
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.net.URL
import kotlin.concurrent.thread

class VisitorIncomingActivity : Activity() {

    companion object {
        private const val TAG            = "VisitorIncomingActivity"
        private const val PREFS_NAME     = "VisitorPrefs"
        private const val KEY_VISITOR    = "PENDING_VISITOR"
        private const val AUTO_DISMISS   = 60_000L
        private const val ACTION_HANDLED = "com.sumasamu.iSocietyManager.VISITOR_HANDLED"
    }

    private val timeoutHandler = Handler(Looper.getMainLooper())

    private var visitorId    = ""
    private var visitorName  = "Visitor"
    private var visitorPhone = ""
    private var visitorPhoto = ""
    private var purpose      = ""
    private var notifId      = 0

    // 🚀 Stops system sound instantly when power/lock button is pressed, BUT keeps it in the tray.
    private val screenOffReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == Intent.ACTION_SCREEN_OFF) {
                Log.d(TAG, "Screen locked by user. Silencing call.")
                silenceAndKeepNotification()  // Mutes it but keeps it in the tray
                finish()                      // Close the screen
            }
        }
    }

    // Completely removes the notification because the user handled it (Accepted/Declined)
    private val actionHandledReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val handledId = intent.getStringExtra("visitor_id") ?: return
            if (handledId != visitorId) return
            Log.d(TAG, "actionHandledReceiver → $handledId handled")
            cancelNotification() // Completely remove it, they already answered
            timeoutHandler.removeCallbacksAndMessages(null)
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "onCreate")

        setupWindowFlags()
        setContentView(R.layout.activity_visitor_incoming)
        extractIntent(intent)

        if (visitorId.isEmpty()) {
            finish()
            return
        }

        registerReceiver(screenOffReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
        registerHandledReceiver()
        bindUI()
        loadPhoto()
        bindButtons()
        scheduleAutoDismiss()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val newId = intent.getStringExtra("visitor_id") ?: ""
        if (newId.isEmpty() || newId == visitorId) return
        
        cancelNotification()
        extractIntent(intent)
        bindUI()
        loadPhoto()
        resetButtons()
        scheduleAutoDismiss()
    }

    override fun onDestroy() {
        super.onDestroy()
        timeoutHandler.removeCallbacksAndMessages(null)
        try { unregisterReceiver(screenOffReceiver)     } catch (_: Exception) {}
        try { unregisterReceiver(actionHandledReceiver) } catch (_: Exception) {}
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        Log.d(TAG, "Back press blocked")
    }

    private fun setupWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED  or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON    or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON    or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
    }

    private fun registerHandledReceiver() {
        val filter = IntentFilter(ACTION_HANDLED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(actionHandledReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(actionHandledReceiver, filter)
        }
    }

    private fun extractIntent(src: Intent) {
        visitorId    = src.getStringExtra("visitor_id")    ?: ""
        visitorName  = src.getStringExtra("visitor_name")  ?: "Visitor"
        visitorPhone = src.getStringExtra("visitor_phone") ?: ""
        visitorPhoto = src.getStringExtra("visitor_photo") ?: ""
        purpose      = src.getStringExtra("visit_purpose") ?: ""
        notifId      = src.getIntExtra("notif_id", visitorId.hashCode())
    }

    // Completely removes the notification
    private fun cancelNotification() {
        if (notifId == 0) return
        (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)?.cancel(notifId)
        Log.d(TAG, "Notification cancelled completely.")
    }

    // 🚀 NEW: Kills the sound but keeps a quiet banner in the tray
    private fun silenceAndKeepNotification() {
    if (notifId == 0) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    
    // 1. Instantly kill the loud, ringing notification
    nm.cancel(notifId)

    // 2. Put it right back in the tray as a quiet, clickable alert
    val intent = Intent(this, VisitorIncomingActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        putExtra("visitor_id", visitorId)
        putExtra("visitor_name", visitorName)
        putExtra("visitor_phone", visitorPhone)
        putExtra("visitor_photo", visitorPhoto)
        putExtra("visit_purpose", purpose)
        putExtra("notif_id", notifId)
    }

    val pendingIntent = PendingIntent.getActivity(
        this, notifId, intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = NotificationCompat.Builder(this, "visitor_channel_v9")
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle("Missed Visitor: $visitorName")
        .setContentText("Tap to view details")
        .setContentIntent(pendingIntent)
        .setAutoCancel(true)
        .setSilent(true) // No sound
        .setOngoing(false) // 🔥 FIX: Allow the user to swipe it away now
        .setPriority(NotificationCompat.PRIORITY_LOW) // 🔥 FIX: Prevents it from popping up as a banner again

    nm.notify(notifId, builder.build())
    Log.d(TAG, "Notification silenced, priority lowered, and kept in tray.")
}

    private fun bindUI() {
        findViewById<TextView>(R.id.tvVisitorName)?.text  = visitorName
        findViewById<TextView>(R.id.tvVisitorPhone)?.text = visitorPhone.ifEmpty { "—" }
        findViewById<TextView>(R.id.tvVisitPurpose)?.text =
            if (purpose.isNotEmpty()) "Purpose: $purpose" else "Purpose: Not specified"
    }

    private fun loadPhoto() {
        if (visitorPhoto.isEmpty()) return
        val iv = findViewById<ImageView>(R.id.ivVisitorPhoto) ?: return
        
        thread {
            try {
                val conn = URL(visitorPhoto).openConnection() as java.net.HttpURLConnection
                conn.connectTimeout = 5000 
                conn.readTimeout = 5000
                conn.doInput = true
                conn.connect()
                
                val bmp = BitmapFactory.decodeStream(conn.inputStream)
                runOnUiThread {
                    if (!isDestroyed) { 
                        iv.setImageBitmap(bmp)
                        iv.visibility = View.VISIBLE 
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Image load failed → ${e.message}")
            }
        }
    }

    private fun bindButtons() {
        findViewById<Button>(R.id.btnAccept)?.setOnClickListener  { handleAction("ACCEPT")  }
        findViewById<Button>(R.id.btnDecline)?.setOnClickListener { handleAction("DECLINE") }
    }

    private fun resetButtons() {
        findViewById<Button>(R.id.btnAccept)?.apply  { isEnabled = true; text = "Accept"  }
        findViewById<Button>(R.id.btnDecline)?.apply { isEnabled = true; text = "Decline" }
        findViewById<ProgressBar>(R.id.loader)?.visibility = View.GONE
    }

    private fun handleAction(action: String) {
        cancelNotification() // Removes it from tray completely so it stops ringing
        timeoutHandler.removeCallbacksAndMessages(null)

        findViewById<Button>(R.id.btnAccept)?.isEnabled  = false
        findViewById<Button>(R.id.btnDecline)?.isEnabled = false
        findViewById<ProgressBar>(R.id.loader)?.visibility = View.VISIBLE

        thread {
            val result = VisitorApiHelper.call(this, action, visitorId)
            runOnUiThread {
                if (result.success) {
                    Toast.makeText(this, result.message, Toast.LENGTH_LONG).show()
                    Handler(Looper.getMainLooper()).postDelayed({ finish() }, 1_200)
                } else {
                    Toast.makeText(this, result.message, Toast.LENGTH_LONG).show()
                    resetButtons()
                }
            }
        }
    }

    private fun scheduleAutoDismiss() {
        timeoutHandler.removeCallbacksAndMessages(null)
        timeoutHandler.postDelayed({
            Log.d(TAG, "Auto-dismiss triggered")
            silenceAndKeepNotification() // 🚀 Demote to a silent alert instead of deleting
            finish()
        }, AUTO_DISMISS)
    }

    private fun savePendingVisitorForRN() {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putString(KEY_VISITOR, JSONObject().apply {
                put("id",   visitorId)
                put("name", visitorName)
            }.toString())
            .apply()
    }
}