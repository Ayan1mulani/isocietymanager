import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL2, APP_VERSION_CODE, APP_ID_ONE_SIGNAL, APP_NAME } from '../app/config/env';
import { OneSignal } from 'react-native-onesignal';
import { ApiCommon } from './ApiCommon';
import { Common } from './Common';


/* ================================
   REGISTER DEVICE
================================ */
export const RegisterAppOneSignal = async () => {

  try {

    console.log("🚀 RegisterAppOneSignal started");

    const userInfo = await AsyncStorage.getItem("userInfo");

    console.log("📦 Raw userInfo from storage:", userInfo);

    if (!userInfo) {
      console.log("❌ No user session found");
      return false;
    }

    const parsedUser = JSON.parse(userInfo);

    console.log("👤 Parsed user:", parsedUser);

    const userId = parsedUser?.id;
    const apiToken = parsedUser?.api_token;
    const societyId = parsedUser?.societyId || parsedUser?.s_id;

    console.log("🔎 Extracted values");
    console.log("userId:", userId);
    console.log("apiToken:", apiToken);
    console.log("societyId:", societyId);

    const deviceId = await OneSignal.User.pushSubscription.getIdAsync();

    console.log("📱 OneSignal Device ID:", deviceId);

    if (!deviceId) {
      console.log("❌ Device ID not ready yet");
      return false;
    }



    const payload = {
      app_name: APP_NAME,
      app_version_code: APP_VERSION_CODE,
      app_device_id: deviceId,
      userId: deviceId,
      tenant: 0,
    };
    let user = await Common.getLoggedInUser()
    let realUserId = user.id;

    if (typeof realUserId === "string" && realUserId.includes("user_id")) {
      const parsed = JSON.parse(realUserId);
      realUserId = parsed.user_id;
    }


    console.log("📦 Payload being sent:", payload);
    const url = `${API_URL2}/appRegistered?api-token=${user.api_token}&user-id=${realUserId}`;


    console.log("🌐 Request URL:", url);
    console.log(user, "++++++++++++user++++++++++++")

    const headers = {
      "Content-Type": "application/json",
      "Ism-Auth": `{"api-token":"${user.api_token}","user-id":${realUserId},"site-id":${user.societyId}}`
    }

    console.log("📨 Headers:", headers);





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

    const payload = {
      userId: deviceId,
      tenant: 0
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