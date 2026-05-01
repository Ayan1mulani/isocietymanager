package com.sumasamu.iSocietyManager

import android.app.Application
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                // ✅ Register our native VisitorModule bridge
                add(VisitorPackage())
            },
        )
    }

    // Cancels the visitor notification (and its sound) the instant
    // the screen turns off. nm.cancel() is the only way to stop
    // a system notification sound mid-play.
    private val screenOffReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != Intent.ACTION_SCREEN_OFF) return

            val prefs   = getSharedPreferences("notif_active", MODE_PRIVATE)
            val notifId = prefs.getInt("visitor_notif_id", -1)
            if (notifId == -1) return

            Log.d("MainApplication", "Screen OFF → cancelling visitor notification $notifId")
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).cancel(notifId)
            prefs.edit().remove("visitor_notif_id").apply()
        }
    }

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
        // Register globally so it works even when VisitorIncomingActivity is not open
        registerReceiver(screenOffReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
    }

    override fun onTerminate() {
        super.onTerminate()
        try { unregisterReceiver(screenOffReceiver) } catch (_: Exception) {}
    }
}