package com.sumasamu.iSocietyManager

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.graphics.BitmapFactory
import android.media.*
import android.net.Uri
import android.os.*
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.*
import org.json.JSONObject
import java.net.URL
import kotlin.concurrent.thread

/**
 * VisitorIncomingActivity
 * ───────────────────────
 * Shown as a full-screen activity over the lock screen when:
 *   • App is in BACKGROUND (not foreground)
 *   • App is KILLED (cold start)
 *
 * NOT shown when app is in foreground — JS / Notifee handles that case.
 *
 * On Accept / Decline:
 *   → writes PENDING_VISITOR_ACTION to SharedPrefs (one-shot)
 *   → opens MainActivity
 *   → AppState "active" event in RN reads and clears the key
 *
 * On View:
 *   → writes PENDING_VISITOR to SharedPrefs (one-shot)
 *   → opens MainActivity
 *   → AppState "active" event in RN reads and clears the key
 */
class VisitorIncomingActivity : Activity() {

    companion object {
        private const val TAG             = "VisitorIncomingActivity"
        private const val PREFS_NAME      = "VisitorPrefs"
        private const val KEY_ACTION      = "PENDING_VISITOR_ACTION"
        private const val KEY_VISITOR     = "PENDING_VISITOR"
        private const val AUTO_DISMISS_MS = 60_000L
        private const val NOTIF_ID        = 1001
    }

    private var mediaPlayer: MediaPlayer? = null
    private val timeoutHandler = Handler(Looper.getMainLooper())

    // ─── Visitor data ─────────────────────────────────────────────────────
    private var visitorId    = ""
    private var visitorName  = "Visitor"
    private var visitorPhone = ""
    private var visitorPhoto = ""
    private var purpose      = ""
    private var startTime    = ""

    /* ═══════════════════════════════════════════════════════════════════
       onCreate
    ═══════════════════════════════════════════════════════════════════ */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "onCreate → starting VisitorIncomingActivity")

        setupWindowFlags()

        // Cancel the backing notification (if any)
        (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)
            ?.cancel(NOTIF_ID)
        Log.d(TAG, "onCreate → cancelled notification $NOTIF_ID")

        setContentView(R.layout.activity_visitor_incoming)

        // ── Read intent extras ────────────────────────────────────────
        visitorId    = intent.getStringExtra("visitor_id")        ?: ""
        visitorName  = intent.getStringExtra("visitor_name")      ?: "Visitor"
        visitorPhone = intent.getStringExtra("visitor_phone")     ?: ""
        visitorPhoto = intent.getStringExtra("visitor_photo")     ?: ""
        purpose      = intent.getStringExtra("visit_purpose")     ?: ""
        startTime    = intent.getStringExtra("visit_start_time")  ?: ""

        Log.d(TAG, "onCreate → visitor: id=$visitorId name=$visitorName phone=$visitorPhone purpose=$purpose")

        if (visitorId.isEmpty()) {
            Log.e(TAG, "onCreate → visitorId is empty, finishing activity")
            finish()
            return
        }

        bindUI()
        loadPhoto()
        playSoundOrVibrate()

        // Auto-dismiss after 60 seconds
        timeoutHandler.postDelayed({
            Log.d(TAG, "AUTO DISMISS → 60s timeout reached")
            dismissSilently()
        }, AUTO_DISMISS_MS)

        bindButtons()
    }

    /* ═══════════════════════════════════════════════════════════════════
       Window flags — show over lock screen
    ═══════════════════════════════════════════════════════════════════ */
    private fun setupWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED    or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON      or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON      or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
        Log.d(TAG, "setupWindowFlags → window flags set")
    }

    /* ═══════════════════════════════════════════════════════════════════
       UI binding
    ═══════════════════════════════════════════════════════════════════ */
    private fun bindUI() {
        findViewById<TextView>(R.id.tvVisitorName)?.text  = visitorName
        findViewById<TextView>(R.id.tvVisitorPhone)?.text = visitorPhone.ifEmpty { "—" }
        findViewById<TextView>(R.id.tvVisitPurpose)?.text =
            if (purpose.isNotEmpty()) "Purpose: $purpose" else "Purpose: Not specified"
        Log.d(TAG, "bindUI → UI populated")
    }

    private fun loadPhoto() {
        if (visitorPhoto.isEmpty()) return
        val ivPhoto = findViewById<ImageView>(R.id.ivVisitorPhoto) ?: return

        thread {
            try {
                Log.d(TAG, "loadPhoto → fetching $visitorPhoto")
                val conn = URL(visitorPhoto).openConnection().apply {
                    connectTimeout = 5000
                    readTimeout    = 5000
                }
                val bmp = BitmapFactory.decodeStream(conn.getInputStream())
                runOnUiThread {
                    if (!isDestroyed) {
                        ivPhoto.setImageBitmap(bmp)
                        ivPhoto.visibility = View.VISIBLE
                        Log.d(TAG, "loadPhoto → image loaded OK")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadPhoto → failed: ${e.message}")
            }
        }
    }

    /* ═══════════════════════════════════════════════════════════════════
       Buttons
    ═══════════════════════════════════════════════════════════════════ */
    private fun bindButtons() {
        findViewById<Button>(R.id.btnAccept)?.setOnClickListener {
            Log.d(TAG, "btnAccept → tapped")
            handleAction("ACCEPT")
        }

        findViewById<Button>(R.id.btnDecline)?.setOnClickListener {
            Log.d(TAG, "btnDecline → tapped")
            handleAction("DECLINE")
        }

        findViewById<Button>(R.id.btnViewVisitor)?.setOnClickListener {
            Log.d(TAG, "btnViewVisitor → tapped")
            savePendingVisitorView()
            openMainApp()
        }
    }

    /* ═══════════════════════════════════════════════════════════════════
       Action handler
    ═══════════════════════════════════════════════════════════════════ */
    private fun handleAction(action: String) {
        val visitorJson = buildVisitorJson()
        val payload = JSONObject().apply {
            put("action", action)
            put("visitor", visitorJson)
        }

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_ACTION, payload.toString()).apply()

        Log.d(TAG, "handleAction → saved $KEY_ACTION = $payload")
        openMainApp()
    }

    private fun savePendingVisitorView() {
        val visitorJson = buildVisitorJson()
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_VISITOR, visitorJson.toString()).apply()
        Log.d(TAG, "savePendingVisitorView → saved $KEY_VISITOR = $visitorJson")
    }

    private fun buildVisitorJson() = JSONObject().apply {
        put("id",          visitorId)
        put("name",        visitorName)
        put("phoneNumber", visitorPhone)
        put("photo",       visitorPhoto)
        put("purpose",     purpose)
        put("startTime",   startTime)
    }

    /* ═══════════════════════════════════════════════════════════════════
       Open main app
    ═══════════════════════════════════════════════════════════════════ */
    private fun openMainApp() {
        stopSound()
        Log.d(TAG, "openMainApp → launching MainActivity")

        val intent = android.content.Intent(this, MainActivity::class.java).apply {
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK        or
                    android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP       or
                    android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        startActivity(intent)
        finish()
    }

    /* ═══════════════════════════════════════════════════════════════════
       Sound / vibration
    ═══════════════════════════════════════════════════════════════════ */
    private fun playSoundOrVibrate() {
        try {
            val prefs         = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val isSoundEnabled = prefs.getString("NATIVE_SOUND_ENABLED", "true") == "true"
            Log.d(TAG, "playSoundOrVibrate → soundEnabled=$isSoundEnabled")

            if (!isSoundEnabled) {
                startVibration()
                return
            }

            val rawResId = resources.getIdentifier("visitor_alert", "raw", packageName)
            val soundUri: Uri = if (rawResId != 0) {
                Uri.parse("android.resource://$packageName/$rawResId")
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            }
            Log.d(TAG, "playSoundOrVibrate → soundUri=$soundUri rawResId=$rawResId")

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(applicationContext, soundUri)
                isLooping = true
                prepare()
                start()
            }
            Log.d(TAG, "playSoundOrVibrate → MediaPlayer started")

        } catch (e: Exception) {
            Log.e(TAG, "playSoundOrVibrate → error: ${e.message}, falling back to vibration")
            startVibration()
        }
    }

    private fun startVibration() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            val pattern = longArrayOf(0, 500, 200, 500)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, 0)
            }
            Log.d(TAG, "startVibration → vibration started")
        } catch (e: Exception) {
            Log.e(TAG, "startVibration → error: ${e.message}")
        }
    }

    private fun stopSound() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null
            Log.d(TAG, "stopSound → stopped and released")
        } catch (e: Exception) {
            Log.e(TAG, "stopSound → error: ${e.message}")
        }
    }

    /* ═══════════════════════════════════════════════════════════════════
       Lifecycle
    ═══════════════════════════════════════════════════════════════════ */
    private fun dismissSilently() {
        stopSound()
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopSound()
        timeoutHandler.removeCallbacksAndMessages(null)
        Log.d(TAG, "onDestroy → activity destroyed")
    }

    override fun onBackPressed() {
        Log.d(TAG, "onBackPressed → blocked")
        // Block back button so user must use buttons
    }
}