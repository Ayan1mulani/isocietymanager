// const ApiCommon = {
//     getReq : (url, headers) => {
//         return ApiCommon.fetchReq(url, 'GET', null, headers)
//     },
//     postReq : (url, data, headers) => {
//         return ApiCommon.fetchReq(url, 'POST', data, headers)
//     },
//     putReq : (url, data, headers) => {
//         return ApiCommon.fetchReq(url, 'PUT', data, headers)
//     },
//     delReq : (url, data, headers) => {
//         return ApiCommon.fetchReq(url, 'DELETE', data, headers)
//     },


// fetchReq: async (url, method, data, headers = {}) => {
//   const conf = {
//     method,
//     headers: {
//       "Content-Type": "application/json",
//       ...headers,
//     },
//   };

//   // Only attach body for non-GET requests
//   if (method !== "GET" && data) {
//     conf.body = JSON.stringify(data);
//   }

//   const response = await fetch(url, conf);

//   // 🔍 Better error visibility
//   if (!response.ok) {
//     const errorText = await response.text();
//     console.error("❌ SERVER ERROR:", errorText);
//     throw new Error(errorText || `HTTP error! Status: ${response.status}`);
//   }

//   // ✅ Ensure JSON response
//   const contentType = response.headers.get("content-type");
//   if (contentType && contentType.includes("application/json")) {
//     return await response.json();
//   }

//   // Fallback if backend sends HTML/text by mistake
//   const text = await response.text();
//   throw new Error(`Expected JSON, got: ${text}`);
// },


// }

// //
// export {
//     ApiCommon
// };




const ApiCommon = {
    getReq : (url, headers) => {
        return ApiCommon.fetchReq(url, 'GET', null, headers)
    },
    postReq : (url, data, headers) => {
        return ApiCommon.fetchReq(url, 'POST', data, headers)
    },
    putReq : (url, data, headers) => {
        return ApiCommon.fetchReq(url, 'PUT', data, headers)
    },
    delReq : (url, data, headers) => {
        return ApiCommon.fetchReq(url, 'DELETE', data, headers)
    },
   fetchReq: async (url, method, data, headers = {}) => {

  const conf = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (method !== "GET" && data) {
    conf.body = JSON.stringify(data);
  }
  console.log("conf",conf , url)

  const response = await fetch(url, conf);

  // handle server errors
  if (!response.ok) {
    const text = await response.text();
    console.error("API ERROR:", text);
    throw new Error(text || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();
  throw new Error("Invalid response: " + text);
}
}



//
export {
    ApiCommon
};