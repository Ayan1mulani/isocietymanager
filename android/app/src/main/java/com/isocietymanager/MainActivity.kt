package com.sumasamu.iSocietyManager

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "isocietymanager"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    // ── Foreground tracking for MyNotificationServiceExtension ──────────
  override fun onResume() {
    super.onResume()
    AppState.isInForeground = true
    android.util.Log.d("AppState", "App → FOREGROUND")
}

override fun onStop() {
    super.onStop()
    AppState.isInForeground = false
    android.util.Log.d("AppState", "App → BACKGROUND")
}
}