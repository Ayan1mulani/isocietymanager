import React from "react";
import {
  View,
  // Text, <── REMOVED
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { usePermissions } from "../../Utils/ConetextApi";
import { hasPermission } from "../../Utils/PermissionHelper";
import BRAND from "../config";

const COLORS = BRAND.COLORS;

// 1. ── NEW: Import your global Text component ──
import Text from '../components/TranslatedText'; 

const SCREEN_WIDTH = Dimensions.get("window").width;

// 2. ── Keep these in English so they match your JSON keys exactly ──
const ACTIONS = [
  { id: "1", title: "Pass", icon: "create-outline", screen: "Visitors", module: "VMS", action: "R" },
  { id: "2", title: "Amenities", icon: "bookmark-outline", screen: "AmenitiesListScreen", module: "FBK", action: "R" },
  { id: "3", title: "Raise Request", icon: "chatbox-ellipses-outline", screen: "CategorySelection", module: "COM", action: "C" },
  { id: "4", title: "Bookings", icon: "calendar-outline", screen: "MyBookings", module: "FBK", action: "R" },
  { id: "5", title: "My Vehicles", icon: "car-outline", screen: "MyVehiclesScreen", module: "VEH", action: "R" },
];

const QuickActionsScreen = () => {
  const navigation = useNavigation();
  const { permissions } = usePermissions();

  const permissionsLoaded = permissions !== null && permissions !== undefined;

  const visibleActions = ACTIONS.filter((item) => {
    if (!permissionsLoaded) return false;
    if (!item.module) return true;
    return hasPermission(permissions, item.module, item.action);
  }).slice(0, 5); 

  return (
    <View style={styles.container}>
      {visibleActions.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => navigation.navigate(item.screen)}
        >
          <View style={styles.iconWrapper}>
            <Ionicons
              name={item.icon}
              size={22}
              color={COLORS.primary}
            />
          </View>

          {/* 3. ── Automatically handled by global <Text> ── */}
          <Text style={styles.label} numberOfLines={1}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default QuickActionsScreen;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent:"space-evenly",
    paddingHorizontal: 16,
    marginTop: 8,
    
  },
  card: {
    alignItems: "center",
    width: SCREEN_WIDTH / 5 - 14, 
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
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
});