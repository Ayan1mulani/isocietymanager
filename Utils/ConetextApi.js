// src/Utils/ConetextApi.js

import { createContext, useContext, useState, useEffect } from 'react';
import { ismServices } from '../services/ismServices';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  const [nightMode, setNightMode]         = useState(false);
  const [flatNo, setFlatNo]               = useState(null);
  const [permissions, setPermissions]     = useState(null);
  // const [pendingVisitor, setPendingVisitor] = useState(null); // ✅ ADD THIS

  const loadPermissions = async () => {
    try {
      const userInfo = await AsyncStorage.getItem("userInfo");

      if (!userInfo) {
        console.log("No user session, skipping permission load");
        return;
      }

      const parsedUser = JSON.parse(userInfo);

      if (parsedUser?.permissions) {
        setPermissions(parsedUser.permissions);
        return;
      }

      const res = await ismServices.getUserProfileData();

      if (res?.data?.permissions) {
        setPermissions(res.data.permissions);
      }

    } catch (error) {
      console.log("Failed to load permissions:", error);
    }
  };

  useEffect(() => {
    loadPermissions();
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