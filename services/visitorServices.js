import { ApiCommon } from "./ApiCommon"
import { Common } from "./Common";
import { Util } from "./Util";
import { API_URL2, API_URL4 } from "../app/config/env";

const visitorServices = {

getMyVisitors: async () => {
  const user = await Common.getLoggedInUser();

  const payload = {
    input: "",
    residentId: user.unit_id || user.id
  };

  // ✅ Use appendParamsInUrl so all common params (including app_id) are added
  const url = await visitorServices.appendParamsInUrl(
    `${API_URL4}/v1/society/${user.societyId}/getVisitsForResident`
  );

  const headers = await Util.getCommonAuth();
  console.log(headers)

  console.log("FINAL URL:", url);

  const response = await ApiCommon.postReq(url, payload, headers);

  return response;
},

  getParkingBookings: async () => {
    const user = await Common.getLoggedInUser();

    const url = await visitorServices.appendParamsInUrl(
      `${API_URL2}/society/${user.societyId}/bookings`
    );

    const headers = await Util.getCommonAuth();

    return ApiCommon.getReq(url, headers);
  },
  getMyPasses: async () => {
    const user = await Common.getLoggedInUser()

    const params = {
      "api-token": user.api_token,
      "user-id": user.id,
    };
    const paylod = {
      input: "",
      residentId: user.unit_id || user.id
    }
    const url = await visitorServices.appendParamsInUrl(`${API_URL4}/v1/society/${user.societyId}/searchPass`);
    const headers = await Util.getCommonAuth()
    const response = await ApiCommon.postReq(url, paylod, headers);
    console.log(response, "response")
    return response
  },

  getSocietyImages: async () => {

    const user = await Common.getLoggedInUser();

    const params = {
      "api-token": user.api_token,
      "user-id": JSON.stringify({
        user_id: user.id,
        group_id: user.group_id,
        flat_no: user.flat_no,
        unit_id: user.id,
        society_id: user.societyId
      })
    };

    const url = await visitorServices.appendParamsInUrl(
      `${API_URL2}/getsocietyimages`
    );

    const headers = await Util.getCommonAuth();

    const response = await ApiCommon.getReq(url, params, headers);

    console.log("Society Images:", response?.data);

    return response;

  },

  getParkingLocations: async () => {
    const user = await Common.getLoggedInUser();

    const url = await visitorServices.appendParamsInUrl(
      `${API_URL2}/${user.societyId}/locations`,
      { type: "PARKING" }
    );


    const headers = await Util.getCommonAuth();

    return ApiCommon.getReq(url, headers);
  },

  getParkingFormFields: async () => {
    const user = await Common.getLoggedInUser();

    const url = await visitorServices.appendParamsInUrl(
      `${API_URL4}/v1/society/${user.societyId}/getfields`,
      {
        form_type: "PARKING_FORM",
        default: 1
      }
    );

    const headers = await Util.getCommonAuth();

    return ApiCommon.getReq(url, headers);
  },

  acceptVisitor: async (visitId) => {

  const user = await Common.getLoggedInUser();

  const url = await visitorServices.appendParamsInUrl(
    `${API_URL4}/v1/society/${user.societyId}/allowVisit`
  );

  const headers = await Util.getCommonAuth();

  const payload = {
    allow: 1,
    visitId: visitId
  };

  return ApiCommon.postReq(url, payload, headers);
},
denyVisitor: async (visitId) => {

  const user = await Common.getLoggedInUser();

  const url = await visitorServices.appendParamsInUrl(
    `${API_URL4}/v1/society/${user.societyId}/allowVisit`
  );

  const headers = await Util.getCommonAuth();

  const payload = {
    allow: 0,
    visitId: visitId
  };

  return ApiCommon.postReq(url, payload, headers);
},
visitAttended: async (visitId) => {

  const user = await Common.getLoggedInUser();

  const url = await visitorServices.appendParamsInUrl(
    `${API_URL4}/v1/society/${user.societyId}/visitAttended`
  );

  const headers = await Util.getCommonAuth();

  const payload = {
    user_id: JSON.stringify({
      user_id: user.id,
      group_id: user.role_id,
      flat_no: user.flat_no,
      unit_id: user.unit_id,
      society_id: user.societyId
    }),
    visit_id: visitId
  };

  return ApiCommon.postReq(url, payload, headers);
},


  // testIVRCall: async () => {
  //   try {

  //     const user = await Common.getLoggedInUser();

  //     const url = await visitorServices.appendParamsInUrl(
  //       `${API_URL4}/v1/society/${user.societyId}/resident/${user.unit_id}/testivrring`
  //     );

  //     const headers = await Util.getCommonAuth();

  //     const payload = {
  //       test: true
  //     };

  //     const response = await ApiCommon.postReq(url, payload, headers);

  //     console.log("IVR Test Response:", response);

  //     return response;

  //   } catch (error) {

  //     console.log("IVR Test Error:", error);

  //     throw error;

  //   }
  // },


  bookParking: async (payload) => {
    const user = await Common.getLoggedInUser();

    const url = await visitorServices.appendParamsInUrl(
      `${API_URL2}/${user.societyId}/my/bookLocation`
    );

    const headers = await Util.getCommonAuth();

    return ApiCommon.postReq(url, payload, headers);
  },




  addMyVisitor: async (data) => {
    const user = await Common.getLoggedInUser()
    const url = await visitorServices.appendParamsInUrl(
      `${API_URL4}/v2/society/${user.societyId}/createallpass`

    )

    const headers = await Util.getCommonAuth()



    return ApiCommon.postReq(url, data, headers)
  },

  getVisitById: async (visitId) => {

    const user = await Common.getLoggedInUser();

    const url = await visitorServices.appendParamsInUrl(
      `${API_URL4}/v1/society/${user.societyId}/getVisitById`,
      { id: visitId }
    );

    const headers = await Util.getCommonAuth();

    return ApiCommon.getReq(url, headers);

  },




  getStaffCategories: async () => {
    const user = await Common.getLoggedInUser()
    const params = {
      "api-token": user.api_token,
      "user-id": user.id,
    };

    const url = visitorServices.appendParamsInUrl(`${API_URL4}/v1/society/${user.societyId}/allstaffcategory`, params);
    const headers = await Util.getCommonAuth()
    const response = await ApiCommon.getReq(url, headers);
    return response
  },

  addFamilyMember: async (memberData) => {
    try {
      const user = await Common.getLoggedInUser();

      // Build URL with common params
      const url = await visitorServices.appendParamsInUrl(
        `${API_URL2}/addFamilyMember`
      );

      const headers = await Util.getCommonAuth();

      // Payload exactly as backend expects
      const payload = {
        name: memberData.name,
        phone_no: memberData.phone_no,
        email: memberData.email,
        relation: memberData.relation,
        vehicle_no: memberData.vehicle_no,
        image_src: memberData.image_src || null,
      };

      const response = await ApiCommon.postReq(url, payload, headers);

      return response;
    } catch (error) {
      console.log("Add Family Member Error:", error);
      throw error;
    }
  },
  getFamilyMembers: async () => {
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

      const url = `${API_URL2}/${user.societyId}/${encodedUser}/members?api-token=${user.api_token}&user-id=${encodedUser}`;

      const headers = await Util.getCommonAuth();

      const response = await ApiCommon.getReq(url, headers);

      return response;

    } catch (error) {
      console.log("Get Family Members Error:", error);
      throw error;
    }
  },

  getMyStaffs: async (category) => {
    const user = await Common.getLoggedInUser()
    const params = {
      "api-token": user.api_token,
      "user-id": user.id,
      "category": category || null,
    };

    const url = visitorServices.appendParamsInUrl(`${API_URL4}/v1/society/${user.societyId}/staffbycategory`, params);
    const headers = await Util.getCommonAuth()
    const response = await ApiCommon.getReq(url, headers);
    return response
  },


   extendVisitTime: async (visitId, extendByHours) => {
    try {
      const user = await Common.getLoggedInUser();

      const url = await visitorServices.appendParamsInUrl(
        `${API_URL4}/v1/society/${user.societyId}/extendvisittime`
      );

      const headers = await Util.getCommonAuth();

      // The backend expects resident_id to be a stringified JSON object
      const residentObj = {
        user_id: user.id,
        group_id: user.role_id,
        flat_no: user.flat_no,
        unit_id: user.unit_id,
        society_id: user.societyId
      };

      const payload = {
        extendby: extendByHours,
        resident_id: JSON.stringify(residentObj),
        visit_id: visitId
      };

      return await ApiCommon.postReq(url, payload, headers);

    } catch (error) {
      console.log("Extend Visit Time Error:", error);
      throw error;
    }
  },
  cancelPass: async (passId) => {
    const user = await Common.getLoggedInUser();

    const url = await visitorServices.appendParamsInUrl(
      `${API_URL4}/v2/society/${user.societyId}/cancelpass`
    );

    const headers = await Util.getCommonAuth();

    const payload = {
      id: passId,
    };

    return ApiCommon.postReq(url, payload, headers);
  },

  updateFamilyMember: async (memberData) => {
    try {

      const user = await Common.getLoggedInUser();

      const url = await visitorServices.appendParamsInUrl(
        `${API_URL2}/updatefamilymember`
      );

      const headers = await Util.getCommonAuth();

      const payload = {
        id: memberData.id,
        name: memberData.name,
        phone_no: memberData.phone_no,
        email: memberData.email,
        relation: memberData.relation,
        vehicle_no: memberData.vehicle_no,
        image_src: memberData.image_src || null,
      };

      return ApiCommon.putReq(url, payload, headers);

    } catch (error) {
      console.log("Update Member Error:", error);
      throw error;
    }
  },
  deleteFamilyMember: async (memberId) => {
    try {

      const url = await visitorServices.appendParamsInUrl(
        `${API_URL2}/deleteFamilyMember/${memberId}`
      );

      const headers = await Util.getCommonAuth();

      return ApiCommon.delReq(url, null, headers);

    } catch (error) {
      console.log("Delete Member Error:", error);
      throw error;
    }
  },

appendParamsInUrl: async (url, extraParams = {}) => {
  const user = await Common.getLoggedInUser();

  const uObj = {
    user_id: user.id,
    group_id: user.role_id,
    flat_no: user.flat_no,
    unit_id: user.unit_id,
    society_id: user.societyId
  };

  // Encode only quotes like backend expects
  const u = JSON.stringify(uObj).replace(/"/g, "%22");

  const commonParams = {
    "api-token": user.api_token,
    "user-id": `{${u.slice(1, -1)}}`
  };

  const finalParams = {
    ...commonParams,
    ...extraParams
  };

  const queryParams = Object.keys(finalParams)
    .filter(key => finalParams[key] !== null && finalParams[key] !== undefined)
    .map(key => `${key}=${finalParams[key]}`)
    .join("&");

  if (queryParams) {
    url += url.includes("?") ? "&" : "?";
    url += queryParams;
  }

  return url;
}


}

export { visitorServices }