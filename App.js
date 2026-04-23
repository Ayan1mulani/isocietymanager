import React, { useEffect, useRef } from "react";
import {
  View, ActivityIndicator, Text, StatusBar,
  StyleSheet, AppState, NativeModules, TextInput, Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, { EventType } from "@notifee/react-native";
import NavigationPage from "./NavigationPage";
import BRAND from "./app/config";
import initializeOneSignal, { setOnVisitorPending } from "./Utils/PushNotifications";
import { complaintService } from "./services/complaintService";
import { visitorServices } from "./services/visitorServices";
import { navigationRef } from "./NavigationService";
import { PermissionsProvider, usePermissions } from "./Utils/ConetextApi";
import { fetchAndCacheSettings } from "./services/settingsCache";

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;

const { VisitorModule, IntentModule } = NativeModules;

const TAG = "[App]";

const handledInMemory = new Set();
const VISITOR_HANDLED_KEY = "HANDLED_VISITORS";
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

const isAlreadyHandled = async (id) => {
  if (handledInMemory.has(id)) return true;
  try {
    const raw = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    return list.filter(i => now - i.time < DEDUP_TTL_MS).some(i => i.id === id);
  } catch { return false; }
};

const checkTenant = async () => {
  const tenant = await AsyncStorage.getItem("isTenant");
  console.log("Tenant value:", tenant);
};
checkTenant();

const markHandled = async (id) => {
  handledInMemory.add(id);
  try {
    const raw = await AsyncStorage.getItem(VISITOR_HANDLED_KEY);
    let list = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    list = list.filter(i => now - i.time < DEDUP_TTL_MS);
    list.push({ id, time: now });
    await AsyncStorage.setItem(VISITOR_HANDLED_KEY, JSON.stringify(list));
  } catch { }
};

const AUTH_SCREENS = ["Login", "OtpLoginScreen", "OtpLogin", "OtpVerify"];
const isUserLoggedIn = (route) => route && !AUTH_SCREENS.includes(route);

/* ─── Permissions component ─────────────────────────────────────────────── */
const AppContent = () => {
  const { loadPermissions } = usePermissions();

  useEffect(() => {
    const loadPerms = async () => {
      try {
        await new Promise(res => setTimeout(res, 500));
        await loadPermissions(true);
      } catch (e) {
        console.log("[App] Permission load error:", e);
      }
    };
    loadPerms();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        try {
          await loadPermissions(true);
        } catch (e) {
          console.log("[App] Permission refresh error:", e);
        }
      }
    });
    return () => sub.remove();
  }, []);

  return <NavigationPage />;
};

/* ─── Main App ──────────────────────────────────────────────────────────── */
export default function App() {
  const [processing, setProcessing] = React.useState(false);
  const pendingVisitorRef = useRef(null);
  const pendingStaffRef = useRef(null);

  /* ── Visitor navigation with retry ───────────────────────────────────── */
  const tryNavigate = async (attempts = 0) => {
    const visitor = pendingVisitorRef.current;
    if (!visitor) return;
    if (attempts > 10) { pendingVisitorRef.current = null; return; }
    if (!navigationRef.isReady()) {
      setTimeout(() => tryNavigate(attempts + 1), 500);
      return;
    }
    const route = navigationRef.getCurrentRoute()?.name;
    if (!isUserLoggedIn(route)) {
      setTimeout(() => tryNavigate(attempts + 1), 500);
      return;
    }
    if (handledInMemory.has(visitor.id)) { pendingVisitorRef.current = null; return; }
    handledInMemory.add(visitor.id);
    if (await isAlreadyHandled(visitor.id)) { pendingVisitorRef.current = null; return; }
    await markHandled(visitor.id);
    pendingVisitorRef.current = null;
    navigationRef.navigate("VisitorNotificationMessage", { visitor });
  };

  /* ── Staff navigation with retry ─────────────────────────────────────── */
  const tryNavigateStaff = async (attempts = 0) => {
    if (!pendingStaffRef.current) return;
    if (attempts > 10) { pendingStaffRef.current = null; return; }

    if (!navigationRef.isReady()) {
      setTimeout(() => tryNavigateStaff(attempts + 1), 500);
      return;
    }

    const route = navigationRef.getCurrentRoute()?.name;
    if (!isUserLoggedIn(route)) {
      setTimeout(() => tryNavigateStaff(attempts + 1), 500);
      return;
    }

    pendingStaffRef.current = null;
    await AsyncStorage.setItem("PENDING_STAFF_NAVIGATE", "true").catch(() => { });
    navigationRef.navigate("StaffScreen");
  };

  /* ── Read staff intent from Kotlin tap (locked screen / background) ───
     Kotlin puts extras on the launch intent when user taps the staff
     notification. We read those extras here and navigate to StaffScreen.
  ───────────────────────────────────────────────────────────────────────── */
  const checkStaffIntent = async () => {
    try {
      if (Platform.OS !== "android") return;
      if (!IntentModule) {
        console.log(TAG, "IntentModule not available");
        return;
      }

      const extras = await IntentModule.getIntentExtras();
      console.log(TAG, "checkStaffIntent → extras:", JSON.stringify(extras));

      if (extras?.notification_type === "STAFF") {
        console.log(TAG, "Staff intent detected → navigating to StaffScreen");

        // Clear so it doesn't fire again on next resume
        await IntentModule.clearIntentExtras();

        // Set pending and navigate
        pendingStaffRef.current = {
          type: "STAFF",
          data: {
            id: extras.staff_id,
            name: extras.staff_name,
            exit: extras.staff_exit ? 1 : 0,
          },
        };

        tryNavigateStaff();
      }
    } catch (e) {
      console.log(TAG, "checkStaffIntent error:", e);
    }
  };

  /* ── Society config init ─────────────────────────────────────────────── */
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
      } catch (e) { }
    };
    init();
  }, []);

  /* ── Settings cache ──────────────────────────────────────────────────── */
  useEffect(() => {
    fetchAndCacheSettings();
  }, []);

  /* ── OneSignal ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const setup = async () => {
      await initializeOneSignal();
      setOnVisitorPending((payload) => {
        if (payload?.type === "STAFF") {
          pendingStaffRef.current = payload;
          tryNavigateStaff();
          return;
        }
        if (payload?.id) {
          pendingVisitorRef.current = payload;
          tryNavigate();
        }
      });
    };
    setup();
  }, []);

  /* ── Notifee foreground (visitor accept/decline) ─────────────────────── */
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        const visitorStr =
          detail.notification?.data?.visitor ||
          detail.notification?.android?.data?.visitor;
        if (!visitorStr) return;
        const visitor = typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;
        if (!visitor?.id) return;

        if (type === EventType.ACTION_PRESS) {
          const isAccept = detail.pressAction.id === "accept";
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

        if (type === EventType.PRESS) {
          pendingVisitorRef.current = visitor;
          tryNavigate();
        }
      } catch (e) {
        setProcessing(false);
      }
    });
    return unsubscribe;
  }, []);

  /* ── Cold start: visitor ─────────────────────────────────────────────── */
  useEffect(() => {
    const checkColdStart = async () => {
      try {
        if (!VisitorModule) return;
        await new Promise(res => setTimeout(res, 300));
        const visitorStr = await VisitorModule.getPendingVisitorView();
        if (visitorStr) {
          const visitor = typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;
          pendingVisitorRef.current = visitor;
          tryNavigate();
        }
      } catch (e) { }
    };
    checkColdStart();
  }, []);

  /* ── Cold start: staff intent (app opened from locked screen tap) ─────── */
  useEffect(() => {
    // Small delay so navigation is ready
    const timer = setTimeout(() => {
      checkStaffIntent();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  /* ── AppState resume: visitor + staff intent ─────────────────────────── */
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;

      // ── Check visitor ──────────────────────────────────────────────────
      try {
        if (VisitorModule) {
          await new Promise(res => setTimeout(res, 800));
          const visitorStr = await VisitorModule.getPendingVisitorView();
          if (visitorStr) {
            const visitor = typeof visitorStr === "string" ? JSON.parse(visitorStr) : visitorStr;
            if (visitor?.id && !handledInMemory.has(visitor.id)) {
              pendingVisitorRef.current = visitor;
              tryNavigate();
            }
          }
        }
      } catch (e) { }

      // ── Check staff intent (user unlocked phone and tapped notification) ─
      // Small delay lets the intent extras be readable after activity resumes
      setTimeout(() => {
        checkStaffIntent();
      }, 600);
    });

    return () => sub.remove();
  }, []);

  /* ── Render ──────────────────────────────────────────────────────────── */
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
          <AppContent />
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