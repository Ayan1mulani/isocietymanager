// App.js — top imports
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar, StyleSheet, AppState, NativeModules } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OneSignal } from "react-native-onesignal";
import notifee, { EventType } from "@notifee/react-native"; // ← ADD THIS

import NavigationPage from "./NavigationPage";
import BRAND from "./app/config";
import initializeOneSignal, { setOnVisitorPending } from "./Utils/PushNotifications"; // ← also add setOnVisitorPending
import { RegisterAppOneSignal } from "./services/oneSignalService";
import { complaintService } from "./services/complaintService";
import { visitorServices } from "./services/visitorServices";
import { navigationRef, navigate } from "./NavigationService";
import { PermissionsProvider } from "./Utils/ConetextApi";
const { VisitorModule } = NativeModules;

export default function App() {
  const isNavigating = useRef(false);
  const pendingVisitorHandled = useRef(false);

  /* -------------------------------------------------------
     🚀 NAVIGATION FUNCTION
  ------------------------------------------------------- */
  const navigateToVisitor = (visitor) => {
    if (isNavigating.current) return;
    if (!visitor?.id) return;

    isNavigating.current = true;
    pendingVisitorHandled.current = true;

    const tryNavigate = () => {
      if (!navigationRef.isReady()) {
        setTimeout(tryNavigate, 300);
        return;
      }

      console.log("🚀 Navigating to visitor:", visitor.id);

      navigate("VisitorApproval", { visitor });

      setTimeout(() => {
        isNavigating.current = false;
      }, 1000);
    };

    tryNavigate();
  };

  /* -------------------------------------------------------
     📦 LOAD CONFIG
  ------------------------------------------------------- */
  const loadSocietyConfig = async () => {
    try {
      const existing = await AsyncStorage.getItem("SOCIETY_CONFIG");

      if (existing) {
        try {
          JSON.parse(existing);
          return;
        } catch {
          console.log("⚠️ Corrupted config, refetching...");
        }
      }

      const res = await complaintService.getSocietyConfigNew();

      if (res) {
        await AsyncStorage.setItem("SOCIETY_CONFIG", JSON.stringify(res));
      }
    } catch (error) {
      console.log("❌ Config load error:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      const user = await AsyncStorage.getItem("userInfo");
      if (user) await loadSocietyConfig();
    };
    init();
  }, []);

  useEffect(() => {
  const setup = async () => {
    await initializeOneSignal();
    await RegisterAppOneSignal();

    // ✅ Wire up navigation callbac
    setOnVisitorPending((visitor) => {
      navigateToVisitor(visitor);
    });
  };

  setup();
}, []);

  /* -------------------------------------------------------
     📱 KILLED STATE (Native Module)
  ------------------------------------------------------- */
  useEffect(() => {
    const checkNative = async () => {
      try {
        if (!VisitorModule) return;

        const visitor = await VisitorModule.getPendingVisitor();

        if (visitor?.id) {
          console.log("📱 Native visitor:", visitor.id);
          setTimeout(() => navigateToVisitor(visitor), 1500);
        }
      } catch (e) {
        console.log("❌ Native error:", e);
      }
    };

    checkNative();
  }, []);

  /* -------------------------------------------------------
     🌐 SERVER POLL (fallback)
  ------------------------------------------------------- */
  const checkPendingVisitorFromServer = async () => {
    try {
      if (isNavigating.current || pendingVisitorHandled.current) return;

      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) return;

      const response = await visitorServices.getVisitsForResident();
      const visits = response?.data || [];

      const pending = visits.find(
        (v) =>
          v.status === "waiting" ||
          v.status === "pending" ||
          v.allow === null ||
          (v.allow === 0 && v.visit_status === "active")
      );

      if (!pending) return;

      const visitor = {
        id: pending.id,
        name: pending.visitor_name,
        phoneNumber: pending.visitor_phone_no,
        photo: pending.visitor_img,
        purpose: pending.visit_purpose,
        startTime: pending.visit_start_time,
      };

      console.log("🔔 Server visitor:", visitor.id);

      navigateToVisitor(visitor);
    } catch (e) {
      console.log("❌ Server error:", e);
    }
  };


  // App.js - notifee foreground action handler (accept/decline buttons)
useEffect(() => {
  const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
    try {
      console.log("🔔 Notifee event type:", type);

      // Visitor data stored in notification.data
      const visitorStr =
        detail.notification?.data?.visitor ||
        detail.notification?.android?.data?.visitor;

      if (!visitorStr) return;

      const visitor = JSON.parse(visitorStr);
      if (!visitor?.id) return;

      if (type === EventType.ACTION_PRESS) {
        if (detail.pressAction.id === "accept") {
          console.log("✅ ACCEPT visitor:", visitor.id);
          await visitorServices.acceptVisitor(visitor.id);
        }

        if (detail.pressAction.id === "decline") {
          console.log("❌ DECLINE visitor:", visitor.id);
          await visitorServices.denyVisitor(visitor.id);
        }
      }

      if (type === EventType.PRESS) {
        console.log("📲 Notification body pressed:", visitor.id);
        navigate("VisitorRequestScreen", { visitor });
      }
    } catch (e) {
      console.log("❌ Notifee foreground event error:", e);
    }
  });

  return unsubscribe;
}, []);

  /* -------------------------------------------------------
     🔔 INIT ONESIGNAL
  ------------------------------------------------------- */
  useEffect(() => {
    const setup = async () => {
      console.log("📱 App mounted → initializing OneSignal");

      await initializeOneSignal();   // ✅ OneSignal setup
      await RegisterAppOneSignal();  // ✅ Register device to backend
    };

    setup();
  }, []);

  /* -------------------------------------------------------
     ⏱️ APP OPEN CHECK
  ------------------------------------------------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      checkPendingVisitorFromServer();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  /* -------------------------------------------------------
     🔄 APP STATE
  ------------------------------------------------------- */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        pendingVisitorHandled.current = false;
        isNavigating.current = false;
      }

      if (state === "active") {
        if (!pendingVisitorHandled.current && !isNavigating.current) {
          checkPendingVisitorFromServer();
        }
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
            { backgroundColor: BRAND.COLORS.safeArea || BRAND.COLORS.background },
          ]}
        >
          <StatusBar barStyle="dark-content" />
          <NavigationPage />
        </SafeAreaView>
      </PermissionsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});