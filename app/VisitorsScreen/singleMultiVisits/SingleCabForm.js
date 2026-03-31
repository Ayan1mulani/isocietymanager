import React, { useState , useRef} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";

import ProviderSelector from "../components/ProviderSelector";
import CalendarSelector from "../components/Calender";
import StatusModal from "../../components/StatusModal";
import { visitorServices } from "../../../services/visitorServices";
import SubmitButton from "../../components/SubmitButton";
import { useNavigation, useRoute } from "@react-navigation/native";

const SingleCabForm = ({ theme, onGoBack }) => {
    const navigation = useNavigation();
    const hasChanges = useRef(false);


  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [visitDate, setVisitDate] = useState(null);
  const [vehicleNo, setVehicleNo] = useState("");
  // const [entriesPerDay, setEntriesPerDay] = useState(1);
  const [errors, setErrors] = useState({});
  const [modalType, setModalType] = useState(null);

  const handleVehicleChange = (text) => {
    const numeric = text.replace(/[^0-9]/g, "");
    setVehicleNo(numeric.slice(0, 4));

    if (errors.vehicle) {
      setErrors((prev) => ({ ...prev, vehicle: null }));
    }
  };

  const handleSubmit = async () => {
    let newErrors = {};

    if (!selectedProvider) {
      newErrors.provider = "Please select cab company";
    }

    // 👉 custom validation
    if (isCustom && !customName.trim()) {
      newErrors.custom = "Please enter company name";
    }

    if (!visitDate) {
      newErrors.date = "Please select visit date";
    }

    if (!vehicleNo || vehicleNo.length !== 4) {
      newErrors.vehicle = "Enter 4-digit cab number";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      const formattedDate =
        visitDate instanceof Date
          ? visitDate.toISOString().split("T")[0]
          : visitDate;

      const payload = {
        date_time: formattedDate,
        company_name: isCustom
          ? customName
          : selectedProvider?.name || selectedProvider,
        cab_number: vehicleNo,
        type: "cab",
      };

      setModalType("loading");

      const res = await visitorServices.addMyVisitor(payload);

      if (res) {
        setModalType("success");
        setTimeout(() => {
          setModalType(null);

          if (onGoBack) {
            onGoBack(); // ✅ refresh VisitorSection
          }

          navigation.goBack();
        }, 1400);
      } else {
        setModalType("error");
        setTimeout(() => setModalType(null), 2000);
      }
    } catch (error) {
      setModalType("error");
      setTimeout(() => setModalType(null), 2000);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.cardBg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Provider */}
        <ProviderSelector
          visitorType="cab"
          theme={theme}
          required={true}
          selectedProvider={selectedProvider}
          setSelectedProvider={(val) => {
            setSelectedProvider(val);

            // Handle Custom Selection
            if (val === "Custom") {
              setIsCustom(true);
            } else {
              setIsCustom(false);
              setCustomName("");
            }

            if (errors.provider)
              setErrors((prev) => ({ ...prev, provider: null }));
          }}
          stylesFromParent={styles}
        />
        {errors.provider && (
          <Text style={styles.errorText}>{errors.provider}</Text>
        )}

        {/* Custom Company Name Input */}
        {isCustom && (
          <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 10 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Enter Cab Company</Text>

            <TextInput
              value={customName}
              onChangeText={(text) => {
                setCustomName(text);

                if (errors.custom) {
                  setErrors((prev) => ({ ...prev, custom: null }));
                }
              }}
              placeholder="Enter company name"
              placeholderTextColor={theme.textSecondary || "#9CA3AF"}
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg || "#fff",
                  borderColor: theme.border || "#E5E7EB",
                  color: theme.text,
                }
              ]}
            />

            {errors.custom && (
              <Text style={styles.errorText}>{errors.custom}</Text>
            )}
          </View>
        )}

        {/* Visit Date */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <CalendarSelector
            selectedDate={visitDate}
            onDateSelect={(date) => {
              setVisitDate(date);
              if (errors.date)
                setErrors((prev) => ({ ...prev, date: null }));
            }}
            label="Visit Date"
            required={true}
            nightMode={false}
          />
          {errors.date && (
            <Text style={styles.errorText}>{errors.date}</Text>
          )}
        </View>

        {/* Vehicle */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.label, { color: theme.text }]}>
            Vehicle Number (Last 4 Digits) <Text style={{ color: "#EF4444" }}>*</Text>
          </Text>

          <TextInput
            value={vehicleNo}
            onChangeText={handleVehicleChange}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            placeholderTextColor={theme.textSecondary || "#9CA3AF"}
            style={[
              styles.vehicleInput,
              {
                backgroundColor: theme.inputBg || "#fff",
                borderColor: theme.border || "#E5E7EB",
                color: theme.text,
              },
            ]}
          />
          {errors.vehicle && (
            <Text style={styles.errorText}>{errors.vehicle}</Text>
          )}
        </View>

      </ScrollView>

      {/* Sticky Button */}
      <SubmitButton
        title="Schedule Cab"
        onPress={handleSubmit}
        loading={modalType === "loading"}
      />

      {/* Reusable Modal */}
      <StatusModal
        visible={!!modalType}
        type={modalType}
        title={
          modalType === "loading"
            ? "Scheduling..."
            : modalType === "success"
              ? "Cab Scheduled"
              : "Failed!"
        }
        subtitle={
          modalType === "loading"
            ? "Please wait"
            : modalType === "success"
              ? "Cab pass created"
              : "Please try again"
        }
      />
    </View>
  );
};

export default SingleCabForm;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },

  vehicleInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: "600",
  },

  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  counterBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  counterText: {
    fontSize: 18,
    fontWeight: "600",
  },

  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
});