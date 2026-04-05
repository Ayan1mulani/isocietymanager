/**
 * sessionHelper.js
 *
 * Single source of truth for saving and clearing session data.
 *
 * Import this in:
 *   - LoginScreen     → call saveSession() on login success
 *   - ProfileScreen   → call saveSession() on switch account success
 *                     → call clearSession() on logout
 *   - LoginScreen     → call clearSession() on session restore failure
 *
 * WHY THIS FILE EXISTS:
 *   Session data is written to TWO places:
 *     1. AsyncStorage           — read by React Native code
 *     2. Native SharedPreferences (VisitorAuth) — read by VisitorApiHelper
 *        when the app is killed and a visitor push arrives
 *
 *   Without clearing native SharedPreferences on logout, the old user's
 *   token stays forever in native storage → visitor Accept/Decline would
 *   use the wrong credentials even after the user logged out.
 *
 *   Without saving to native on account switch, the new user's push
 *   notifications would still call the API with the old user's token.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const { VisitorModule } = NativeModules;

// ─────────────────────────────────────────────────────────────────────────────
// Keys — all AsyncStorage keys written during a session, in one place.
// If you add a new key anywhere, add it here too.
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_KEYS = [
  'userInfo',
  'loginIdentity',
  'userDetails',
  'permissions',
  // add more here if needed
];

/**
 * Saves a logged-in user's session to both AsyncStorage and native storage.
 *
 * @param {object} user      — cleaned user object from login/switch response
 * @param {string} [identity] — email/phone used to log in (only pass on fresh login)
 */
export const saveSession = async (user, identity = null) => {
  // 1. AsyncStorage
  await AsyncStorage.setItem('userInfo', JSON.stringify(user));
  if (identity) {
    await AsyncStorage.setItem('loginIdentity', identity);
  }

  // 2. Native SharedPreferences — persists when app is killed
  if (VisitorModule?.saveAuthDetails) {
    await VisitorModule.saveAuthDetails({
      apiToken:  user.api_token                              || '',
      userId:    String(user.id                              || ''),
      societyId: String(user.societyId  || user.society_id  || ''),
      roleId:    String(user.role_id    || user.group_id     || ''),
      unitId:    String(user.unit_id                         || ''),
      flatNo:    String(user.flat_no                         || ''),
      // tokenSavedAt is written inside VisitorModule.saveAuthDetails on the native side
    });
    console.log('✅ saveSession → native auth saved for userId:', user.id);
  } else {
    console.warn('⚠️ saveSession → VisitorModule not available, native auth NOT saved');
  }
};

/**
 * Clears all session data from both AsyncStorage and native storage.
 * Call ONLY on logout.
 */
export const clearSession = async () => {
  // 1. Native SharedPreferences — AsyncStorage.clear() does NOT touch this
  if (VisitorModule?.clearAuthDetails) {
    await VisitorModule.clearAuthDetails();
    console.log('✅ clearSession → native VisitorAuth wiped');
  } else {
    console.warn('⚠️ clearSession → VisitorModule not available, native auth NOT cleared');
  }

  // 2. AsyncStorage — clear everything
  await AsyncStorage.clear();
  console.log('✅ clearSession → AsyncStorage cleared');
};