package com.sumasamu.iSocietyManager

import android.content.Context          // ← THIS WAS MISSING (compile error)
import android.util.Log
import com.facebook.react.bridge.*

/**
 * VisitorModule — SharedPrefs bridge between native and React Native.
 *
 * Since Accept/Decline is now handled directly in VisitorIncomingActivity (Kotlin),
 * getPendingAction is REMOVED. Only getPendingVisitorView is needed (for the
 * "View Details" button flow).
 *
 * Keys (all in "VisitorPrefs" file):
 *   PENDING_VISITOR  → JSON { id, name } — written when user taps "View Details"
 *
 * Keys (in "VisitorAuth" file):
 *   apiToken, userId, societyId, roleId, unitId, flatNo
 *   — written by saveAuthDetails on login, read by VisitorIncomingActivity
 */
class VisitorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG        = "VisitorModule"
        private const val PREFS_NAME = "VisitorPrefs"
        private const val KEY_VISITOR = "PENDING_VISITOR"
    }

    override fun getName() = "VisitorModule"

    private val prefs
        get() = reactApplicationContext.getSharedPreferences(PREFS_NAME, 0)

    /* ─────────────────────────────────────────────────────────────────────
       saveAuthDetails
       Call this from RN on every login so VisitorIncomingActivity
       can make API calls while the app is in the background/killed.
    ───────────────────────────────────────────────────────────────────── */
    @ReactMethod
    fun saveAuthDetails(data: ReadableMap, promise: Promise) {
        try {
            reactApplicationContext
                .getSharedPreferences("VisitorAuth", Context.MODE_PRIVATE)
                .edit()
                .putString("apiToken",  data.getString("apiToken"))
                .putString("userId",    data.getString("userId"))
                .putString("societyId", data.getString("societyId"))
                .putString("roleId",    data.getString("roleId"))
                .putString("unitId",    data.getString("unitId"))
                .putString("flatNo",    data.getString("flatNo"))
                .apply()

            Log.d(TAG, "saveAuthDetails → saved to VisitorAuth")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "saveAuthDetails → ERROR: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
       getPendingVisitorView
       Written by VisitorIncomingActivity when user taps "View Details".
       One-shot: cleared immediately after reading.
    ───────────────────────────────────────────────────────────────────── */
    @ReactMethod
    fun getPendingVisitorView(promise: Promise) {
        try {
            val value = prefs.getString(KEY_VISITOR, null)
            Log.d(TAG, "getPendingVisitorView → ${if (value != null) "FOUND" else "null"}")

            if (value != null) {
                prefs.edit().remove(KEY_VISITOR).apply()
                promise.resolve(value)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "getPendingVisitorView → ERROR: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
       clearAll — call on logout
    ───────────────────────────────────────────────────────────────────── */
    @ReactMethod
fun clearAll(promise: Promise) {
    try {
        // Purge ALL keys in VisitorPrefs (future-proofs the logout logic)
        prefs.edit().clear().apply()

        // Purge ALL keys in VisitorAuth
        reactApplicationContext
            .getSharedPreferences("VisitorAuth", Context.MODE_PRIVATE)
            .edit().clear().apply()

        Log.d(TAG, "clearAll → done")
        promise.resolve(true)
    } catch (e: Exception) {
        Log.e(TAG, "clearAll → ERROR: ${e.message}")
        promise.reject("ERROR", e.message)
    }
}

    /* ─────────────────────────────────────────────────────────────────────
       debugDump — dev utility
    ───────────────────────────────────────────────────────────────────── */
    @ReactMethod
    fun debugDump(promise: Promise) {
        try {
            val visitor = prefs.getString(KEY_VISITOR, null)
            val dump    = "VISITOR=${visitor ?: "null"}"
            Log.d(TAG, "debugDump → $dump")
            promise.resolve(dump)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}