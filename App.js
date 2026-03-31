import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar, StyleSheet, AppState, NativeModules } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OneSignal } from "react-native-onesignal";
import notifee, { EventType } from "@notifee/react-native";

import NavigationPage from "./NavigationPage";
import BRAND from "./app/config";
import initializeOneSignal, { setOnVisitorPending } from "./Utils/PushNotifications";
import { RegisterAppOneSignal } from "./services/oneSignalService";
import { complaintService } from "./services/complaintService";
import { visitorServices } from "./services/visitorServices";
import { navigationRef } from "./NavigationService";
import { PermissionsProvider } from "./Utils/ConetextApi";

const { VisitorModule } = NativeModules;

/* 🔐 Auth Screens */
const AUTH_SCREENS = ["Login", "OtpLoginScreen", "OtpLogin", "OtpVerify"];
const isUserLoggedIn = (route) => route && !AUTH_SCREENS.includes(route);

export default function App() {
  const [processing, setProcessing] = React.useState(false);

  // 🔥 Store visitor until navigation is ready + user logged in
  const pendingVisitorRef = useRef(null);

  /* -------------------------------------------------------
     🚀 SAFE NAVIGATION
  ------------------------------------------------------- */
  const tryNavigate = () => {
    if (!pendingVisitorRef.current) return;
    if (!navigationRef.isReady()) return;

    const route = navigationRef.getCurrentRoute()?.name;

    if (!isUserLoggedIn(route)) {
      console.log("⏳ Waiting for login...");
      return;
    }

    const visitor = pendingVisitorRef.current;
    pendingVisitorRef.current = null;

    console.log("🚀 FINAL NAVIGATION:", visitor.id);

    setTimeout(() => {
      navigationRef.navigate("VisitorNotificationMessage", { visitor });
    }, 300);
  };

  /* -------------------------------------------------------
     🔗 NAVIGATION EVENTS (REAL FIX)
  ------------------------------------------------------- */
 useEffect(() => {
  let interval = null;

  const startChecking = () => {
    interval = setInterval(() => {
      if (!pendingVisitorRef.current) return;
      if (!navigationRef.isReady()) return;

      const route = navigationRef.getCurrentRoute()?.name;

      if (!isUserLoggedIn(route)) {
        console.log("⏳ Waiting for login...");
        return;
      }

      const visitor = pendingVisitorRef.current;
      pendingVisitorRef.current = null;

      console.log("🚀 FINAL NAVIGATION (polling):", visitor.id);

      navigationRef.navigate("VisitorNotificationMessage", { visitor });

      clearInterval(interval);
    }, 300); // check every 300ms
  };

  startChecking();

  return () => clearInterval(interval);
}, []);

  /* -------------------------------------------------------
     📦 LOAD CONFIG
  ------------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const user = await AsyncStorage.getItem("userInfo");
        if (!user) return;

        const existing = await AsyncStorage.getItem("SOCIETY_CONFIG");
        if (!existing) {
          const res = await complaintService.getSocietyConfigNew();
          if (res) {
            await AsyncStorage.setItem("SOCIETY_CONFIG", JSON.stringify(res));
          }
        }
      } catch (e) {
        console.log("❌ Config error:", e);
      }
    };

    init();
  }, []);

  /* -------------------------------------------------------
     🔔 INIT ONESIGNAL
  ------------------------------------------------------- */
  useEffect(() => {
    const setup = async () => {
      await initializeOneSignal();
      await RegisterAppOneSignal();

      setOnVisitorPending((visitor) => {
        pendingVisitorRef.current = visitor;
        tryNavigate();
      });
    };

    setup();
  }, []);

  /* -------------------------------------------------------
     🔔 NOTIFEE FOREGROUND EVENTS
  ------------------------------------------------------- */
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      try {
        const visitorStr =
          detail.notification?.data?.visitor ||
          detail.notification?.android?.data?.visitor;

        if (!visitorStr) return;

        const visitor =
          typeof visitorStr === "string"
            ? JSON.parse(visitorStr)
            : visitorStr;

        if (!visitor?.id) return;

        if (type === EventType.ACTION_PRESS) {
          setProcessing(true);

          await Promise.all([
            detail.pressAction.id === "accept"
              ? visitorServices.acceptVisitor(visitor.id)
              : visitorServices.denyVisitor(visitor.id),
            new Promise((res) => setTimeout(res, 600)),
          ]);

          setProcessing(false);

          navigationRef.reset({
            index: 0,
            routes: [
              {
                name: "MainApp",
                state: {
                  index: 0,
                  routes: [{ name: "Visitors" }],
                },
              },
            ],
          });

          return;
        }

        if (type === EventType.PRESS) {
          pendingVisitorRef.current = visitor;
          tryNavigate();
        }
      } catch (e) {
        setProcessing(false);
        console.log("❌ Notifee error:", e);
      }
    });

    return unsubscribe;
  }, []);

  /* -------------------------------------------------------
     📱 COLD START (KILLED STATE)
  ------------------------------------------------------- */
  useEffect(() => {
    const checkColdStart = async () => {
      try {
        if (!VisitorModule) return;

        const visitorStr = await VisitorModule.getPendingVisitorView();
        if (!visitorStr) return;

        const visitor =
          typeof visitorStr === "string"
            ? JSON.parse(visitorStr)
            : visitorStr;

        if (visitor?.id) {
          console.log("🔥 Cold start visitor:", visitor.id);
          pendingVisitorRef.current = visitor;
          tryNavigate();
        }
      } catch (e) {
        console.log("❌ Cold start error:", e);
      }
    };

    checkColdStart();
  }, []);

  /* -------------------------------------------------------
     🔄 APP STATE (BACKGROUND → ACTIVE)
  ------------------------------------------------------- */
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;

      try {
        if (!VisitorModule) return;

        await new Promise(res => setTimeout(res, 800)); // 🔥 wait for native write

        const actionStr = await VisitorModule.getPendingAction();
        console.log("📥 Pending Action:", actionStr);
        if (actionStr) {
          const { visitor, action } = JSON.parse(actionStr);

          if (visitor?.id) {
            setProcessing(true);

            await visitorServices[
              action === "ACCEPT" ? "acceptVisitor" : "denyVisitor"
            ](visitor.id);

            setProcessing(false);

            navigationRef.reset({
              index: 0,
              routes: [
                {
                  name: "MainApp",
                  state: {
                    index: 0,
                    routes: [{ name: "Visitors" }],
                  },
                },
              ],
            });

            return;
          }
        }

        const visitorStr = await VisitorModule.getPendingVisitorView();

        if (visitorStr) {
          const visitor =
            typeof visitorStr === "string"
              ? JSON.parse(visitorStr)
              : visitorStr;

          pendingVisitorRef.current = visitor;
          tryNavigate();
        }
      } catch (e) {
        console.log("❌ AppState error:", e);
      }
    });

    return () => sub.remove();
  }, []);

  /* -------------------------------------------------------
     🔑 TOKEN CHANGE
  ------------------------------------------------------- */
  useEffect(() => {
    const sub = OneSignal.User.pushSubscription.addEventListener(
      "change",
      async () => {
        try {
          const user = await AsyncStorage.getItem("userInfo");
          if (!user) return;
          await RegisterAppOneSignal();
        } catch (e) {
          console.log("❌ Token error:", e);
        }
      }
    );

    return () =>
      OneSignal.User.pushSubscription.removeEventListener("change", sub);
  }, []);

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PermissionsProvider>
        <SafeAreaView
          style={[
            styles.safeArea,
            {
              backgroundColor:
                BRAND.COLORS.safeArea || BRAND.COLORS.background,
            },
          ]}
        >
          <StatusBar barStyle="dark-content" />
          <NavigationPage />

          {processing && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#22C55E" />
              <Text style={styles.overlayText}>
                Processing request...
              </Text>
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
  overlayText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
});