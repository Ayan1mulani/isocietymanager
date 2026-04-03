import React, { useEffect, useRef } from "react";

import {
  View,
  ActivityIndicator,
  Text,
  StatusBar,
  StyleSheet,
  AppState,
  NativeModules,
  TextInput,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, { EventType } from "@notifee/react-native";
import NavigationPage from "./NavigationPage";
import BRAND from "./app/config";
import initializeOneSignal, { setOnVisitorPending } from "./Utils/PushNotifications";
import { RegisterAppOneSignal } from "./services/oneSignalService";
import { complaintService } from "./services/complaintService";
import { visitorServices } from "./services/visitorServices";
import { navigationRef } from "./NavigationService";
import { PermissionsProvider } from "./Utils/ConetextApi";

// ✅ Disable font scaling globally
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;


const { VisitorModule } = NativeModules;

const TAG = "[App]";

/* ═══════════════════════════════════════════════════════════════════════
   Dedup store — shared with PushNotifications.js via AsyncStorage
   In-memory Set prevents async race condition when multiple
   notifications arrive at the same time.
═══════════════════════════════════════════════════════════════════════ */
const handledInMemory     = new Set(); // module-level, lives for app session
const VISITOR_HANDLED_KEY = "HANDLED_VISITORS";
const DEDUP_TTL_MS        = 24 * 60 * 60 * 1000; // 24 hours

const isAlreadyHandled = async (id) => {
  if (handledInMemory.has(id)) {
    console.log(TAG, `isAlreadyHandled → ${id} found in MEMORY`);
    return true;
  }

  try {
    const raw   = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    const list  = raw ? JSON.parse(raw) : [];
    const now   = Date.now();
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
  // Mark in memory FIRST (synchronous — no await)
  handledInMemory.add(id);
  console.log(TAG, `markHandled → ${id} marked in MEMORY`);

  try {
    const raw  = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    let   list = raw ? JSON.parse(raw) : [];
    const now  = Date.now();

    list = list.filter((item) => now - item.time < DEDUP_TTL_MS);
    list.push({ id, time: now });

    await AsyncStorage.setItem(VISITOR_HANDLED_KEY, JSON.stringify(list));
    console.log(TAG, `markHandled → ${id} saved to STORAGE`);
  } catch (e) {
    console.log(TAG, "markHandled → storage error:", e);
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   Auth helpers
═══════════════════════════════════════════════════════════════════════ */
const AUTH_SCREENS  = ["Login", "OtpLoginScreen", "OtpLogin", "OtpVerify"];
const isUserLoggedIn = (route) => route && !AUTH_SCREENS.includes(route);

/* ═══════════════════════════════════════════════════════════════════════
   App component
═══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [processing, setProcessing] = React.useState(false);

  // Holds visitor object until navigation is ready and user is logged in
  const pendingVisitorRef = useRef(null);

  /* ─────────────────────────────────────────────────────────────────────
     tryNavigate — with retry loop
     Retries every 500ms up to 10 times (5 seconds total).
     Covers the case where nav is not ready or user is still on auth screen.
  ───────────────────────────────────────────────────────────────────── */
  const tryNavigate = async (attempts = 0) => {
    const visitor = pendingVisitorRef.current;
    if (!visitor) {
      console.log(TAG, "tryNavigate → no pending visitor, aborting");
      return;
    }

    console.log(TAG, `tryNavigate → attempt=${attempts} visitorId=${visitor.id}`);

    if (attempts > 10) {
      console.log(TAG, "tryNavigate → max attempts reached, giving up");
      pendingVisitorRef.current = null;
      return;
    }

    // ── Navigation ready check ───────────────────────────────────────
    if (!navigationRef.isReady()) {
      console.log(TAG, "tryNavigate → navigation not ready, retrying...");
      setTimeout(() => tryNavigate(attempts + 1), 500);
      return;
    }

    // ── Auth check ───────────────────────────────────────────────────
    const route = navigationRef.getCurrentRoute()?.name;
    console.log(TAG, `tryNavigate → current route='${route}'`);

    if (!isUserLoggedIn(route)) {
      console.log(TAG, "tryNavigate → user not logged in, retrying...");
      setTimeout(() => tryNavigate(attempts + 1), 500);
      return;
    }

    // ── Dedup: claim slot in memory BEFORE any await ─────────────────
    if (handledInMemory.has(visitor.id)) {
      console.log(TAG, `tryNavigate → ALREADY HANDLED (memory): ${visitor.id}`);
      pendingVisitorRef.current = null;
      return;
    }
    handledInMemory.add(visitor.id); // claim immediately

    if (await isAlreadyHandled(visitor.id)) {
      console.log(TAG, `tryNavigate → ALREADY HANDLED (storage): ${visitor.id}`);
      pendingVisitorRef.current = null;
      return;
    }

    // ── All checks passed — navigate ─────────────────────────────────
    await markHandled(visitor.id);
    pendingVisitorRef.current = null;

    console.log(TAG, `tryNavigate → navigating to VisitorNotificationMessage for ${visitor.id}`);
    navigationRef.navigate("VisitorNotificationMessage", { visitor });
  };

  /* ─────────────────────────────────────────────────────────────────────
     Load society config on startup
  ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      try {
        const user = await AsyncStorage.getItem("userInfo");
        if (!user) {
          console.log(TAG, "init → no user, skipping config load");
          return;
        }

        const existing = await AsyncStorage.getItem("SOCIETY_CONFIG");
        if (!existing) {
          console.log(TAG, "init → fetching society config");
          const res = await complaintService.getSocietyConfigNew();
          if (res) {
            await AsyncStorage.setItem("SOCIETY_CONFIG", JSON.stringify(res));
            console.log(TAG, "init → society config saved");
          }
        } else {
          console.log(TAG, "init → society config already cached");
        }
      } catch (e) {
        console.log(TAG, "init → ERROR:", e);
      }
    };

    init();
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     Init OneSignal
  ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const setup = async () => {
      console.log(TAG, "setup → initializing OneSignal");
      await initializeOneSignal();
      await RegisterAppOneSignal();

      // Called by PushNotifications.js when user taps a foreground Notifee notification body
      setOnVisitorPending((visitor) => {
        console.log(TAG, `onVisitorPending → received visitor ${visitor.id}`);
        pendingVisitorRef.current = visitor;
        tryNavigate();
      });

      console.log(TAG, "setup → OneSignal ready");
    };

    setup();
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     Notifee foreground events
     Handles:
       ACTION_PRESS → Accept / Decline button tapped on Notifee notification
       PRESS        → Notification body tapped
  ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        console.log(TAG, `notifee.onForegroundEvent → type=${type}`);

        const visitorStr =
          detail.notification?.data?.visitor ||
          detail.notification?.android?.data?.visitor;

        if (!visitorStr) {
          console.log(TAG, "notifee.onForegroundEvent → no visitor data, ignoring");
          return;
        }

        const visitor =
          typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;

        if (!visitor?.id) {
          console.log(TAG, "notifee.onForegroundEvent → visitor has no id, ignoring");
          return;
        }

        console.log(TAG, `notifee.onForegroundEvent → visitor.id=${visitor.id} action=${detail.pressAction?.id}`);

        // ── ACTION_PRESS: Accept or Decline button ─────────────────────
        if (type === EventType.ACTION_PRESS) {
          const isAccept = detail.pressAction.id === "accept";
          console.log(TAG, `notifee ACTION_PRESS → ${isAccept ? "ACCEPT" : "DECLINE"} for ${visitor.id}`);

          setProcessing(true);

          await Promise.all([
            isAccept
              ? visitorServices.acceptVisitor(visitor.id)
              : visitorServices.denyVisitor(visitor.id),
            new Promise((res) => setTimeout(res, 600)),
          ]);

          setProcessing(false);
          console.log(TAG, `notifee ACTION_PRESS → API call done, navigating to Visitors`);

          navigationRef.reset({
            index: 0,
            routes: [
              {
                name:  "MainApp",
                state: { index: 0, routes: [{ name: "Visitors" }] },
              },
            ],
          });

          return;
        }

        // ── PRESS: Notification body tapped ───────────────────────────
        if (type === EventType.PRESS) {
          console.log(TAG, `notifee PRESS → setting pendingVisitor ${visitor.id}`);
          pendingVisitorRef.current = visitor;
          tryNavigate();
        }
      } catch (e) {
        setProcessing(false);
        console.log(TAG, "notifee.onForegroundEvent → ERROR:", e);
      }
    });

    return unsubscribe;
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     Cold start (KILLED state)
     Reads PENDING_VISITOR from SharedPrefs — written by VisitorIncomingActivity
     when user tapped "View" button.

     Note: getPendingAction is NOT checked here. When the app is killed
     and relaunched, the AppState listener fires "active" shortly after
     mount, which handles getPendingAction. Checking both here and there
     would cause double processing.
  ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const checkColdStart = async () => {
      try {
        if (!VisitorModule) {
          console.log(TAG, "checkColdStart → VisitorModule not available");
          return;
        }

        // Small delay to ensure native module is fully initialized
        await new Promise((res) => setTimeout(res, 300));

        console.log(TAG, "checkColdStart → checking SharedPrefs");

        // Check for pending action first (Accept/Decline from lock screen)
        const actionStr = await VisitorModule.getPendingAction();
        console.log(TAG, `checkColdStart → getPendingAction: ${actionStr ?? "null"}`);

        if (actionStr) {
          const { visitor, action } = JSON.parse(actionStr);
          console.log(TAG, `checkColdStart → found action=${action} visitor=${visitor?.id}`);

          if (visitor?.id) {
            setProcessing(true);

            await visitorServices[
              action === "ACCEPT" ? "acceptVisitor" : "denyVisitor"
            ](visitor.id);

            setProcessing(false);
            console.log(TAG, "checkColdStart → action processed, navigating to Visitors");

            // Wait for navigation to be ready
            const waitAndNavigate = async (attempts = 0) => {
              if (attempts > 10) return;
              if (!navigationRef.isReady()) {
                setTimeout(() => waitAndNavigate(attempts + 1), 500);
                return;
              }
              navigationRef.reset({
                index: 0,
                routes: [
                  {
                    name:  "MainApp",
                    state: { index: 0, routes: [{ name: "Visitors" }] },
                  },
                ],
              });
            };

            waitAndNavigate();
            return; // Action handled — don't check visitor view
          }
        }

        // Check for pending visitor view (tapped "View" button)
        const visitorStr = await VisitorModule.getPendingVisitorView();
        console.log(TAG, `checkColdStart → getPendingVisitorView: ${visitorStr ?? "null"}`);

        if (visitorStr) {
          const visitor =
            typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;

          console.log(TAG, `checkColdStart → found visitor ${visitor.id}, queuing navigation`);
          pendingVisitorRef.current = visitor;
          tryNavigate();
        } else {
          console.log(TAG, "checkColdStart → nothing to handle");
        }
      } catch (e) {
        console.log(TAG, "checkColdStart → ERROR:", e);
      }
    };

    checkColdStart();
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     AppState: background → active
     Handles the case where user was in VisitorIncomingActivity (background state),
     tapped Accept/Decline/View, and the app came back to foreground.

     Flow:
       1. Check getPendingAction first (Accept/Decline)
       2. If found → call API → navigate to Visitors → STOP
       3. If not → check getPendingVisitorView (View button)
       4. If found → navigate to VisitorApproval screen
  ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;

      console.log(TAG, "AppState → active");

      try {
        if (!VisitorModule) {
          console.log(TAG, "AppState → VisitorModule not available");
          return;
        }

        // Wait for native SharedPrefs write to complete
        await new Promise((res) => setTimeout(res, 800));

        // ── Step 1: Check for Accept/Decline action ───────────────────
        const actionStr = await VisitorModule.getPendingAction();
        console.log(TAG, `AppState → getPendingAction: ${actionStr ?? "null"}`);

        if (actionStr) {
          const { visitor, action } = JSON.parse(actionStr);
          console.log(TAG, `AppState → action=${action} visitor=${visitor?.id}`);

          if (visitor?.id) {
            // Dedup check for actions too
            if (handledInMemory.has(visitor.id)) {
              console.log(TAG, `AppState → action SKIPPED (already handled in memory): ${visitor.id}`);
              return;
            }
            handledInMemory.add(visitor.id);

            setProcessing(true);

            await visitorServices[
              action === "ACCEPT" ? "acceptVisitor" : "denyVisitor"
            ](visitor.id);

            setProcessing(false);
            console.log(TAG, `AppState → action processed, navigating to Visitors`);

            navigationRef.reset({
              index: 0,
              routes: [
                {
                  name:  "MainApp",
                  state: { index: 0, routes: [{ name: "Visitors" }] },
                },
              ],
            });

            return; // Stop — don't check visitor view
          }
        }

        // ── Step 2: Check for visitor view ────────────────────────────
        const visitorStr = await VisitorModule.getPendingVisitorView();
        console.log(TAG, `AppState → getPendingVisitorView: ${visitorStr ?? "null"}`);

        if (visitorStr) {
          const visitor =
            typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;

          if (!visitor?.id) {
            console.log(TAG, "AppState → visitor has no id, ignoring");
            return;
          }

          // Dedup check
          if (handledInMemory.has(visitor.id)) {
            console.log(TAG, `AppState → visitor SKIPPED (already handled in memory): ${visitor.id}`);
            return;
          }

          console.log(TAG, `AppState → queuing visitor ${visitor.id} for navigation`);
          pendingVisitorRef.current = visitor;
          tryNavigate();
        } else {
          console.log(TAG, "AppState → nothing to handle");
        }
      } catch (e) {
        setProcessing(false);
        console.log(TAG, "AppState → ERROR:", e);
      }
    });

    return () => sub.remove();
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     UI
  ───────────────────────────────────────────────────────────────────── */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PermissionsProvider>
        <SafeAreaView
          style={[
            styles.safeArea,
            { backgroundColor: BRAND.COLORS.safeArea || BRAND.COLORS.background },
          ]}
        >
          <StatusBar barStyle="dark-content" />
          <NavigationPage />

          {processing && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#22C55E" />
              <Text style={styles.overlayText}>Processing request...</Text>
            </View>
          )}
        </SafeAreaView>
      </PermissionsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems:     "center",
    zIndex:         9999,
  },
  overlayText: {
    marginTop:  10,
    fontSize:   16,
    fontWeight: "bold",
  },
});