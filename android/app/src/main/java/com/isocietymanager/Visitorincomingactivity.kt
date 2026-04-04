package com.sumasamu.iSocietyManager

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.graphics.BitmapFactory
import android.media.MediaPlayer
import android.net.Uri
import android.os.*
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.*
import org.json.JSONObject
import java.net.URL
import kotlin.concurrent.thread
import android.content.Intent

class VisitorIncomingActivity : Activity() {

    companion object {
        private const val TAG = "VisitorIncomingActivity"
        private const val PREFS_NAME = "VisitorPrefs"
        private const val KEY_VISITOR = "PENDING_VISITOR"
        private const val AUTO_DISMISS_MS = 60_000L
        private const val NOTIF_ID = 1001
    }

    private var mediaPlayer: MediaPlayer? = null
    private val timeoutHandler = Handler(Looper.getMainLooper())

    private var visitorId = ""
    private var visitorName = "Visitor"
    private var visitorPhone = ""
    private var visitorPhoto = ""
    private var purpose = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Log.d(TAG, "onCreate → Activity started")

        setupWindowFlags()

        (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)
            ?.cancel(NOTIF_ID)

        setContentView(R.layout.activity_visitor_incoming)

        extractIntent(intent)

        Log.d(TAG, "Visitor Data → id=$visitorId name=$visitorName phone=$visitorPhone")

        if (visitorId.isEmpty()) {
            Log.e(TAG, "visitorId empty → finishing")
            finish()
            return
        }

        bindUI()
        loadPhoto()
        playSoundOrVibrate()

        timeoutHandler.postDelayed({
            Log.d(TAG, "Auto dismiss triggered")
            dismissSilently()
        }, AUTO_DISMISS_MS)

        bindButtons()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        Log.d(TAG, "onNewIntent triggered")

        val newVisitorId = intent.getStringExtra("visitor_id") ?: ""
        if (newVisitorId.isEmpty() || newVisitorId == visitorId) return

        extractIntent(intent)

        Log.d(TAG, "Updated Visitor → id=$visitorId")

        bindUI()
        loadPhoto()
        resetButtons()
    }

    private fun extractIntent(intent: Intent) {
        visitorId    = intent.getStringExtra("visitor_id") ?: ""
        visitorName  = intent.getStringExtra("visitor_name") ?: "Visitor"
        visitorPhone = intent.getStringExtra("visitor_phone") ?: ""
        visitorPhoto = intent.getStringExtra("visitor_photo") ?: ""
        purpose      = intent.getStringExtra("visit_purpose") ?: ""
    }

    private fun setupWindowFlags() {
        Log.d(TAG, "Setting window flags")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
    }

    /* 🔥 API CALL WITH FULL LOGS */
 

    private fun callVisitorApi(action: String) {
    Log.d(TAG, "callVisitorApi → action=$action visitorId=$visitorId")

    thread {
        try {
            val prefs = getSharedPreferences("VisitorAuth", Context.MODE_PRIVATE)

            val apiToken  = prefs.getString("apiToken", "") ?: ""
            val userId    = prefs.getString("userId", "") ?: ""
            val societyId = prefs.getString("societyId", "") ?: ""
            val roleId    = prefs.getString("roleId", "") ?: ""
            val unitId    = prefs.getString("unitId", "") ?: ""
            val flatNo    = prefs.getString("flatNo", "") ?: ""

            Log.d(TAG, "Auth → apiToken=$apiToken userId=$userId societyId=$societyId")

            if (apiToken.isEmpty() || userId.isEmpty() || societyId.isEmpty()) {
                Log.e(TAG, "Auth missing")
                runOnUiThread { showError("Session expired ❌") }
                return@thread
            }

            // ✅ CORRECT user-id JSON
            val userIdObj = JSONObject().apply {
                put("user_id", userId)
                put("group_id", roleId)
                put("flat_no", flatNo)
                put("unit_id", unitId)
                put("society_id", societyId)
            }

            val userIdStr = userIdObj.toString().replace("\"", "%22")

            val url = "https://vms-api.isocietymanager.com/v1/society/$societyId/allowVisit" +
                    "?api-token=$apiToken&user-id=$userIdStr"

            val allow = if (action == "ACCEPT") 1 else 0

            val json = JSONObject().apply {
                put("allow", allow)
                put("visitId", visitorId)
            }

            Log.d(TAG, "👉 FINAL URL → $url")
            Log.d(TAG, "👉 HEADER user-id → ${userIdObj.toString()}")
            Log.d(TAG, "👉 BODY → $json")

            val conn = URL(url).openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("api-token", apiToken)
            conn.setRequestProperty("user-id", userIdObj.toString())
            conn.doOutput = true

            conn.outputStream.use {
                it.write(json.toString().toByteArray())
            }

            val responseCode = conn.responseCode

            val responseText = try {
                conn.inputStream.bufferedReader().use { it.readText() }
            } catch (e: Exception) {
                conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "No response body"
            }

            Log.d(TAG, "✅ RESPONSE CODE → $responseCode")
            Log.d(TAG, "✅ RESPONSE BODY → $responseText")

            runOnUiThread {
                if (responseCode in 200..299) {
                    Log.d(TAG, "SUCCESS → Visitor $action")

                    Toast.makeText(
                        this,
                        if (action == "ACCEPT") "✅ Visitor Allowed"
                        else "❌ Visitor Denied",
                        Toast.LENGTH_LONG
                    ).show()

                    Handler(Looper.getMainLooper()).postDelayed({
                        finish()
                    }, 1000)

                } else {
                    Log.e(TAG, "FAILED → $responseText")
                    showError("Failed ❌ ($responseCode)")
                }
            }

        } catch (e: Exception) {
            Log.e(TAG, "API ERROR → ${e.message}")
            runOnUiThread { showError("Network error ❌") }
        }
    }
}

    private fun showError(msg: String) {
        Log.e(TAG, "showError → $msg")

        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
        resetButtons()
    }

    private fun resetButtons() {
        Log.d(TAG, "Resetting buttons")

        findViewById<Button>(R.id.btnAccept)?.apply {
            isEnabled = true
            text = "Accept"
        }
        findViewById<Button>(R.id.btnDecline)?.apply {
            isEnabled = true
            text = "Decline"
        }
        findViewById<ProgressBar>(R.id.loader)?.visibility = View.GONE
    }

    private fun bindUI() {
        Log.d(TAG, "Binding UI")

        findViewById<TextView>(R.id.tvVisitorName)?.text = visitorName
        findViewById<TextView>(R.id.tvVisitorPhone)?.text =
            visitorPhone.ifEmpty { "—" }
        findViewById<TextView>(R.id.tvVisitPurpose)?.text =
            if (purpose.isNotEmpty()) "Purpose: $purpose" else "Purpose: Not specified"
    }

    private fun loadPhoto() {
        if (visitorPhoto.isEmpty()) {
            Log.d(TAG, "No photo")
            return
        }

        Log.d(TAG, "Loading photo")

        val iv = findViewById<ImageView>(R.id.ivVisitorPhoto) ?: return

        thread {
            try {
                val bmp = BitmapFactory.decodeStream(URL(visitorPhoto).openStream())
                runOnUiThread {
                    if (!isDestroyed) {
                        iv.setImageBitmap(bmp)
                        iv.visibility = View.VISIBLE
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Image load failed")
            }
        }
    }

    private fun bindButtons() {
        Log.d(TAG, "Binding buttons")

        findViewById<Button>(R.id.btnAccept)?.setOnClickListener {
            Log.d(TAG, "ACCEPT clicked")
            handleAction("ACCEPT")
        }

        findViewById<Button>(R.id.btnDecline)?.setOnClickListener {
            Log.d(TAG, "DECLINE clicked")
            handleAction("DECLINE")
        }

        findViewById<Button>(R.id.btnViewVisitor)?.setOnClickListener {
            Log.d(TAG, "VIEW clicked")
            savePendingVisitorView()
            finish()
        }
    }

    private fun handleAction(action: String) {
        Log.d(TAG, "handleAction → $action")

        stopSound()
        timeoutHandler.removeCallbacksAndMessages(null)

        findViewById<Button>(R.id.btnAccept)?.isEnabled = false
        findViewById<Button>(R.id.btnDecline)?.isEnabled = false
        findViewById<ProgressBar>(R.id.loader)?.visibility = View.VISIBLE

        callVisitorApi(action)
    }

    private fun savePendingVisitorView() {
        Log.d(TAG, "Saving visitor for RN navigation")

        val json = JSONObject().apply {
            put("id", visitorId)
            put("name", visitorName)
        }

        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_VISITOR, json.toString())
            .apply()
    }

    private fun playSoundOrVibrate() {
        try {
            Log.d(TAG, "Playing sound")

            val uri = Uri.parse("android.resource://$packageName/raw/visitor_alert")

            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sound error: ${e.message}")
        }
    }

    private fun stopSound() {
        Log.d(TAG, "Stopping sound")
        mediaPlayer?.release()
        mediaPlayer = null
    }

    private fun dismissSilently() {
        Log.d(TAG, "Dismiss silently")
        stopSound()
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "onDestroy")
        stopSound()
        timeoutHandler.removeCallbacksAndMessages(null)
    }

    override fun onBackPressed() {
        Log.d(TAG, "Back pressed blocked")
    }
}