package com.sumasamu.iSocietyManager

import android.util.Log
import com.facebook.react.bridge.*

/**
 * VisitorModule — SharedPreferences bridge between native and React Native.
 *
 * Keys (all in "VisitorPrefs" file):
 * ─────────────────────────────────
 * PENDING_VISITOR_ACTION   → JSON string { visitor: {...}, action: "ACCEPT"|"DECLINE" }
 * PENDING_VISITOR          → JSON string (visitor object — for view screen)
 *
 * All reads are ONE-SHOT: key is deleted immediately after reading.
 * This prevents stale data from firing twice.
 */
class VisitorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "VisitorModule"
        private const val PREFS_NAME = "VisitorPrefs"
        private const val KEY_ACTION = "PENDING_VISITOR_ACTION"
        private const val KEY_VISITOR = "PENDING_VISITOR"
    }

    override fun getName() = "VisitorModule"

    private val prefs
        get() = reactApplicationContext.getSharedPreferences(PREFS_NAME, 0)

    /* ─────────────────────────────────────────────────────────────────────
       getPendingAction
       Written by VisitorIncomingActivity when user taps Accept / Decline
       from lock-screen / background.
       JSON shape: { visitor: {...}, action: "ACCEPT"|"DECLINE" }
    ───────────────────────────────────────────────────────────────────── */
    @ReactMethod
    fun getPendingAction(promise: Promise) {
        try {
            val value = prefs.getString(KEY_ACTION, null)
            Log.d(TAG, "getPendingAction → value=${if (value != null) "FOUND" else "null"}")

            if (value != null) {
                prefs.edit().remove(KEY_ACTION).apply()
                Log.d(TAG, "getPendingAction → cleared from prefs, resolving: $value")
                promise.resolve(value)
            } else {
                Log.d(TAG, "getPendingAction → no pending action")
                promise.resolve(null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "getPendingAction → ERROR: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
       getPendingVisitorView
       Written by VisitorIncomingActivity when user taps "View" button
       or the notification body — opens VisitorApproval screen.
       JSON shape: visitor object.
    ───────────────────────────────────────────────────────────────────── */
    @ReactMethod
    fun getPendingVisitorView(promise: Promise) {
        try {
            val value = prefs.getString(KEY_VISITOR, null)
            Log.d(TAG, "getPendingVisitorView → value=${if (value != null) "FOUND" else "null"}")

            if (value != null) {
                prefs.edit().remove(KEY_VISITOR).apply()
                Log.d(TAG, "getPendingVisitorView → cleared from prefs, resolving: $value")
                promise.resolve(value)
            } else {
                Log.d(TAG, "getPendingVisitorView → no pending visitor view")
                promise.resolve(null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "getPendingVisitorView → ERROR: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
       clearAll — defensive utility, call on logout or after handling
    ───────────────────────────────────────────────────────────────────── */
    @ReactMethod
    fun clearAll(promise: Promise) {
        try {
            prefs.edit()
                .remove(KEY_ACTION)
                .remove(KEY_VISITOR)
                .apply()
            Log.d(TAG, "clearAll → all keys cleared")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "clearAll → ERROR: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
       debugDump — call from RN to log current prefs state (dev only)
    ───────────────────────────────────────────────────────────────────── */
    @ReactMethod
    fun debugDump(promise: Promise) {
        try {
            val action  = prefs.getString(KEY_ACTION, null)
            val visitor = prefs.getString(KEY_VISITOR, null)
            val dump    = "ACTION=${action ?: "null"} | VISITOR=${visitor ?: "null"}"
            Log.d(TAG, "debugDump → $dump")
            promise.resolve(dump)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}