package com.isocietymanager

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.preference.PreferenceManager
import android.view.WindowManager
import android.widget.Button
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import org.json.JSONObject
import java.net.URL
import kotlin.concurrent.thread

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

        setContentView(R.layout.activity_visitor_incoming)

        // --- Extract data ---
        val visitorId    = intent.getStringExtra("visitor_id") ?: ""
        val visitorName  = intent.getStringExtra("visitor_name") ?: "Visitor"
        val visitorPhone = intent.getStringExtra("visitor_phone") ?: ""
        val visitorPhoto = intent.getStringExtra("visitor_photo") ?: ""
        val purpose      = intent.getStringExtra("visit_purpose") ?: ""
        val startTime    = intent.getStringExtra("visit_start_time") ?: ""

        // --- UI Text Setup ---
        findViewById<TextView>(R.id.tvVisitorName)?.text = visitorName
        findViewById<TextView>(R.id.tvVisitorPhone)?.text =
            visitorPhone.ifEmpty { "—" }

        findViewById<TextView>(R.id.tvVisitPurpose)?.text =
            if (purpose.isNotEmpty()) "Purpose: $purpose"
            else "Purpose: Not specified"

        // --- Fetch & Show Photo (Background Thread) ---
        if (visitorPhoto.isNotEmpty()) {
            val ivPhoto = findViewById<ImageView>(R.id.ivVisitorPhoto)
            ivPhoto?.let {
              thread {
    try {
        val connection = URL(visitorPhoto).openConnection()
        connection.connectTimeout = 5_000  // 5s timeout — won't hang forever
        connection.readTimeout = 5_000
        val bmp = BitmapFactory.decodeStream(connection.getInputStream())
        runOnUiThread {
            if (!isDestroyed) {           // ← guard against dead Activity
                it.setImageBitmap(bmp)
                it.visibility = View.VISIBLE
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
            }
        }

        // --- Sound or Vibrate ---
        playRingtoneOrVibrate()

        // --- Auto dismiss (Stop ringing after 60s) ---
        timeoutHandler.postDelayed({ dismissSilently() }, AUTO_DISMISS_MS)


        /* ======================================================
           BUTTON LISTENERS
        ====================================================== */
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

            val prefs = PreferenceManager.getDefaultSharedPreferences(this)
            prefs.edit().putString("PENDING_VISITOR", visitorJson.toString()).commit()
            
            openMainApp()
        }
    }

    /* ======================================================
       HANDLE ACCEPT / DECLINE ACTIONS
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

        val prefs = PreferenceManager.getDefaultSharedPreferences(this)
        prefs.edit()
            .putString("PENDING_VISITOR_ACTION", pendingAction.toString())
            .commit() 

        openMainApp()
    }

    /* ======================================================
       OPEN MAIN APP
    ====================================================== */
    private fun openMainApp() {
        stopRingtoneAndVibration()

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        startActivity(intent)
        finish() 
    }

    private fun dismissSilently() {
        stopRingtoneAndVibration()
        finish()
    }

    /* ======================================================
       VIBRATOR HELPER (Handles API 31+ Deprecation safely)
    ====================================================== */
    private fun getDeviceVibrator(): Vibrator {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    /* ======================================================
       RINGTONE OR VIBRATE (Respects User Settings)
    ====================================================== */
    private fun playRingtoneOrVibrate() {
        try {
            val prefs = PreferenceManager.getDefaultSharedPreferences(this)
            // Defaults to true if the user hasn't touched the settings yet
            val isSoundEnabled = prefs.getString("NATIVE_SOUND_ENABLED", "true") == "true"

            if (isSoundEnabled) {
                // 🔊 PLAY SOUND
                val uri = Uri.parse("android.resource://$packageName/${R.raw.visitor_alert}")

                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    setDataSource(applicationContext, uri)
                    isLooping = true 
                    prepare()
                    start()
                }
            } else {
                // 📳 VIBRATE INSTEAD (Pattern matches your React Native screen)
                val vibrator = getDeviceVibrator()
                val pattern = longArrayOf(0, 500, 200, 500)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Modern Android
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0)) // 0 = loop until cancelled
                } else {
                    // Older Android
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(pattern, 0)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopRingtoneAndVibration() {
        try {
            // 1. Stop Sound
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null

            // 2. Stop Vibration
            val vibrator = getDeviceVibrator()
            vibrator.cancel()
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRingtoneAndVibration()
        timeoutHandler.removeCallbacksAndMessages(null)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Block back press
    }
}