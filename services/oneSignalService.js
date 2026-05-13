import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL2, APP_VERSION_CODE, APP_NAME } from '../app/config/env';
import { OneSignal } from 'react-native-onesignal';
import { ApiCommon } from './ApiCommon';
import { Common } from './Common';


/* ================================
   REGISTER DEVICE
================================ */
export const RegisterAppOneSignal = async () => {
  try {

    console.log("🚀 RegisterAppOneSignal started");

    // 🔥 VERY IMPORTANT (THIS FIXES YOUR ISSUE)
    OneSignal.User.pushSubscription.optIn();
    await new Promise(resolve => setTimeout(resolve, 500)); // 🔥 important


    const userInfo = await AsyncStorage.getItem("userInfo");
    const tenantValue = await AsyncStorage.getItem("isTenant");

    if (!userInfo) {
      console.log("❌ No user session found");
      return false;
    }

    const parsedUser = JSON.parse(userInfo);

    let user = await Common.getLoggedInUser();
    let realUserId = user.id;

    if (typeof realUserId === "string" && realUserId.includes("user_id")) {
      const parsed = JSON.parse(realUserId);
      realUserId = parsed.user_id;
    }

    const deviceId = await OneSignal.User.pushSubscription.getIdAsync();

    console.log("📱 OneSignal Device ID:", deviceId);

    if (!deviceId) {
      console.log("❌ Device ID not ready yet");
      return false;
    }
    const tenant = Number(tenantValue ?? 0); // ✅ define before payload


    const payload = {
      app_name: APP_NAME,
      app_version_code: APP_VERSION_CODE,
      app_device_id: deviceId, 
      userId: deviceId,
      tenant: tenant,
    };

    const url = `${API_URL2}/appRegistered?api-token=${user.api_token}&user-id=${realUserId}`;

    const headers = {
      "Content-Type": "application/json",
      "Ism-Auth": `{"api-token":"${user.api_token}","user-id":${realUserId},"site-id":${user.societyId}}`
    };

    const response = await ApiCommon.postReq(url, payload, headers);

    console.log("✅ OneSignal Registered Response:", response);

    return true;

  } catch (error) {
    console.error("❌ OneSignal register error:", error);
    return false;
  }
};

/* ================================
   UNREGISTER DEVICE
================================ */

export const UnRegisterOneSignal = async () => {
  try {

    const userInfo = await AsyncStorage.getItem('userInfo');

    if (!userInfo) return;

    const parsedUser = JSON.parse(userInfo);

    let realUserId = parsedUser?.id;

    if (typeof realUserId === "string" && realUserId.includes("user_id")) {
      const parsed = JSON.parse(realUserId);
      realUserId = parsed.user_id;
    }
    const apiToken = parsedUser?.api_token;
    const societyId = parsedUser?.societyId || parsedUser?.s_id;

    let deviceId = await OneSignal.User.pushSubscription.getIdAsync();

    if (!deviceId) {
      console.warn("OneSignal deviceId missing");
      return false;
    }

    const headers = {
      "Content-Type": "application/json",
      "Ism-Auth": `{"api-token":"${apiToken}","user-id":${realUserId},"site-id":${societyId}}`
    }

    const tenantValue = await AsyncStorage.getItem("isTenant");
    
const tenant = Number(tenantValue ?? 0); // ✅ define before payload

    const payload = {
      userId: deviceId,
      tenant: tenant
    };

    const url = `${API_URL2}/appUnRegistered`;

    const response = await ApiCommon.postReq(url, payload, headers);

    console.log("OneSignal Unregistered:", response);

    return true;

  } catch (error) {

    console.error("OneSignal unregister error:", error?.response?.data || error);

    return false;

  }
};