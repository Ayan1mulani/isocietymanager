import React, { useEffect, useRef } from "react";
import {
  View, ActivityIndicator, Text, StatusBar,
  StyleSheet, AppState, NativeModules, TextInput,
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

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;

const { VisitorModule } = NativeModules;

const TAG = "[App]";

/* ═══════════════════════════════════════════════════════════════════════
   Dedup store — prevents the same visitor notification firing twice
   (e.g. AppState fires + cold-start both run)
═══════════════════════════════════════════════════════════════════════ */
const handledInMemory     = new Set();
const VISITOR_HANDLED_KEY = "HANDLED_VISITORS";
const DEDUP_TTL_MS        = 24 * 60 * 60 * 1000; // 24 hours

const isAlreadyHandled = async (id) => {
  if (handledInMemory.has(id)) return true;
  try {
    const raw  = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const now  = Date.now();
    return list.filter(i => now - i.time < DEDUP_TTL_MS).some(i => i.id === id);
  } catch { return false; }
};

const markHandled = async (id) => {
  handledInMemory.add(id);
  try {
    const raw  = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    let list   = raw ? JSON.parse(raw) : [];
    const now  = Date.now();
    list = list.filter(i => now - i.time < DEDUP_TTL_MS);
    list.push({ id, time: now });
    await AsyncStorage.setItem(VISITOR_HANDLED_KEY, JSON.stringify(list));
  } catch {}
};

const AUTH_SCREENS   = ["Login", "OtpLoginScreen", "OtpLogin", "OtpVerify"];
const isUserLoggedIn = (route) => route && !AUTH_SCREENS.includes(route);

/* ═══════════════════════════════════════════════════════════════════════
   App
═══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [processing, setProcessing] = React.useState(false);
  const pendingVisitorRef = useRef(null);

  /* ── Navigate to VisitorNotificationMessage with retry ─────────────── */
  const tryNavigate = async (attempts = 0) => {
    const visitor = pendingVisitorRef.current;
    if (!visitor) return;

    if (attempts > 10) {
      pendingVisitorRef.current = null;
      return;
    }

    if (!navigationRef.isReady()) {
      setTimeout(() => tryNavigate(attempts + 1), 500);
      return;
    }

    const route = navigationRef.getCurrentRoute()?.name;
    if (!isUserLoggedIn(route)) {
      setTimeout(() => tryNavigate(attempts + 1), 500);
      return;
    }

    if (handledInMemory.has(visitor.id)) {
      pendingVisitorRef.current = null;
      return;
    }
    handledInMemory.add(visitor.id);

    if (await isAlreadyHandled(visitor.id)) {
      pendingVisitorRef.current = null;
      return;
    }

    await markHandled(visitor.id);
    pendingVisitorRef.current = null;

    console.log(TAG, `tryNavigate → navigating for visitor ${visitor.id}`);
    navigationRef.navigate("VisitorNotificationMessage", { visitor });
  };

  /* ── Load society config on startup ─────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      try {
        const user = await AsyncStorage.getItem("userInfo");
        if (!user) return;
        const existing = await AsyncStorage.getItem("SOCIETY_CONFIG");
        if (!existing) {
          const res = await complaintService.getSocietyConfigNew();
          if (res) await AsyncStorage.setItem("SOCIETY_CONFIG", JSON.stringify(res));
        }
      } catch (e) {
        console.log(TAG, "init error:", e);
      }
    };
    init();
  }, []);

  /* ── OneSignal init ──────────────────────────────────────────────────── */
  useEffect(() => {
    const setup = async () => {
      await initializeOneSignal();
      setOnVisitorPending((visitor) => {
        console.log(TAG, `onVisitorPending → ${visitor.id}`);
        pendingVisitorRef.current = visitor;
        tryNavigate();
      });
    };
    setup();
  }, []);

  /* ── Notifee FOREGROUND events ───────────────────────────────────────
     ACTION_PRESS (Accept/Decline button on Notifee notification) →
       app is FOREGROUND → RN calls the API directly (native activity
       is NOT shown in foreground).
     PRESS (notification body tapped) → navigate to visitor screen.
  ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        const visitorStr =
          detail.notification?.data?.visitor ||
          detail.notification?.android?.data?.visitor;

        if (!visitorStr) return;

        const visitor =
          typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;

        if (!visitor?.id) return;

        // Accept / Decline tapped on Notifee action button (app is FOREGROUND)
        // VisitorIncomingActivity is NOT used in foreground — RN handles it here.
        if (type === EventType.ACTION_PRESS) {
          const isAccept = detail.pressAction.id === "accept";
          console.log(TAG, `ACTION_PRESS → ${isAccept ? "ACCEPT" : "DECLINE"} visitor ${visitor.id}`);

          setProcessing(true);
          await Promise.all([
            isAccept
              ? visitorServices.acceptVisitor(visitor.id)
              : visitorServices.denyVisitor(visitor.id),
            new Promise(res => setTimeout(res, 600)),
          ]);
          setProcessing(false);

          navigationRef.reset({
            index: 0,
            routes: [{ name: "MainApp", state: { index: 0, routes: [{ name: "Visitors" }] } }],
          });
          return;
        }

        // Notification body tapped → navigate to visitor detail screen
        if (type === EventType.PRESS) {
          console.log(TAG, `PRESS → queuing visitor ${visitor.id}`);
          pendingVisitorRef.current = visitor;
          tryNavigate();
        }

      } catch (e) {
        setProcessing(false);
        console.log(TAG, "notifee foreground error:", e);
      }
    });
    return unsubscribe;
  }, []);

  /* ── Cold start (app was KILLED) ─────────────────────────────────────
     Only checks getPendingVisitorView (for "View Details" tap).
     getPendingAction is NOT checked — VisitorIncomingActivity
     already called the API directly before the app launched.
  ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const checkColdStart = async () => {
      try {
        if (!VisitorModule) return;
        await new Promise(res => setTimeout(res, 300));

        const visitorStr = await VisitorModule.getPendingVisitorView();
        console.log(TAG, `checkColdStart → getPendingVisitorView: ${visitorStr ?? "null"}`);

        if (visitorStr) {
          const visitor = typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;
          console.log(TAG, `checkColdStart → queuing visitor ${visitor.id}`);
          pendingVisitorRef.current = visitor;
          tryNavigate();
        }
      } catch (e) {
        console.log(TAG, "checkColdStart error:", e);
      }
    };
    checkColdStart();
  }, []);

  /* ── AppState: background → active ──────────────────────────────────
     Only checks getPendingVisitorView (for "View Details" tap).
     getPendingAction removed — native activity handles accept/decline.
  ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;
      console.log(TAG, "AppState → active");

      try {
        if (!VisitorModule) return;

        // Small delay so native SharedPrefs write completes before we read
        await new Promise(res => setTimeout(res, 800));

        const visitorStr = await VisitorModule.getPendingVisitorView();
        console.log(TAG, `AppState → getPendingVisitorView: ${visitorStr ?? "null"}`);

        if (!visitorStr) return;

        const visitor = typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;
        if (!visitor?.id) return;

        if (handledInMemory.has(visitor.id)) {
          console.log(TAG, `AppState → already handled: ${visitor.id}`);
          return;
        }

        console.log(TAG, `AppState → queuing visitor ${visitor.id}`);
        pendingVisitorRef.current = visitor;
        tryNavigate();

      } catch (e) {
        console.log(TAG, "AppState error:", e);
      }
    });
    return () => sub.remove();
  }, []);

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
    alignItems: "center",
    zIndex: 9999,
  },
  overlayText: { marginTop: 10, fontSize: 16, fontWeight: "bold" },
});