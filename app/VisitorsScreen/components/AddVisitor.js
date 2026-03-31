import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { usePermissions } from "../../../Utils/ConetextApi";
import { useRoute } from "@react-navigation/native";
import SingleVisitorForm from "../singleMultiVisits/SingleVisitorForm";
import FrequentVisitorForm from "../singleMultiVisits/FrequentVisitorForm";
import SingleDeliveryForm from "../singleMultiVisits/DeliverySingleForm";
import FrequentDeliveryForm from "../singleMultiVisits/DeliveryFrequentForm";
import SingleCabForm from "../singleMultiVisits/SingleCabForm";
import CabFrequentForm from "../singleMultiVisits/CabFrequentForm";
import AddPreApprovedVisitor from "../singleMultiVisits/AddPreApproved";
import AddPreApprovedMulti from "../singleMultiVisits/AddPreApprovedMulti";


const AddVisitor = ({ navigation }) => {
  const { nightMode } = usePermissions();
  const route = useRoute();
  const parentOnGoBack = route.params?.onGoBack;
const { type: visitorType } = route.params || {};  

  const [visitMode, setVisitMode] = useState("single");
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleToggle = (mode) => {
    setVisitMode(mode);

    Animated.spring(slideAnim, {
      toValue: mode === "single" ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  };

  const theme = {
    bg: nightMode ? "#0F0F0F" : "#ffffff",
    cardBg: nightMode ? "#1A1A1A" : "#FFFFFF",
    text: nightMode ? "#FFFFFF" : "#1F2937",
    textSecondary: nightMode ? "#9CA3AF" : "#6B7280",
    inputBg: nightMode ? "#2A2A2A" : "#F9FAFB",
    border: nightMode ? "#374151" : "#E5E7EB",
    primaryBlue: "#1D9BF0",
  };

  const renderForm = () => {
  const type = visitorType || "guest";

if (type === "guest") {
  return visitMode === "single"
    ? <SingleVisitorForm theme={theme} onGoBack={parentOnGoBack} />
    : <FrequentVisitorForm theme={theme} onGoBack={parentOnGoBack} />;
}

if (type === "delivery") {
  return visitMode === "single"
    ? <SingleDeliveryForm theme={theme}  onGoBack={parentOnGoBack}/>
    : <FrequentDeliveryForm theme={theme}  onGoBack={parentOnGoBack}/>;
}

if (type === "cab") {
  return visitMode === "single"
    ? <SingleCabForm theme={theme}  onGoBack={parentOnGoBack}/>
    : <CabFrequentForm theme={theme} onGoBack={parentOnGoBack} />;
}
if (type === "others") {
      // Only show frequent form here
      return visitMode === "single"
        ? <AddPreApprovedVisitor theme={theme} onGoBack={parentOnGoBack} />
        : <AddPreApprovedMulti/>;
    }

  return null;
};
const getHeaderTitle = () => {
  const type = visitorType || "guest";

  if (type === "guest") return "Invite Guest";
  if (type === "delivery") return "Schedule Delivery";
  if (type === "cab") return "Book Cab Entry";
  if (type === "others") return "Add Visitor";

  return "Add Visitor";
};


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      
      {/* Header */}
      <View
  style={[
    styles.headerContainer,
    {
      backgroundColor: theme.cardBg,
      borderBottomColor: theme.border,
    },
  ]}
>
  {/* Back Button */}
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => navigation.goBack()}
    activeOpacity={0.7}
  >
    < Ionicons name="arrow-back" size={22} color={theme.text} />
  </TouchableOpacity>

  {/* Title + Subtitle */}
  <View style={styles.headerTextContainer}>
    <Text style={[styles.headerTitle, { color: theme.text }]}>
      {getHeaderTitle()}
    </Text>

    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
      {visitorType === "others"
        ? "Allow trusted services to visit"
        : visitorType === "delivery"
        ? "Schedule delivery entry"
        : visitorType === "cab"
        ? "Manage cab entries"
        : "Schedule a guest visit"}
    </Text>
  </View>


</View>

    

      {/* Toggle */}
      {/* <View style={styles.toggleWrapper}>
        <View style={styles.toggleContainer}>
          <Animated.View
            style={[
              styles.toggleSlider,
              {
                backgroundColor: theme.primaryBlue,
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200], // adjust if needed
                    }),
                  },
                ],
              },
            ]}
          />

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleToggle("single")}
          >
            <Text
              style={[
                styles.toggleText,
                visitMode === "single" && styles.toggleTextActive,
              ]}
            >
              One-Time Visit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleToggle("frequent")}
          >
            <Text
              style={[
                styles.toggleText,
                visitMode === "frequent" && styles.toggleTextActive,
              ]}
            >
             Repeat Visits
            </Text>
          </TouchableOpacity>
        </View>
      </View> */}

      {/* Form Section */}
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
         {renderForm()}
     
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddVisitor;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  toggleWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
  },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    padding: 4,
    position: "relative",
    overflow: "hidden",
  },

  toggleSlider: {
    position: "absolute",
    width: "50%",
    height: "120%",
    borderRadius: 16,
  },

  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    zIndex: 1,
  },

  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  toggleTextActive: {
    color: "#FFFFFF",
  },
  headerContainer: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderBottomWidth: 1,
},

backButton: {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
},

headerTextContainer: {
  flex: 1,
},

headerTitle: {
  fontSize: 18,
  fontWeight: "700",
},

headerSubtitle: {
  fontSize: 12,
  marginTop: 2,
  fontWeight: "500",
},

notificationButton: {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "flex-end",
},

notificationDot: {
  position: "absolute",
  top: 10,
  right: 3,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#EF4444",
},
});