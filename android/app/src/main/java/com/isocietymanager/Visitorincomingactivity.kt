package com.sumasamu.iSocietyManager

import android.app.Activity
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.BitmapFactory
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.*
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.*
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

    private var ringtone: Ringtone? = null

    // FIX 1: Manual loop handler for API < 28 where Ringtone.isLooping is unavailable
    private val ringtoneLoopHandler = Handler(Looper.getMainLooper())
    private var ringtoneDurationMs  = 3_000L   // fallback poll interval for pre-P loop

    private val timeoutHandler = Handler(Looper.getMainLooper())

    private var visitorId    = ""
    private var visitorName  = "Visitor"
    private var visitorPhone = ""
    private var visitorPhoto = ""
    private var purpose      = ""
    private var notifId      = 0

    // FIX 4: Restored — needed so notification-action taps close this screen correctly
    private val actionHandledReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val handledId = intent.getStringExtra("visitor_id") ?: return
            if (handledId != visitorId) return

            val action  = intent.getStringExtra("action")  ?: ""
            val success = intent.getBooleanExtra("success", false)
            Log.d(TAG, "actionHandledReceiver → $handledId was $action success=$success")

            stopRingtone()
            timeoutHandler.removeCallbacksAndMessages(null)
            finish()
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "onCreate")

        setupWindowFlags()
        setContentView(R.layout.activity_visitor_incoming)
        extractIntent(intent)

        if (visitorId.isEmpty()) {
            Log.e(TAG, "visitorId empty → finishing")
            finish()
            return
        }

        cancelNotification()
        registerHandledReceiver()

        bindUI()
        loadPhoto()
        playRingtone()
        bindButtons()
        scheduleAutoDismiss()
    }

    // FIX 4: Restored onNewIntent — handles a second visitor arriving while screen is open
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        Log.d(TAG, "onNewIntent")

        val newId = intent.getStringExtra("visitor_id") ?: ""
        if (newId.isEmpty() || newId == visitorId) return

        stopRingtone()
        extractIntent(intent)
        cancelNotification()

        bindUI()
        loadPhoto()
        resetButtons()
        playRingtone()
        scheduleAutoDismiss()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "onDestroy")
        stopRingtone()
        timeoutHandler.removeCallbacksAndMessages(null)
        try { unregisterReceiver(actionHandledReceiver) } catch (_: Exception) {}
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Intentionally blocked — resident must explicitly Accept, Decline or View
        Log.d(TAG, "Back press blocked")
    }

    // ── Setup ─────────────────────────────────────────────────────────────────────

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

    // FIX 2: Restored RECEIVER_NOT_EXPORTED flag — prevents crash on Android 14+ (API 34)
    private fun registerHandledReceiver() {
        val filter = IntentFilter(ACTION_HANDLED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(actionHandledReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(actionHandledReceiver, filter)
        }
    }

    // ── Intent / state ────────────────────────────────────────────────────────────

    private fun extractIntent(src: Intent) {
        visitorId    = src.getStringExtra("visitor_id")    ?: ""
        visitorName  = src.getStringExtra("visitor_name")  ?: "Visitor"
        visitorPhone = src.getStringExtra("visitor_phone") ?: ""
        visitorPhoto = src.getStringExtra("visitor_photo") ?: ""
        purpose      = src.getStringExtra("visit_purpose") ?: ""
        notifId      = src.getIntExtra("notif_id", visitorId.hashCode())
        Log.d(TAG, "extractIntent → id=$visitorId name=$visitorName notifId=$notifId")
    }

    // ── Notification ──────────────────────────────────────────────────────────────

    private fun cancelNotification() {
        if (notifId == 0) return
        (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)?.cancel(notifId)
        Log.d(TAG, "Notification cancelled → $notifId")
    }

    // ── UI ────────────────────────────────────────────────────────────────────────

    private fun bindUI() {
        findViewById<TextView>(R.id.tvVisitorName)?.text  = visitorName
        // FIX 7: Show "—" for empty phone instead of blank
        findViewById<TextView>(R.id.tvVisitorPhone)?.text = visitorPhone.ifEmpty { "—" }
        findViewById<TextView>(R.id.tvVisitPurpose)?.text =
            if (purpose.isNotEmpty()) "Purpose: $purpose" else "Purpose: Not specified"
    }

    private fun loadPhoto() {
        if (visitorPhoto.isEmpty()) return
        val iv = findViewById<ImageView>(R.id.ivVisitorPhoto) ?: return
        thread {
            try {
                val bmp = BitmapFactory.decodeStream(URL(visitorPhoto).openStream())
                runOnUiThread {
                    // FIX 6: Guard against destroyed activity before updating UI
                    if (!isDestroyed) { iv.setImageBitmap(bmp); iv.visibility = View.VISIBLE }
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

    // ── Actions ───────────────────────────────────────────────────────────────────

    // FIX 3: Only finish on API success; re-enable buttons on failure so user can retry
    private fun handleAction(action: String) {
        Log.d(TAG, "handleAction → $action")

        stopRingtone()
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
                    Log.e(TAG, "API failure → ${result.code} : ${result.message}")
                    Toast.makeText(this, result.message, Toast.LENGTH_LONG).show()
                    resetButtons()   // let the user retry
                }
            }
        }
    }

    private fun scheduleAutoDismiss() {
        timeoutHandler.removeCallbacksAndMessages(null)
        timeoutHandler.postDelayed({
            Log.d(TAG, "Auto-dismiss triggered")
            stopRingtone()
            cancelNotification()
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

    // ── Ringtone ──────────────────────────────────────────────────────────────────

    private fun playRingtone() {
        ringtoneLoopHandler.removeCallbacksAndMessages(null)
        try {
            val uri = Uri.parse("android.resource://$packageName/raw/visitor_alert")
            ringtone = RingtoneManager.getRingtone(applicationContext, uri)

            // FIX 1: Loop the ringtone
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                // API 28+: native looping support
                ringtone?.isLooping = true
                ringtone?.play()
            } else {
                // Pre-API 28: manually restart when playback ends
                ringtone?.play()
                scheduleRingtoneLoop()
            }

            Log.d(TAG, "Ringtone playing (looping)")
        } catch (e: Exception) {
            Log.e(TAG, "Ringtone error → ${e.message}")
            vibrateDevice()
        }
    }

    /** Pre-API-28 loop: polls every [ringtoneDurationMs] ms and restarts if stopped. */
    private fun scheduleRingtoneLoop() {
        ringtoneLoopHandler.postDelayed({
            val r = ringtone ?: return@postDelayed   // stopped intentionally
            if (!r.isPlaying) {
                r.play()
                Log.d(TAG, "Ringtone restarted (pre-P loop)")
            }
            scheduleRingtoneLoop()
        }, ringtoneDurationMs)
    }

    private fun stopRingtone() {
        ringtoneLoopHandler.removeCallbacksAndMessages(null)
        ringtone?.stop()
        ringtone = null
        Log.d(TAG, "Ringtone stopped")
    }

    // ── Vibration fallback ────────────────────────────────────────────────────────

    private fun vibrateDevice() {
        val pattern = longArrayOf(0, 500, 300, 500, 300, 500)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager)
                .defaultVibrator
                .vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            (getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator).let { v ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createWaveform(pattern, 0))
                } else {
                    @Suppress("DEPRECATION")
                    v.vibrate(pattern, 0)
                }
            }
        }
    }
}