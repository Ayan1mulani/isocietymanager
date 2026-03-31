import { API_URL2 } from "../app/config/env"
import { ApiCommon } from "./ApiCommon"
import { Common } from "./Common";
import { Util } from "./Util";


const formatDate = () => {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0") + " " +
    String(d.getHours()).padStart(2, "0") + ":" +
    String(d.getMinutes()).padStart(2, "0") + ":" +
    String(d.getSeconds()).padStart(2, "0");
};

const complaintService = {


  getMyComplaints: async ({
    status = null,
    page = 1,
    perPage = 10,
  } = {}) => {
    try {
      const user = await Common.getLoggedInUser();

      const params = {
        "api-token": user.api_token,
        "user-id": user.id,
        "status": status,
        "per_page": perPage,
        "page_no": page,
      };

      const url = complaintService.appendParamsInUrl(
        `${API_URL2}/my/complaints`,
        params
      );

      const headers = await Util.getCommonAuth();
      const response = await ApiCommon.getReq(url, headers);

      return response;
    } catch (error) {
      console.log("❌ getMyComplaints Error:", error);
      return { status: "error", data: [], metadata: {} }; // ✅ SAFE fallback
    }
  },
  getSocietyConfigNew: async () => {
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

      const url = `${API_URL2}/my/societyconfig?api-token=${user.api_token}&user-id=${encodedUser}`;

      const headers = await Util.getCommonAuth();

      const response = await ApiCommon.getReq(url, headers);

      console.log("✅ New Society Config:", response);

      return response; // ⚠️ returns DIRECT object
    } catch (error) {
      console.log("❌ New Config API Error:", error);
      throw error;
    }
  },
  updateComplaintStatus: async (complaint) => {
    try {
      const user = await Common.getLoggedInUser();

      const userObj = {
        user_id: user.id,
        group_id: user.role_id,
        flat_no: user.flat_no,
        unit_id: user.unit_id,
        society_id: user.societyId,
      };

      const encodedUser = JSON.stringify(userObj);

      const url = `${API_URL2}/updateComplaint?api-token=${user.api_token}&user-id=${encodedUser}`;

      const headers = await Util.getCommonAuth();

      // 🔥 SEND FULL DATA (VERY IMPORTANT)
      const payload = {
        id: complaint.id,
        status: complaint.status,

        description: complaint.description,
        complaint_type: complaint.complaint_type,
        sub_category: complaint.sub_category,
        sub_category_id: complaint.sub_category_id,
        severity: complaint.severity,
      };

      // ✅ Add only if valid
      if (
        complaint.rating !== undefined &&
        complaint.rating !== null &&
        complaint.rating !== "" &&
        !isNaN(complaint.rating)
      ) {
        payload.rating = String(complaint.rating);
      }

      if (
        complaint.resident_remarks &&
        complaint.resident_remarks.trim().length > 0
      ) {
        payload.resident_remarks = complaint.resident_remarks;
      }

      // ✅ Only for closing
      if (complaint.status === "Closed") {
        payload.closed_at = formatDate();
      }

      console.log("📤 FINAL PAYLOAD:", payload);

      const response = await ApiCommon.putReq(url, payload, headers);

      console.log("✅ Update Complaint Response:", response);

      return response;

    } catch (error) {
      console.log("❌ Update Complaint Error:", error);
      throw error;
    }
  },


  getSocietyConfiguration: async () => {
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

      const url = `${API_URL2}/getSocietyConfigurationToResident/${user.societyId}?api-token=${user.api_token}&user-id=${encodedUser}`;

      const headers = await Util.getCommonAuth();

      const response = await ApiCommon.getReq(url, headers);

      console.log("🏢 Society Config:", response);

      if (response?.status === "success") {
        return response; // or response.data (your choice)
      }

      return null;

    } catch (error) {
      console.log("❌ Config API Error:", error);
      throw error;
    }
  },


  addComment: async (complaintId, message) => {
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

      const url = `${API_URL2}/addComment?api-token=${user.api_token}&user-id=${encodedUser}`;

      const headers = await Util.getCommonAuth();

      const payload = {
        comp_id: complaintId,
        remarks: message
      };

      const response = await ApiCommon.postReq(url, payload, headers);

      console.log("Add Comment Response:", response);

      return response;

    } catch (error) {
      console.log("Add Comment Error:", error);
      throw error;
    }
  },
  getComplaintComments: async (complaintId) => {
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

      const url = `${API_URL2}/comment/${complaintId}?api-token=${user.api_token}&user-id=${encodedUser}`;

      const headers = await Util.getCommonAuth();

      const response = await ApiCommon.getReq(url, headers);

      console.log("Complaint Comments:", response);

      return response;

    } catch (error) {
      console.log("Comments API Error:", error);
      throw error;
    }
  },

  getComplaintStatusCount: async () => {
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

      const url = `${API_URL2}/my/complaintstatuscount?api-token=${user.api_token}&user-id=${encodedUser}`;

      const headers = await Util.getCommonAuth();

      const response = await ApiCommon.getReq(url, headers);

      console.log("Complaint Status Count:", response);

      return response;

    } catch (error) {
      console.log("Complaint Status Count Error:", error);
      throw error;
    }
  },


  getCategories: async () => {
    const user = await Common.getLoggedInUser()
    const params = {
      "api-token": user.api_token,
      "user-id": user.id,
    };



    const url = complaintService.appendParamsInUrl(`${API_URL2}/getcomplaintcategory`, params);
    const headers = await Util.getCommonAuth()
    const response = await ApiCommon.getReq(url, headers);
    console.log(
      "complaint category response:\n",
      JSON.stringify(response, null, 2)
    ); return response
  },


  addComplaint: async ({
    sub_category,
    complaint_type,
    description,
    severity = "normal",
    sub_category_id,
    schedule_date = null,
    probable_date = null,   // ✅ ADD THIS
    probable_time = null,
    location_id = null,
     file = null
  }) => {
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
      const url = `${API_URL2}/addComplaint?api-token=${user.api_token}&user-id=${encodedUser}`;
      const headers = await Util.getCommonAuth();

      const payload = {
        sub_category,
        complaint_type,
        description,
        severity,
        sub_category_id,
        schedule_date,
        probable_date,  
        probable_time,
        location_id,
        file
      };

      const response = await ApiCommon.postReq(url, payload, headers);
      console.log("Add Complaint Response:", response);
      return response;

    } catch (error) {
      console.log("Add Complaint Error:", error);
      throw error;
    }
  },




  appendParamsInUrl: (url, params) => {
    if (params && typeof params === "object") {
      const queryParams = Object.keys(params)
        .filter((key) => params[key] !== null && params[key] !== undefined)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

      if (queryParams) {
        url += url.includes('?') ? '&' : '?';
        url += queryParams;
      }
    }

    return url;
  }

}

export { complaintService }