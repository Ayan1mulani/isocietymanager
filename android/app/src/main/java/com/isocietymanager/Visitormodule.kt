package com.isocietymanager

import com.facebook.react.bridge.*

/**
 * React Native native module.
 *
 * All three methods use the SAME SharedPreferences file ("VisitorPrefs")
 * for consistency. Each key is cleared immediately after being read
 * (one-shot delivery) so stale data never fires twice.
 *
 * Keys
 * ────
 * has_pending_visitor       → Boolean  (getPendingVisitor gate)
 * pending_visitor_*         → String   (visitor fields for getPendingVisitor)
 * PENDING_VISITOR_ACTION    → String   (JSON: { visitor, action })
 * PENDING_VISITOR           → String   (JSON: visitor object for view)
 */
class VisitorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "VisitorModule"

    // ── Single prefs file used by every method ──────────────────────────────
    private val prefs
        get() = reactApplicationContext.getSharedPreferences("VisitorPrefs", 0)

    /* -----------------------------------------------------------------------
       getPendingVisitor
       Written by VisitorIncomingActivity when user taps from killed state.
    ----------------------------------------------------------------------- */
    @ReactMethod
    fun getPendingVisitor(promise: Promise) {
        try {
            if (!prefs.getBoolean("has_pending_visitor", false)) {
                promise.resolve(null)
                return
            }

            val map = Arguments.createMap().apply {
                putString("id",          prefs.getString("pending_visitor_id",        ""))
                putString("name",        prefs.getString("pending_visitor_name",       ""))
                putString("phoneNumber", prefs.getString("pending_visitor_phone",      ""))
                putString("photo",       prefs.getString("pending_visitor_photo",      ""))
                putString("purpose",     prefs.getString("pending_visitor_purpose",    ""))
                putString("startTime",   prefs.getString("pending_visitor_start_time", ""))
            }

            // One-shot — clear immediately after reading
            prefs.edit()
                .putBoolean("has_pending_visitor", false)
                .remove("pending_visitor_id")
                .remove("pending_visitor_name")
                .remove("pending_visitor_phone")
                .remove("pending_visitor_photo")
                .remove("pending_visitor_purpose")
                .remove("pending_visitor_start_time")
                .apply()

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("VISITOR_MODULE_ERROR", e.message)
        }
    }

    /* -----------------------------------------------------------------------
       getPendingAction
       Written by VisitorIncomingActivity when user taps Accept / Decline
       from lock screen.  JSON shape: { visitor: {...}, action: "ACCEPT"|"DENY" }
    ----------------------------------------------------------------------- */
    @ReactMethod
    fun getPendingAction(promise: Promise) {
        try {
            val value = prefs.getString("PENDING_VISITOR_ACTION", null)

            if (value != null) {
                prefs.edit().remove("PENDING_VISITOR_ACTION").apply() // one-shot
                promise.resolve(value)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /* -----------------------------------------------------------------------
       getPendingVisitorView
       Written by VisitorIncomingActivity when user taps the notification
       body (no action) — app should open VisitorApproval screen.
       JSON shape: visitor object.
    ----------------------------------------------------------------------- */
    @ReactMethod
    fun getPendingVisitorView(promise: Promise) {
        try {
            val value = prefs.getString("PENDING_VISITOR", null)

            if (value != null) {
                prefs.edit().remove("PENDING_VISITOR").apply() // one-shot
                promise.resolve(value)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /* -----------------------------------------------------------------------
       clearPendingVisitor  (utility — called defensively if needed)
    ----------------------------------------------------------------------- */
    @ReactMethod
    fun clearPendingVisitor(promise: Promise) {
        try {
            prefs.edit()
                .putBoolean("has_pending_visitor", false)
                .remove("pending_visitor_id")
                .remove("pending_visitor_name")
                .remove("pending_visitor_phone")
                .remove("pending_visitor_photo")
                .remove("pending_visitor_purpose")
                .remove("pending_visitor_start_time")
                .remove("PENDING_VISITOR_ACTION")
                .remove("PENDING_VISITOR")
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("VISITOR_MODULE_ERROR", e.message)
        }
    }
}