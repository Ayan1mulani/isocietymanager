package com.sumasamu.iSocietyManager

/**
 * AppState — simple singleton to track foreground/background state.
 * Set by MainActivity, read by MyNotificationServiceExtension.
 * Replaces the unreliable ActivityManager.runningAppProcesses check.
 */
object AppState {
    @Volatile
    var isInForeground: Boolean = false
}