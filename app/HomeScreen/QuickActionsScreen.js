import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { usePermissions } from "../../Utils/ConetextApi";
import { hasPermission } from "../../Utils/PermissionHelper";
import BRAND from "../config";

import Text from '../components/TranslatedText'; 
// 1. ── IMPORT THE MODAL ──
import PreApproveModal from '../VisitorsScreen/components/AddPreVisitorModal'; 

const COLORS = BRAND.COLORS;
const SCREEN_WIDTH = Dimensions.get("window").width;

const ACTIONS = [
  // Notice: If this is for creating a pass, you might want to change action: "R" to action: "C" later!
  { id: "1", title: "Pass", icon: "create-outline", screen: "Visitors", module: "VMS", action: "C" },
  { id: "2", title: "Amenities", icon: "bookmark-outline", screen: "AmenitiesListScreen", module: "FBK", action: "R" },
  { id: "3", title: "Raise Request", icon: "chatbox-ellipses-outline", screen: "CategorySelection", module: "COM", action: "C" },
  { id: "4", title: "Bookings", icon: "calendar-outline", screen: "MyBookings", module: "FBK", action: "R" },
  { id: "5", title: "My Vehicles", icon: "car-outline", screen: "MyVehiclesScreen", module: "VEH", action: "R" },
];

const QuickActionsScreen = () => {
  const navigation = useNavigation();
  
  // 2. ── ADD STATE FOR MODAL AND EXTRACT nightMode ──
  const { permissions, nightMode } = usePermissions();
  const [showPreApproveModal, setShowPreApproveModal] = useState(false);

  const permissionsLoaded = permissions !== null && permissions !== undefined;

  const visibleActions = ACTIONS.filter((item) => {
    if (!permissionsLoaded) return false;
    if (!item.module) return true;
    return hasPermission(permissions, item.module, item.action);
  }).slice(0, 5); 

  return (
    // 3. ── WRAP IN FRAGMENT <> TO HOLD BOTH VIEW AND MODAL ──
    <>
      <View style={styles.container}>
        {visibleActions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => {
              // 4. ── INTERCEPT THE 'PASS' CLICK ──
              if (item.id === "1") {
                setShowPreApproveModal(true);
              } else {
                navigation.navigate(item.screen);
              }
            }}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name={item.icon}
                size={22}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.label} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 5. ── RENDER THE MODAL AT THE BOTTOM ── */}
      <PreApproveModal
        visible={showPreApproveModal}
        nightMode={nightMode}
        onClose={() => setShowPreApproveModal(false)}
        onDelivery={() => {
          setShowPreApproveModal(false);
          navigation.navigate('AddVisitor', { type: 'delivery' });
        }}
        onGuest={() => {
          setShowPreApproveModal(false);
          setTimeout(() => navigation.navigate('AddVisitor', { type: 'guest' }), 200);
        }}
        onCab={() => {
          setShowPreApproveModal(false);
          setTimeout(() => navigation.navigate('AddVisitor', { type: 'cab' }), 200);
        }}
        onOthers={() => {
          setShowPreApproveModal(false);
          setTimeout(() => navigation.navigate('AddVisitor', { type: 'others' }), 200);
        }}
      />
    </>
  );
};

export default QuickActionsScreen;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 4,
    marginTop: 8,
  },
  card: {
    alignItems: "center",
    width: SCREEN_WIDTH / 5 - 8,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.iconBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.iconBorder,
    elevation: 2,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
});