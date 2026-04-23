// src/Utils/ConetextApi.js

import { createContext, useContext, useState, useEffect } from 'react';
import { ismServices } from '../services/ismServices';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  const [nightMode, setNightMode]         = useState(false);
  const [flatNo, setFlatNo]               = useState(null);
  const [permissions, setPermissions]     = useState(null);

 const loadPermissions = async (force = false) => {
  try {
    const userInfo = await AsyncStorage.getItem("userInfo");

    if (!userInfo) {
      console.log("No user session, skipping permission load");
      return;
    }

    const parsedUser = JSON.parse(userInfo);

    // ✅ Show cached immediately (fast UI)
    if (parsedUser?.permissions && !force) {
      setPermissions(parsedUser.permissions);
    }

    // 🔥 ALWAYS hit API if force OR no cache
    if (force || !parsedUser?.permissions) {
      console.log("🔥 Fetching fresh permissions from API");

      const res = await ismServices.getUserProfileData();

      if (res?.data?.permissions) {
        setPermissions(res.data.permissions);

        // ✅ Update storage also
        const updatedUser = {
          ...parsedUser,
          permissions: res.data.permissions,
        };

        await AsyncStorage.setItem("userInfo", JSON.stringify(updatedUser));
      }
    }

  } catch (error) {
    console.log("Failed to load permissions:", error);
  }
};

 useEffect(() => {
  loadPermissions(true); // 🔥 force on app start
}, []);

  return (
    <PermissionsContext.Provider
      value={{
        nightMode,
        setNightMode,
        flatNo,
        setFlatNo,
        permissions,
        setPermissions,
        loadPermissions,
        // pendingVisitor,        // ✅ ADD THIS
        // setPendingVisitor,     // ✅ ADD THIS
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  return useContext(PermissionsContext);
};