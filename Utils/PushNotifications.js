import { OneSignal } from "react-native-onesignal";
import { APP_ID_ONE_SIGNAL } from "../app/config/env";
import notifee, { AndroidImportance } from "@notifee/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TAG = "[PushNotifications]";

/* ─────────────────────────────────────────────────────────────────────────
   State
───────────────────────────────────────────────────────────────────────── */
let isInitialized      = false;
let listenersRegistered = false;
let _onVisitorPending  = null;

// In-memory dedup set — marks IDs instantly before any async operation
// Prevents race condition when multiple notifications arrive simultaneously
const handledInMemory = new Set();

export const setOnVisitorPending = (cb) => {
  _onVisitorPending = cb;
  console.log(TAG, "setOnVisitorPending → callback registered");
};

/* ─────────────────────────────────────────────────────────────────────────
   Dedup helpers
   TTL: 24 hours — long enough to cover any OneSignal retry window
───────────────────────────────────────────────────────────────────────── */
const VISITOR_HANDLED_KEY = "HANDLED_VISITORS";
const DEDUP_TTL_MS        = 24 * 60 * 60 * 1000; // 24 hours

const isAlreadyHandled = async (id) => {
  // Fast path: in-memory check (avoids AsyncStorage round-trip)
  if (handledInMemory.has(id)) {
    console.log(TAG, `isAlreadyHandled → ${id} found in MEMORY`);
    return true;
  }

  try {
    const raw  = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const now  = Date.now();
    const valid = list.filter((item) => now - item.time < DEDUP_TTL_MS);
    const found = valid.some((item) => item.id === id);
    console.log(TAG, `isAlreadyHandled → ${id} found in STORAGE: ${found}`);
    return found;
  } catch (e) {
    console.log(TAG, "isAlreadyHandled → storage error:", e);
    return false;
  }
};

const markHandled = async (id) => {
  // Mark in memory FIRST (synchronous, no await — prevents race condition)
  handledInMemory.add(id);
  console.log(TAG, `markHandled → ${id} marked in MEMORY`);

  try {
    const raw   = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    let   list  = raw ? JSON.parse(raw) : [];
    const now   = Date.now();

    // Prune old entries
    list = list.filter((item) => now - item.time < DEDUP_TTL_MS);
    list.push({ id, time: now });

    await AsyncStorage.setItem(VISITOR_HANDLED_KEY, JSON.stringify(list));
    console.log(TAG, `markHandled → ${id} saved to STORAGE, list size=${list.length}`);
  } catch (e) {
    console.log(TAG, "markHandled → storage error:", e);
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Notifee channel
───────────────────────────────────────────────────────────────────────── */
const initNotifee = async () => {
  await notifee.requestPermission();
  await notifee.createChannel({
    id:         "visitor",
    name:       "Visitor Alerts",
    importance: AndroidImportance.HIGH,
    sound:      "visitor_alert",
  });
  console.log(TAG, "initNotifee → channel created");
};

/* ─────────────────────────────────────────────────────────────────────────
   Extract visitor from OneSignal additionalData
───────────────────────────────────────────────────────────────────────── */
const extractVisitor = (additionalData) => {
  if (!additionalData) {
    console.log(TAG, "extractVisitor → additionalData is null");
    return null;
  }

  console.log(TAG, "extractVisitor → raw:", JSON.stringify(additionalData));

  // Handle nested "data" key
  const d = additionalData.data || additionalData;

  const visitor = {
    id:          d.id          || d.visitor_id    || "",
    name:        d.visitor_name                   || "Visitor",
    phoneNumber: d.visitor_phone_no || d.visitor_phone || "",
    photo:       d.visitor_img  || d.visitor_photo || "",
    purpose:     d.visit_purpose                  || "",
    startTime:   d.visit_start_time               || "",
  };

  console.log(TAG, "extractVisitor → extracted:", JSON.stringify(visitor));

  if (!visitor.id) {
    console.log(TAG, "extractVisitor → id is empty, returning null");
    return null;
  }

  return visitor;
};

/* ─────────────────────────────────────────────────────────────────────────
   Show Notifee notification (FOREGROUND ONLY)
   Called by OneSignal foregroundWillDisplay handler.
───────────────────────────────────────────────────────────────────────── */
export const showVisitorNotification = async (visitor) => {
  console.log(TAG, `showVisitorNotification → id=${visitor.id} name=${visitor.name}`);

  // ── Step 1: memory check (fast path) ──────────────────────────────
  if (handledInMemory.has(visitor.id)) {
    console.log(TAG, `showVisitorNotification → SKIPPED (memory): ${visitor.id}`);
    return;
  }
  handledInMemory.add(visitor.id); // claim slot immediately
  console.log(TAG, `showVisitorNotification → claimed memory slot for ${visitor.id}`);

  // ── Step 2: storage check ONLY (do NOT call isAlreadyHandled here) ─
  // isAlreadyHandled checks memory first — would find the slot we just
  // claimed above and incorrectly block the notification.
  try {
    const raw   = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    let   list  = raw ? JSON.parse(raw) : [];
    const now   = Date.now();

    // Prune old entries
    list = list.filter((item) => now - item.time < DEDUP_TTL_MS);

    if (list.some((item) => item.id === visitor.id)) {
      console.log(TAG, `showVisitorNotification → SKIPPED (storage): ${visitor.id}`);
      // Keep in memory — no need to show again this session
      return;
    }

    // Mark as handled in storage
    list.push({ id: visitor.id, time: now });
    await AsyncStorage.setItem(VISITOR_HANDLED_KEY, JSON.stringify(list));
    console.log(TAG, `showVisitorNotification → marked in storage, list size=${list.length}`);

  } catch (e) {
    console.log(TAG, "showVisitorNotification → storage error:", e);
    handledInMemory.delete(visitor.id); // allow retry on storage error
    return;
  }

  // ── Step 3: show the notification ─────────────────────────────────
  try {
    console.log(TAG, `showVisitorNotification → displaying notification for ${visitor.id}`);

    await notifee.displayNotification({
      id:    String(visitor.id),
      title: "🚪 Visitor at Gate",
      body:  `${visitor.name} (${visitor.phoneNumber}) — ${visitor.purpose || "Visit"}`,
      android: {
        channelId:   "visitor",
        importance:  AndroidImportance.HIGH,
        sound:       "default",
        pressAction: { id: "default" },
        actions: [
          { title: "✅ Accept",  pressAction: { id: "accept"  } },
          { title: "❌ Decline", pressAction: { id: "decline" } },
        ],
      },
      data: {
        visitor: JSON.stringify(visitor),
      },
    });

    console.log(TAG, `showVisitorNotification → notification displayed for ${visitor.id}`);
  } catch (e) {
    console.log(TAG, "showVisitorNotification → display error:", e);
    handledInMemory.delete(visitor.id); // allow retry on display error
  }
};


/* ─────────────────────────────────────────────────────────────────────────
   initializeOneSignal — call once from App.js
───────────────────────────────────────────────────────────────────────── */
const initializeOneSignal = async () => {
  if (isInitialized) {
    console.log(TAG, "initializeOneSignal → already initialized, skipping");
    return;
  }
  isInitialized = true;

  console.log(TAG, "initializeOneSignal → starting");
  await initNotifee();

  OneSignal.initialize(APP_ID_ONE_SIGNAL);
  OneSignal.Notifications.requestPermission(true);

  if (listenersRegistered) {
    console.log(TAG, "initializeOneSignal → listeners already registered, skipping");
    return;
  }
  listenersRegistered = true;

  /* ──────────────────────────────────────────────────────────────────────
     🟢 FOREGROUND — intercept and show Notifee notification
     This fires ONLY when the app is in foreground.
     Background/killed is handled by MyNotificationServiceExtension (native).
  ────────────────────────────────────────────────────────────────────── */
  OneSignal.Notifications.addEventListener(
    "foregroundWillDisplay",
    async (event) => {
      try {
        const notification = event.getNotification();
        console.log(TAG, `foregroundWillDisplay → title='${notification.title}'`);
        console.log(TAG, "foregroundWillDisplay → additionalData:", JSON.stringify(notification.additionalData));

        if (notification.title !== "Add Visit") {
          console.log(TAG, "foregroundWillDisplay → not a visitor notification, displaying normally");
          event.getNotification().display();
          return;
        }

        // Stop OneSignal banner — we show Notifee instead
        event.preventDefault();
        console.log(TAG, "foregroundWillDisplay → prevented OneSignal banner");

        const visitor = extractVisitor(notification.additionalData);

        if (!visitor) {
          console.log(TAG, "foregroundWillDisplay → no valid visitor, showing fallback");
          event.getNotification().display();
          return;
        }

        await showVisitorNotification(visitor);
      } catch (e) {
        console.log(TAG, "foregroundWillDisplay → ERROR:", e);
        try { event.getNotification().display(); } catch (_) {}
      }
    }
  );

  /* ──────────────────────────────────────────────────────────────────────
     🔵 CLICK — user taps the OneSignal notification body (no action button)
     This fires when user taps the notification from background / notification tray.
     Note: Accept/Decline actions are handled by Notifee in App.js.
  ────────────────────────────────────────────────────────────────────── */
  OneSignal.Notifications.addEventListener("click", async (event) => {
    try {
      const notification = event.notification;
      console.log(TAG, `click → title='${notification.title}'`);

      if (notification.title !== "Add Visit") {
        console.log(TAG, "click → not a visitor notification, ignoring");
        return;
      }

      const visitor = extractVisitor(notification.additionalData);
      console.log(TAG, "click → visitor:", JSON.stringify(visitor));

      if (visitor && _onVisitorPending) {
        console.log(TAG, `click → calling _onVisitorPending for ${visitor.id}`);
        _onVisitorPending(visitor);
      } else {
        console.log(TAG, "click → no visitor or no callback registered");
      }
    } catch (e) {
      console.log(TAG, "click → ERROR:", e);
    }
  });

  console.log(TAG, "initializeOneSignal → all listeners registered");
};

export default initializeOneSignal;