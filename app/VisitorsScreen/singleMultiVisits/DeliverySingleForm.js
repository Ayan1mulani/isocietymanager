import React, { useState } from "react";
import {
  View, StyleSheet, TouchableOpacity,
  ScrollView, TextInput
} from "react-native";
import ProviderSelector from "../components/ProviderSelector";
import CalendarSelector from "../components/Calender";
import StatusModal from "../../components/StatusModal";
import { visitorServices } from "../../../services/visitorServices";
import { useNavigation } from "@react-navigation/native";
import BRAND from "../../config";
import SubmitButton from "../../components/SubmitButton";
import { useRoute } from "@react-navigation/native";

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../../components/TranslatedText';

const SingleDeliveryForm = ({ theme }) => {
  const { t } = useTranslation(); // 👈 Init translation
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [visitDate, setVisitDate] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [errors, setErrors] = useState({});
  const navigation = useNavigation();

  const route = useRoute();
  const onGoBack = route.params?.onGoBack;

  const handleSubmit = async () => {
    let newErrors = {};

    if (!selectedProvider) {
      newErrors.provider = t("Please select delivery company");
    }

    if (isCustom && !customName.trim()) {
      newErrors.custom = t("Please enter company name");
    }

    if (!visitDate) {
      newErrors.date = t("Please select visit date");
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
        company_name: isCustom ? customName : selectedProvider, 
        type: "delivery",
      };

      setModalType("loading");
      const res = await visitorServices.addMyVisitor(payload);

      if (res) {
        setModalType("success");
        setTimeout(() => {
          setModalType(null);
          if (onGoBack) onGoBack();
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
    <>
      <ScrollView showsVerticalScrollIndicator={false}>

        <ProviderSelector
          visitorType="delivery"
          theme={theme}
          required={true}
          selectedProvider={selectedProvider}
          setSelectedProvider={(val) => {
            setSelectedProvider(val);
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

        {isCustom && (
          <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 10 }]}>
            <Text style={[styles.label, { color: theme.text }]}>
              {t("Enter Delivery Company")}
            </Text>
            <TextInput
              value={customName}
              onChangeText={(text) => {
                setCustomName(text);
                if (errors.custom)
                  setErrors((prev) => ({ ...prev, custom: null }));
              }}
              placeholder={t("Enter company name")}
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { color: theme.text }]}
            />
            {errors.custom && (
              <Text style={styles.errorText}>{errors.custom}</Text>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <CalendarSelector
            selectedDate={visitDate}
            onDateSelect={(date) => {
              setVisitDate(date);
              if (errors.date)
                setErrors((prev) => ({ ...prev, date: null }));
            }}
            label={t("Visit Date")}
            required={true}
            nightMode={false}
          />
          {errors.date && (
            <Text style={styles.errorText}>{errors.date}</Text>
          )}
        </View>

        <SubmitButton
          title={t("Schedule Delivery")}
          onPress={handleSubmit}
          loading={modalType === "loading"}
        />

      </ScrollView>

      <StatusModal
        visible={!!modalType}
        type={modalType}
        title={
          modalType === "loading" ? t("Scheduling...")
            : modalType === "success" ? t("Delivery Scheduled")
              : t("Failed!")
        }
        subtitle={
          modalType === "loading" ? t("Please wait")
            : modalType === "success" ? t("Delivery pass created")
              : t("Please try again")
        }
      />
    </>
  );
};

export default SingleDeliveryForm;

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4, marginLeft: 16 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
});