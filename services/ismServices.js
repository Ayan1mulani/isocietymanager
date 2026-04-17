import { API_URL2, PAYMENT_URL, APP_NAME, SUB_DOMAIN, METER_URL } from "../app/config/env"
import { ApiCommon } from "./ApiCommon"
import { Common } from "./Common"
import { Util } from "./Util"
import AsyncStorage from "@react-native-async-storage/async-storage"

const ismServices = {

  exportMeterReadings: async (fromDate, toDate, unit, type) => {
    const user = await Common.getLoggedInUser();

    if (!fromDate || !toDate) {
      throw new Error("Please select both dates");
    }

    const diffDays =
      (new Date(toDate) - new Date(fromDate)) / (1000 * 3600 * 24);

    if (diffDays > 90) {
      throw new Error("Maximum 90 days allowed");
    }

    const url =
      `${METER_URL}/v1/society/${user.societyId}/exportreading` +
      `?api-token=${user.api_token}` +
      `&user-id=${user.id}` +
      `&from_date=${fromDate}` +
      `&to_date=${toDate}` +
      `&unit=${unit || user.flat_no}` +
      `&type=${type}`;

    console.log("✅ FINAL EXPORT URL:", url);

    return url; // 🔥 MUST BE STRING ONLY
  },

  getMeterStatus: async () => {
    try {
      const user = await Common.getLoggedInUser();

      const url =
        `${METER_URL}/v1/society/${user.societyId}/unit/${user.flat_no}/meter` +
        `?api-token=${user.api_token}` +
        `&user-id=${user.id}`;

      const headers = await Util.getCommonAuth();

      const res = await ApiCommon.getReq(url, headers);

      if (res?.status === "success") {
        return res?.data?.status === "UP";
      }

      return true;

    } catch (error) {
      console.log("Meter status error:", error);
      return true;
    }
  },
  getLiveMeterReading: async () => {
    const user = await Common.getLoggedInUser();

    const url =
      `${METER_URL}/v1/society/${user.societyId}/unit/${user.flat_no}/livereading` +
      `?api-token=${user.api_token}` +
      `&user-id=${user.id}`;

    const res = await fetch(url);
    return res.json();
  },


  getPaymentById: async (paymentId) => {
    try {
      const user = await Common.getLoggedInUser();

      const userObj = {
        user_id: user.id,
        group_id: user.role_id,
        flat_no: user.flat_no,
        unit_id: user.unit_id,
        society_id: user.societyId,
      };

      const encodedUser = encodeURIComponent(JSON.stringify(userObj));

      const url = `https://pay-api.isocietymanager.com/v1/society/${user.societyId}/getpayments?api-token=${user.api_token}&user-id=${encodedUser}&id=${paymentId}`;

      const headers = await Util.getCommonAuth();

      const res = await ApiCommon.getReq(url, headers);

      console.log("Payment Detail API:", res);

      return res;

    } catch (e) {
      console.log("Payment Detail Error:", e);
      return null;
    }
  },
  getPayments: async () => {
    try {
      const user = await Common.getLoggedInUser();

      const userObj = {
        user_id: user.id,
        group_id: user.role_id,
        flat_no: user.flat_no,
        unit_id: user.unit_id,
        society_id: user.societyId,
      };

      const encodedUser = encodeURIComponent(JSON.stringify(userObj));

      const url = `${PAYMENT_URL}/v1/society/${user.societyId}/getpayments?api-token=${user.api_token}&user-id=${encodedUser}&flat_no_x=${user.flat_no}`;

      const headers = await Util.getCommonAuth();

      const res = await ApiCommon.getReq(url, headers);

      console.log("Payments API:", res);

      return res;

    } catch (e) {
      console.log("Payments API Error:", e);
      return null;
    }
  },


  getPaymentsList: async () => {
    try {
      const user = await Common.getLoggedInUser();

      const userObj = {
        user_id: user.id,
        group_id: user.role_id,
        flat_no: user.flat_no,
        unit_id: user.unit_id,
        society_id: user.societyId,
      };

      const encodedUser = encodeURIComponent(JSON.stringify(userObj));

      // Added types[]=DEBIT&types[]=CREDIT as per your network request
      const url = `${PAYMENT_URL}/v1/society/${user.societyId}/getpayments?api-token=${user.api_token}&user-id=${encodedUser}&flat_no_x=${user.flat_no}&types[]=DEBIT&types[]=CREDIT`;

      const headers = await Util.getCommonAuth();
      const res = await ApiCommon.getReq(url, headers);

      console.log("Payments API Response:", res);
      return res;

    } catch (e) {
      console.log("Payments API Error:", e);
      return null;
    }
  },

  generateRegistrationOtp: async (name, mobile, email) => {
    const payload = {
      name: name,
      phone_no: mobile,
      email: email,
      app_roles: [],
      otp_type: "USER_REGISTRATION"
    };
    const url = `${API_URL2}/generateotp`;
    return ApiCommon.postReq(url, payload);
  },
searchSociety: async (keyword, token) => {
    try {
      // 🔥 FIX: Removed encodeURIComponent(token). 
      // The token from validateotp is already URL-encoded. Double-encoding breaks it!
      const url = `${API_URL2}/searchsociety?key=${encodeURIComponent(keyword)}&token=${token}`;
      
      const response = await ApiCommon.getReq(url);
      return response;
    } catch (error) {
      console.error("Search Society API Error:", error);
      throw error;
    }
  },
  changePassword: async (payload) => {
  try {
    const user = await Common.getLoggedInUser();

    const uObj = {
      user_id: user.id,
      group_id: user.role_id,
      flat_no: user.flat_no,
      unit_id: user.unit_id,
      society_id: user.societyId
    };

    const url = `${API_URL2}/v1/changePassword` +
      `?api-token=${user.api_token}` +
      `&user-id=${JSON.stringify(uObj)}`;

    const headers = await Util.getCommonAuth();

    console.log("🚀 URL:", url);
    console.log("🚀 PAYLOAD:", payload);

    const response = await ApiCommon.postReq(url, payload, headers);

    console.log("✅ RESPONSE:", response);

    return response; // 🔥 IMPORTANT

  } catch (error) {
    console.log("❌ CHANGE PASSWORD ERROR:", error);
    return {
      status: "error",
      message: "Password change failed"
    };
  }
},

// --- ADD THESE TO YOUR ismServices OBJECT ---

  getSocietyAssets: async (societyId, token) => {
    try {
      const url = `${API_URL2}/societyassets?society_id=${societyId}&token=${token}`;
      return await ApiCommon.getReq(url);
    } catch (error) {
      console.error("Get Society Assets Error:", error);
      throw error;
    }
  },

  getRegistrationFormFields: async (societyId, token) => {
    try {
      const url = `${API_URL2}/form?form_type=USER_REGISTRATION&society_id=${societyId}&token=${token}`;
      return await ApiCommon.getReq(url);
    } catch (error) {
      console.error("Get Form Fields Error:", error);
      throw error;
    }
  },

  submitRegistrationForm: async (payload, token) => {
    try {
      const url = `${API_URL2}/submitform?token=${token}`;
      // Based on your trace, this is a POST request sending JSON
      return await ApiCommon.postReq(url, payload);
    } catch (error) {
      console.error("Submit Registration Error:", error);
      throw error;
    }
  },
  getSocietyAssets: async (societyId, token) => {
  try {
    const url = `${API_URL2}/societyassets?society_id=${societyId}&token=${token}`;
    return await ApiCommon.getReq(url);
  } catch (error) {
    console.error("Get Society Assets Error:", error);
    throw error;
  }
},
getRegistrationFormFields: async (societyId, token) => {
  try {
    const url = `${API_URL2}/form?form_type=USER_REGISTRATION&society_id=${societyId}&token=${token}`;
    return await ApiCommon.getReq(url);
  } catch (error) {
    console.error("Get Form Fields Error:", error);
    throw error;
  }
},
submitRegistrationForm: async (payload, token) => {
  try {
    const url = `${API_URL2}/submitform?token=${token}`;
    return await ApiCommon.postReq(url, payload);
  } catch (error) {
    console.error("Submit Registration Error:", error);
    throw error;
  }
},
getFormStatus: async (societyId, formId, token) => {
  try {
    const url = `${API_URL2}/getformstatus?token=${token}&society_id=${societyId}&form_id=${formId}`;
    return await ApiCommon.getReq(url);
  } catch (error) {
    console.error("Get Form Status Error:", error);
    throw error;
  }
},


  getMeterReadings: async (pageNo = 1) => {
    try {
      const user = await Common.getLoggedInUser();

      const url =
        `${METER_URL}/v1/society/${user.societyId}/unit/${user.flat_no}/readings` +
        `?api-token=${user.api_token}` +
        `&user-id=${user.id}` +
        `&per_page=20&page_no=${pageNo}`;

      const headers = await Util.getCommonAuth();

      return await ApiCommon.getReq(url, headers);

    } catch (error) {
      console.log("Meter readings error:", error);
      throw error;
    }
  },


  getMeterConsumption: async () => {
    try {
      const user = await Common.getLoggedInUser();

      const url =
        `${METER_URL}/v1/society/${user.societyId}/unit/${user.flat_no}/consumption` +
        `?api-token=${user.api_token}` +
        `&user-id=${user.id}`;

      const headers = await Util.getCommonAuth();

      return await ApiCommon.getReq(url, headers);

    } catch (error) {
      console.log("Meter consumption error:", error);
      throw error;
    }
  },
  makePayment: async (amount, billType, remarks = "") => {
    try {
      const user = await Common.getLoggedInUser();

      const userObj = {
        user_id: user.id,
        group_id: user.role_id,
        flat_no: user.flat_no,
        unit_id: user.unit_id,
        society_id: user.societyId
      };

      const rawUser = JSON.stringify(userObj); // 🔥 NOT ENCODED

      let url =
        `${PAYMENT_URL}/v1/society/${user.societyId}/requestpayment` +
        `?api-token=${user.api_token}` +
        `&user-id=${rawUser}` +   // 🔥 FIXED
        `&sub_domain=${SUB_DOMAIN}` +
        `&flat_no=${user.flat_no}` +
        `&amount=${amount}` +
        `&remarks=${encodeURIComponent(remarks || "")}`;

      if (billType && billType !== 0) {
        if (billType?.id === "AMENITY_BOOKING") {
          url += `&bill_type=null&amenity=${billType?.amenity?.booking_id}`;
        } else {
          url += `&bill_type=${billType?.id || billType}`;
        }
      }

      console.log("✅ FINAL PAYMENT URL:", url);

      return url;

    } catch (error) {
      console.log("❌ Payment URL Error:", error);
      throw error;
    }
  },

  getMasterCompanies: async (category = "delivery") => {
  try {
    const user = await Common.getLoggedInUser();

    const uObj = {
      user_id: user.id,
      group_id: user.role_id,
      flat_no: user.flat_no,
      unit_id: user.unit_id,
      society_id: user.societyId,
    };

    const url =
      `https://vms-api.isocietymanager.com/v1/mastercompanies` +
      `?api-token=${user.api_token}` +
      `&user-id=${encodeURIComponent(JSON.stringify(uObj))}` +
      `&category=${category}`;

    const headers = await Util.getCommonAuth();
    return ApiCommon.getReq(url, headers);
  } catch (error) {
    console.log("getMasterCompanies Error:", error);
    return null;
  }
},

  getAccountStatement: async (billTypeId, pageNo = 1) => {
    try {
      const user = await Common.getLoggedInUser();

      const uObj = {
        user_id: user.id,
        group_id: user.role_id,
        flat_no: user.flat_no,
        unit_id: user.unit_id,
        society_id: user.societyId,
      };

      const url =
        `${API_URL2}/getAccountStatement` +
        `?api-token=${user.api_token}` +
        `&user-id=${encodeURIComponent(JSON.stringify(uObj))}` +
        `&bill_type=${billTypeId}` +
        `&page_no=${pageNo}`;

      const headers = await Util.getCommonAuth();
      return ApiCommon.getReq(url, headers);

    } catch (error) {
      console.log('getAccountStatement error:', error);
      return null;
    }
  },

  getBillTypes: async () => {
    try {
      const user = await Common.getLoggedInUser();

      const uObj = {
        user_id: user.id,
        group_id: user.role_id,
        flat_no: user.flat_no,
        unit_id: user.unit_id,
        society_id: user.societyId
      };

      const url =
        `${API_URL2}/getBillType/${user.societyId}` +
        `?api-token=${user.api_token}` +
        `&user-id=${encodeURIComponent(JSON.stringify(uObj))}`;

      const headers = await Util.getCommonAuth();

      const response = await ApiCommon.getReq(url, headers);

      return response;

    } catch (error) {
      console.log("Get Bill Types Error:", error);
      throw error;
    }
  },



  getMyNotifications: async () => {
    const url = await ismServices.appendParamsInUrl(
      `${API_URL2}/getmynotifications`,
      { cache: 0 }
    );
    const headers = await Util.getCommonAuth();
    return ApiCommon.getReq(url, headers);
  },

  // ✅ KEPT: original function used by other pages
getUserDetails: async () => {
  const user = await Common.getLoggedInUser();

  if (!user) throw new Error("User not logged in");

  const uObj = {
    user_id: user.id,
    group_id: user.role_id,
    flat_no: user.flat_no,
    unit_id: user.unit_id,
    society_id: user.societyId
  };

  // ✅ RAW JSON (NO encoding)
  const u = JSON.stringify(uObj);

  // ✅ FULL manual URL (NO helper)
  const url = `${API_URL2}/userDetailsById/${u}?api-token=${user.api_token}&user-id=${u}&group-id=${user.role_id}&app_id=ism_resident`;

  console.log("✅ FINAL URL:", url); // debug once

  const headers = await Util.getCommonAuth();
  const response = await ApiCommon.getReq(url, headers);

  await AsyncStorage.setItem("userDetails", JSON.stringify(response));
  return response;
},
  // ✅ NEW: fetches full profile including permissions — used by ConetextApi
getUserProfileData: async () => {
  const tenantStr = await AsyncStorage.getItem("isTenant");
  const tenant = Number(tenantStr ?? 0); // convert to number

  const url = await ismServices.appendParamsInUrl(
    `${API_URL2}/getUserProfileData`,
    { tenant }
  );

  const headers = await Util.getCommonAuth();
  const response = await ApiCommon.getReq(url, headers);

  return response;
},
  getMyBalance: async () => {
    const user = await Common.getLoggedInUser();

    const url = await ismServices.appendParamsInUrl(
      `${API_URL2}/getOutstandingBalance/${user.id}`,
      {
        cache: 0,
        bill_type: 835
      }
    );

    const headers = await Util.getCommonAuth();
    return ApiCommon.getReq(url, headers);
  },


  generateOtp: async (mobile) => {
    const payload = {
      identity: mobile,
      app_roles: ["member", "resident", "tenant"]
    };
    const url = `${API_URL2}/generateotp`;
    return ApiCommon.postReq(url, payload);
  },

  verifyOtp: async (payload) => {
    try {

      const url = `${API_URL2}/validateotp`;

      const response = await ApiCommon.postReq(url, payload);

      return response;

    } catch (error) {

      console.error("OTP Verify API Error:", error);

      throw error;

    }
  },

  getMyAccounts: async (token) => {
    const url = `${API_URL2}/getmyaccounts?token=${token}`;
    return ApiCommon.getReq(url);
  },


  loginUser: async (data) => {
    try {
      const url = `${API_URL2}/login`;
      return await ApiCommon.postReq(url, data);
    } catch (error) {
      console.error("Login API Error:", error);
      throw error;
    }
  },


  // ✅ FIXED
  logMeIn: async (token, account) => {
    try {

      // ✅ token in URL, account object in POST body
      const url = `${API_URL2}/logmein?token=${token}`;

      console.log("LOGMEIN URL:", url);
      console.log("LOGMEIN BODY:", JSON.stringify(account));

      const response = await ApiCommon.postReq(url, account);
      return response;

    } catch (error) {
      console.error("logMeIn API Error:", error);
      throw error;
    }
  },


  getMyNotices: async (category = "COMMON") => {
    const user = await Common.getLoggedInUser();

    const uObj = {
      user_id: user.id,
      group_id: user.role_id,
      flat_no: user.flat_no,
      unit_id: user.unit_id,
      society_id: user.societyId
    };

    const url =
      `${API_URL2}/myNotices` +
      `?api-token=${user.api_token}` +
      `&user-id=${encodeURIComponent(JSON.stringify(uObj))}` +
      `&category=${category}`;

    const headers = await Util.getCommonAuth();
    return ApiCommon.getReq(url, headers);
  },

  getFacilityStaffCategory: async () => {
    const user = await Common.getLoggedInUser();
    if (!user) throw new Error("User not logged in");

    const url = await ismServices.appendParamsInUrl(
      `${API_URL2}/society/${user.societyId}/constant`,
      { type: "FACILITY_STAFF_CATEGORY" }
    );

    const headers = await Util.getCommonAuth();
    return ApiCommon.getReq(url, headers);
  },

  // 🔥 Common param handler
  appendParamsInUrl: async (url, extraParams = {}) => {
    const user = await Common.getLoggedInUser();

    const uObj = {
      user_id: user.id,
      group_id: user.role_id,
      flat_no: user.flat_no,
      unit_id: user.unit_id,
      society_id: user.societyId
    };

    const u = JSON.stringify(uObj);

    const commonParams = {
      "api-token": user.api_token,
      "user-id": u,
      "group-id": user.role_id,
      "app_id": "ism_resident"
    };

    const finalParams = {
      ...commonParams,
      ...extraParams
    };

    const queryParams = Object.keys(finalParams)
      .filter(key => finalParams[key] !== null && finalParams[key] !== undefined)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(finalParams[key])}`)
      .join("&");

    if (queryParams) {
      url += url.includes("?") ? "&" : "?";
      url += queryParams;
    }

    return url;
  }

};

export { ismServices };