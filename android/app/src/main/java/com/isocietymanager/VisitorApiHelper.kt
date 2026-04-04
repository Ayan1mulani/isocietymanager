package com.sumasamu.iSocietyManager

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.net.URL

/**
 * Single source of truth for the visitor allow/deny API call.
 *
 * Used by:
 *  - VisitorIncomingActivity  (user taps Accept/Decline inside the full-screen UI)
 *  - VisitorActionReceiver    (user taps Accept/Decline directly on the notification)
 *
 * Having one shared implementation means a URL change, header fix, or auth
 * tweak only needs to be made in ONE place.
 */
object VisitorApiHelper {

    private const val TAG     = "VisitorApiHelper"
    private const val BASE    = "https://vms-api.isocietymanager.com/v1/society"
    private const val TIMEOUT = 15_000

    data class ApiResult(
        val success: Boolean,
        val code:    Int,       // HTTP status code, or -1 on network error
        val message: String     // human-readable result for UI / logs
    )

    /**
     * Calls POST /society/{societyId}/allowVisit synchronously.
     *
     * MUST be called from a background thread — this is a blocking network call.
     *
     * @param context  Any context — used only to read SharedPreferences.
     * @param action   "ACCEPT" or "DECLINE"
     * @param visitorId  The visit ID from the push payload.
     */
    fun call(context: Context, action: String, visitorId: String): ApiResult {

        // ── 1. Read auth from SharedPreferences ──────────────────────────────────
        val prefs = context.getSharedPreferences("VisitorAuth", Context.MODE_PRIVATE)

        val apiToken   = prefs.getString("apiToken",   "").orEmpty()
        val userId     = prefs.getString("userId",     "").orEmpty()
        val societyId  = prefs.getString("societyId",  "").orEmpty()
        val roleId     = prefs.getString("roleId",     "").orEmpty()
        val unitId     = prefs.getString("unitId",     "").orEmpty()
        val flatNo     = prefs.getString("flatNo",     "").orEmpty()
        // React Native side must write this when it saves the token:
        //   SharedPreferences("VisitorAuth").edit().putLong("tokenSavedAt", System.currentTimeMillis()).commit()
        val tokenSavedAt = prefs.getLong("tokenSavedAt", 0L)

        Log.d(TAG, "Auth → userId=$userId societyId=$societyId action=$action visitId=$visitorId")

        // ── Guard: missing auth ───────────────────────────────────────────────────
        if (apiToken.isEmpty() || userId.isEmpty() || societyId.isEmpty()) {
            Log.e(TAG, "Auth data missing")
            return ApiResult(
                success = false,
                code    = -1,
                message = "Session expired. Please open the app and login again."
            )
        }

        // ── Guard: stale token (warn after 20 days — adjust to your server's TTL) ─
        // This does NOT block the call — the server is the source of truth.
        // We just log a warning so you can see it in Logcat if 401s start appearing.
        if (tokenSavedAt > 0L) {
            val ageDays = (System.currentTimeMillis() - tokenSavedAt) / (1000 * 60 * 60 * 24)
            if (ageDays >= 20) {
                Log.w(TAG, "⚠️ Token is $ageDays days old — may be expired. User should reopen the app.")
            } else {
                Log.d(TAG, "Token age → ${ageDays}d (ok)")
            }
        }

        // ── 2. Build user-id JSON (sent as both query param and header) ──────────
        val userIdObj = JSONObject().apply {
            put("user_id",    userId)
            put("group_id",   roleId)
            put("flat_no",    flatNo)
            put("unit_id",    unitId)
            put("society_id", societyId)
        }

        // API gateway reads user-id from the query string (URL-encoded)
        // AND from the raw JSON header — both are required.
        val userIdUrlEncoded = userIdObj.toString().replace("\"", "%22")

        // ── 3. Build URL and request body ────────────────────────────────────────
        val url = "$BASE/$societyId/allowVisit" +
                "?api-token=$apiToken&user-id=$userIdUrlEncoded"

        val body = JSONObject().apply {
            put("allow",   if (action == "ACCEPT") 1 else 0)
            put("visitId", visitorId)
        }

        Log.d(TAG, "URL    → $url")
        Log.d(TAG, "Header → user-id: $userIdObj")
        Log.d(TAG, "Body   → $body")

        // ── 4. Execute HTTP POST ─────────────────────────────────────────────────
        return try {
            val conn = (URL(url).openConnection() as java.net.HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("api-token",    apiToken)
                setRequestProperty("user-id",      userIdObj.toString())
                doOutput       = true
                connectTimeout = TIMEOUT
                readTimeout    = TIMEOUT
            }

            conn.outputStream.use {
                it.write(body.toString().toByteArray(Charsets.UTF_8))
            }

            val code = conn.responseCode
            val responseText = try {
                conn.inputStream.bufferedReader().use { it.readText() }
            } catch (_: Exception) {
                conn.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
            }

            Log.d(TAG, "Response → $code : $responseText")

            if (code in 200..299) {
                ApiResult(
                    success = true,
                    code    = code,
                    message = if (action == "ACCEPT") "✅ Visitor Allowed" else "❌ Visitor Denied"
                )
            } else if (code == 401) {
                // Token expired on the server — user must reopen the app to re-authenticate
                Log.e(TAG, "401 Unauthorized — token expired")
                ApiResult(
                    success = false,
                    code    = 401,
                    message = "Session expired. Please open the iSociety Manager app and login again."
                )
            } else {
                ApiResult(
                    success = false,
                    code    = code,
                    message = "Request failed ($code). Please try again."
                )
            }

        } catch (e: Exception) {
            Log.e(TAG, "Network error → ${e.message}")
            ApiResult(
                success = false,
                code    = -1,
                message = "Network error. Please check your connection."
            )
        }
    }
}