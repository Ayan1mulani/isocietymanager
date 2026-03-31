package com.isocietymanager

import com.facebook.react.bridge.*

/**
 * React Native native module.
 * App.js calls VisitorModule.getPendingVisitor() on mount.
 * If VisitorIncomingActivity saved a visitor (killed-state tap),
 * this returns it so App.js can call navigateToVisitor().
 */
class VisitorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "VisitorModule"

    @ReactMethod
    fun getPendingVisitor(promise: Promise) {
        try {
            val prefs = reactApplicationContext
                .getSharedPreferences("VisitorPrefs", 0)

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

            // Clear after reading — one-shot delivery
            prefs.edit().putBoolean("has_pending_visitor", false).apply()

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("VISITOR_MODULE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearPendingVisitor(promise: Promise) {
        try {
            reactApplicationContext
                .getSharedPreferences("VisitorPrefs", 0)
                .edit()
                .putBoolean("has_pending_visitor", false)
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("VISITOR_MODULE_ERROR", e.message)
        }
    }
}