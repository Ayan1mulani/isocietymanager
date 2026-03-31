package com.isocietymanager

import android.app.Activity
import android.content.Context
import android.graphics.BitmapFactory
import android.media.*
import android.net.Uri
import android.os.*
import android.preference.PreferenceManager
import android.view.View
import android.view.WindowManager
import android.widget.*
import org.json.JSONObject
import java.net.URL
import kotlin.concurrent.thread
import android.app.NotificationManager
import android.util.Log

class VisitorIncomingActivity : Activity() {

    private var mediaPlayer: MediaPlayer? = null
    private val timeoutHandler = Handler(Looper.getMainLooper())
    private val AUTO_DISMISS_MS = 60_000L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 🔥 Show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
        

      
  (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)
        ?.cancel(1001)

        setContentView(R.layout.activity_visitor_incoming)
      

        // ---------- DATA ----------
        val visitorId    = intent.getStringExtra("visitor_id") ?: ""
        val visitorName  = intent.getStringExtra("visitor_name") ?: "Visitor"
        val visitorPhone = intent.getStringExtra("visitor_phone") ?: ""
        val visitorPhoto = intent.getStringExtra("visitor_photo") ?: ""
        val purpose      = intent.getStringExtra("visit_purpose") ?: ""
        val startTime    = intent.getStringExtra("visit_start_time") ?: ""

        // ---------- UI ----------
        findViewById<TextView>(R.id.tvVisitorName)?.text = visitorName
        findViewById<TextView>(R.id.tvVisitorPhone)?.text = visitorPhone.ifEmpty { "—" }
        findViewById<TextView>(R.id.tvVisitPurpose)?.text =
            if (purpose.isNotEmpty()) "Purpose: $purpose" else "Purpose: Not specified"

        // ---------- IMAGE ----------
        if (visitorPhoto.isNotEmpty()) {
            val ivPhoto = findViewById<ImageView>(R.id.ivVisitorPhoto)
            ivPhoto?.let {
                thread {
                    try {
                        val connection = URL(visitorPhoto).openConnection()
                        connection.connectTimeout = 5000
                        connection.readTimeout = 5000
                        val bmp = BitmapFactory.decodeStream(connection.getInputStream())

                        runOnUiThread {
                            if (!isDestroyed) {
                                it.setImageBitmap(bmp)
                                it.visibility = View.VISIBLE
                            }
                        }
                    } catch (_: Exception) {}
                }
            }
        }

        // 🔥 PLAY SOUND
        playSoundOrVibrate()

        timeoutHandler.postDelayed({ dismissSilently() }, AUTO_DISMISS_MS)

        // ---------- BUTTONS ----------
        findViewById<Button>(R.id.btnAccept)?.setOnClickListener {
            handleVisitorAction("ACCEPT", visitorId, visitorName, visitorPhone, visitorPhoto, purpose, startTime)
        }

        findViewById<Button>(R.id.btnDecline)?.setOnClickListener {
            handleVisitorAction("DECLINE", visitorId, visitorName, visitorPhone, visitorPhoto, purpose, startTime)
        }

        findViewById<Button>(R.id.btnViewVisitor)?.setOnClickListener {
            val visitorJson = JSONObject().apply {
                put("id", visitorId)
                put("name", visitorName)
                put("phoneNumber", visitorPhone)
                put("photo", visitorPhoto)
                put("purpose", purpose)
                put("startTime", startTime)
            }

            val prefs = getSharedPreferences("VisitorPrefs", Context.MODE_PRIVATE)
            prefs.edit().putString("PENDING_VISITOR", visitorJson.toString()).apply()

            openMainApp()
        }
    }

    

    /* ======================================================
       🔥 SOUND (FIXED VERSION)
    ====================================================== */
    private fun playSoundOrVibrate() {
        try {
            val prefs = getSharedPreferences("VisitorPrefs", Context.MODE_PRIVATE)
            val isSoundEnabled = prefs.getString("NATIVE_SOUND_ENABLED", "true") == "true"

            if (!isSoundEnabled) {
                startVibration()
                return
            }

            // 🔥 Use ALARM stream (loud + works always)
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.mode = AudioManager.MODE_NORMAL

            val rawResId = resources.getIdentifier("visitor_alert", "raw", packageName)

            val soundUri: Uri = if (rawResId != 0) {
                Uri.parse("android.resource://$packageName/$rawResId")
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            }

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)   // 🔥 IMPORTANT
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(applicationContext, soundUri)
                isLooping = true
                prepare()
                start()
            }

        } catch (e: Exception) {
            e.printStackTrace()
            startVibration()
        }
    }

    /* ======================================================
       VIBRATION
    ====================================================== */
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
        } catch (_: Exception) {}
    }

    /* ======================================================
       ACTION HANDLER
    ====================================================== */
    private fun handleVisitorAction(
        action: String, id: String, name: String, phone: String,
        photo: String, purpose: String, startTime: String
    ) {
        val visitorData = JSONObject().apply {
            put("id", id)
            put("name", name)
            put("phoneNumber", phone)
            put("photo", photo)
            put("purpose", purpose)
            put("startTime", startTime)
        }

        val pendingAction = JSONObject().apply {
            put("action", action)
            put("visitor", visitorData)
        }

        val prefs = getSharedPreferences("VisitorPrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("PENDING_VISITOR_ACTION", pendingAction.toString()).apply()
    Log.d("VISITOR_DEBUG", "Saved action: $pendingAction")

        openMainApp()
    }

    private fun openMainApp() {
        stopSound()

        val intent = android.content.Intent(this, MainActivity::class.java).apply {
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or
                    android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        startActivity(intent)
        finish()
    }

    private fun dismissSilently() {
        stopSound()
        finish()
    }

    private fun stopSound() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        stopSound()
        timeoutHandler.removeCallbacksAndMessages(null)
    }

    override fun onBackPressed() {
        // Block back
    }
}