import AsyncStorage from '@react-native-async-storage/async-storage';
import { ismServices } from './ismServices';
import { otherServices } from './otherServices';

const CACHE_KEY = 'cached_user_settings';
const SAVE_COOLDOWN_MS = 5000;

// ✅ In-memory — synchronous, no AsyncStorage delay
let lastSavedAt = 0;

export const markSettingsSaved = () => {
  lastSavedAt = Date.now(); // synchronous, instant
};

export const wasSavedRecently = () => {
  return Date.now() - lastSavedAt < SAVE_COOLDOWN_MS; // synchronous, instant
};

// services/settingsCache.js — add this one helper
export const getCachedUser = async () => {
  try {
    const raw = await AsyncStorage.getItem('cached_user_settings');
    const cache = raw ? JSON.parse(raw) : null;
    return cache?.user || null;
  } catch {
    return null;
  }
};

// unchanged
export const fetchAndCacheSettings = async () => {
  try {
    const [userRes, soundRes] = await Promise.all([
      ismServices.getUserDetails(),
      otherServices.getNotificationSound()
    ]);

    let user = userRes?.status === "success" ? userRes.data : userRes?.id ? userRes : null;
    if (!user?.id) throw new Error("Invalid user");

    const sounds = Array.isArray(soundRes?.data) ? soundRes.data : [];

    const cache = {
      user,
      isAway: user.home_away === 1,
      ivrEnabled: user.ivr_enable === 1,
      primaryNumber: user.ivr_p || "",
      secondaryNumber: user.ivr_s || "",
      visitSound: sounds.find(i => i.name === "VISIT")?.switch === 1 ?? true,
      staffNotification: sounds.find(i => i.name === "STAFF")?.switch === 1 ?? true,
      cachedAt: Date.now()
    };

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    await AsyncStorage.setItem("notificationSoundSettings", JSON.stringify(sounds));

    return cache;
  } catch (e) {
    console.log("Cache fetch error:", e);
    return null;
  }
};

// unchanged
export const loadCachedSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};