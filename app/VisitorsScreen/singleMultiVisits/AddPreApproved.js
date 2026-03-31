import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import CalendarSelector from "../components/Calender";

const SingleOthersForm = ({ theme }) => {

  /* ───── Category Groups ───── */

  const popular = [
    { label: "Cook", icon: "restaurant-outline" },
    { label: "Maid", icon: "home-outline" },
    { label: "Driver", icon: "car-outline" },
    { label: "Plumber", icon: "construct-outline" },

  ];

  const utility = [
    { label: "Electrician", icon: "flash-outline" },
    { label: "Plumber", icon: "construct-outline" },
    { label: "AC Service", icon: "snow-outline" },
    { label: "Pest Control", icon: "bug-outline" },
    { label: "Internet Service", icon: "wifi-outline" },
    { label: "Gas Delivery", icon: "flame-outline" },
    { label: "Water Supplier", icon: "water-outline" },
    { label: "Laundry", icon: "shirt-outline" },
  ];

  const otherServices = [
    { label: "Technician", icon: "build-outline" },
    { label: "Gardener", icon: "leaf-outline" },
    { label: "Security", icon: "shield-outline" },
    { label: "Tutor", icon: "book-outline" },
    { label: "Babysitter", icon: "happy-outline" },
    { label: "Carpenter", icon: "hammer-outline" },
    { label: "Painter", icon: "color-palette-outline" },
    { label: "Cleaning Service", icon: "sparkles-outline" },
  ];

  /* ───── States ───── */

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(null);
  const [visitDate, setVisitDate] = useState(null);
  const [entries, setEntries] = useState(1);
  const [vehicleNo, setVehicleNo] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleVehicle = (text) => {
    const numeric = text.replace(/[^0-9]/g, "");
    if (numeric.length <= 4) setVehicleNo(numeric);
  };

  const renderCategoryBlock = (title, list) => (
    <>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {title}
      </Text>

      <View style={styles.grid}>
        {list.map((item) => {
          const active = category === item.label;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.gridItem}
              onPress={() => {
                setCategory(item.label);
                setShowModal(false);
              }}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: active
                      ? theme.primaryBlue
                      : theme.border,
                    borderWidth: 1,
                  },
                ]}
              >
                < Ionicons
                  name={item.icon}
                  size={20}
                  color={
                    active
                      ? theme.primaryBlue
                      : theme.textSecondary
                  }
                />
              </View>

              <Text
                style={[
                  styles.iconLabel,
                  { color: theme.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <>
      {/* Visitor Name */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Visitor Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter name"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
        />
      </View>

      {/* Mobile */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Mobile Number
        </Text>
        <View style={styles.phoneRow}>
          <View style={[styles.codeBox, { borderColor: theme.border }]}>
            <Text style={{ color: theme.text }}>+91</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Enter number"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.phoneInput,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
          />
        </View>
      </View>

      {/* Category */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Select Service
        </Text>

        <View style={styles.grid}>
          {popular.map((item) => {
            const active = category === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.gridItem}
                onPress={() => setCategory(item.label)}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: active
                        ? theme.primaryBlue
                        : theme.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  < Ionicons
                    name={item.icon}
                    size={22}
                    color={
                      active
                        ? theme.primaryBlue
                        : theme.textSecondary
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.iconLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* More Button */}
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setShowModal(true)}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
            >
              < Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={theme.primaryBlue}
              />
            </View>
            <Text style={[styles.iconLabel, { color: theme.textSecondary }]}>
              More
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Visit Date */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <CalendarSelector
          selectedDate={visitDate}
          onDateSelect={setVisitDate}
          label="Visit Date"
          required={true}
          nightMode={false}
        />
      </View>

      {/* Entries */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Entries Per Day
        </Text>

        <View style={styles.counterRow}>
          <TouchableOpacity
            style={[styles.counterBtn, { borderColor: theme.border }]}
            onPress={() => setEntries(Math.max(1, entries - 1))}
          >
            < Ionicons name="remove" size={18} color={theme.primaryBlue} />
          </TouchableOpacity>

          <Text style={[styles.counterText, { color: theme.text }]}>
            {entries}
          </Text>

          <TouchableOpacity
            style={[styles.counterBtn, { borderColor: theme.border }]}
            onPress={() => setEntries(entries + 1)}
          >
            < Ionicons name="add" size={18} color={theme.primaryBlue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle Optional */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Vehicle Number (Optional)
        </Text>
        <TextInput
          value={vehicleNo}
          onChangeText={handleVehicle}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="Last 4 digits"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
        />
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: theme.primaryBlue },
        ]}
      >
        <Text style={styles.submitText}>Schedule Entry</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Service</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              < Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {renderCategoryBlock("Popular", popular)}
            {renderCategoryBlock("Utility Services", utility)}
            {renderCategoryBlock("Other Services", otherServices)}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default SingleOthersForm;

/* KEEP YOUR SAME STYLES BELOW */

/* ───── Styles ───── */

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom:-10
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    letterSpacing:1

  },

  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },

  codeBox: {
    width: 60,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  phoneInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },

  selectBox: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },

  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  /* Modal */
  modalHeader: {
    backgroundColor: "#1996D3",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop:55
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 10,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  gridItem: {
    width: "20%",
    alignItems: "center",
    marginBottom: 10,
  },

  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  iconLabel: {
    fontSize: 11,
    textAlign: "center",
  },
});