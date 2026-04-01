import { OneSignal } from "react-native-onesignal";
import { APP_ID_ONE_SIGNAL } from "../app/config/env";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";

let isInitialized = false;
let listenersRegistered = false;
let _onVisitorPending = null;

export const setOnVisitorPending = (cb) => {
  _onVisitorPending = cb;
};

/* -------------------------------------------------------
   CREATE NOTIFEE CHANNEL
------------------------------------------------------- */
const initNotifee = async () => {
  await notifee.requestPermission();
  await notifee.createChannel({
    id: "visitor",
    name: "Visitor Alerts",
    importance: AndroidImportance.HIGH,
    sound: "visitor_alert",
  });
};

/* -------------------------------------------------------
   EXTRACT VISITOR — handles nested "data" key from logs
------------------------------------------------------- */
const extractVisitor = (additionalData) => {
  if (!additionalData) return null;

  // From your logs: additionalData = { data: { id, visitor_name, ... }, view: "..." }
  const d = additionalData.data || additionalData;

  const visitor = {
    id: d.id || d.visitor_id || "",
    name: d.visitor_name || "Visitor",
    phoneNumber: d.visitor_phone_no || d.visitor_phone || "",
    photo: d.visitor_img || d.visitor_photo || "",
    purpose: d.visit_purpose || "",
    startTime: d.visit_start_time || "",
  };

  console.log("📦 Extracted visitor:", visitor);
  return visitor.id ? visitor : null;
};

/* -------------------------------------------------------
   SHOW NOTIFEE NOTIFICATION
------------------------------------------------------- */
const showVisitorNotification = async (visitor) => {
  try {
    console.log("🔔 Showing notifee notification for:", visitor.id);

    await notifee.displayNotification({
      id: String(visitor.id),
      title: "🚪 Visitor at Gate",
      body: `${visitor.name} (${visitor.phoneNumber}) - ${visitor.purpose || "Visit"}`,
      android: {
        channelId: "visitor",
        importance: AndroidImportance.HIGH,
        sound: "default",
        pressAction: { id: "default" },
        actions: [
          {
            title: "✅ Accept",
            pressAction: { id: "accept" },
          },
          {
            title: "❌ Decline",
            pressAction: { id: "decline" },
          },
        ],
        // Store visitor data for action handling
        data: { visitor: JSON.stringify(visitor) },
      },
      data: { visitor: JSON.stringify(visitor) },
    });

    console.log("✅ Notifee notification shown");
  } catch (e) {
    console.log("❌ Notifee display error:", e);
  }
};

/* -------------------------------------------------------
   INIT ONESIGNAL
------------------------------------------------------- */
const initializeOneSignal = async () => {
  if (isInitialized) return;
  isInitialized = true;

  await initNotifee();

  OneSignal.initialize(APP_ID_ONE_SIGNAL);
  OneSignal.Notifications.requestPermission(true);

  if (listenersRegistered) return;
  listenersRegistered = true;

  /* ============================================================
     🟢 FOREGROUND — intercept and show notifee notification
  ============================================================ */
  OneSignal.Notifications.addEventListener(
    "foregroundWillDisplay",
    async (event) => {
      try {
        const notification = event.getNotification();

        console.log("🔥 Foreground notification title:", notification.title);
        console.log("🔥 Additional data:", JSON.stringify(notification.additionalData));

        if (notification.title === "Add Visit") {
          // ✅ Stop OneSignal from showing its own banner
          event.preventDefault();

          const visitor = extractVisitor(notification.additionalData);

          if (visitor) {
            await showVisitorNotification(visitor);
          } else {
            console.log("⚠️ No valid visitor extracted — showing default");
            event.getNotification().display(); // fallback
          }
        } else {
          // Let OneSignal handle non-visitor notifications
          event.getNotification().display();
        }
      } catch (e) {
        console.log("❌ Foreground handler error:", e);
        // Always fallback so user doesn't miss notification
        try { event.getNotification().display(); } catch (_) {}
      }
    }
  );

  /* ============================================================
     🔵 CLICK — when user taps the notification
  ============================================================ */
  OneSignal.Notifications.addEventListener("click", async (event) => {
    try {
      const notification = event.notification;
      console.log("🖱️ Notification clicked:", notification.title);

      if (notification.title === "Add Visit") {
        const visitor = extractVisitor(notification.additionalData);
        console.log("👆 Notification tapped — visitor:", visitor?.id);

        if (visitor && _onVisitorPending) {
          _onVisitorPending(visitor);
        }
      }
    } catch (e) {
      console.log("❌ Click handler error:", e);
    }
  });
};

export default initializeOneSignal;