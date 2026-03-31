import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";

const useAlert = (nightMode = false) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  const showAlert = ({ title, message, buttons = [] }) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons,
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <Modal
      visible={alertConfig.visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.alertBox,
            { backgroundColor: nightMode ? "#1E1E1E" : "#FFFFFF" },
          ]}
        >
          <Text style={styles.title}>{alertConfig.title}</Text>
          <Text style={styles.message}>{alertConfig.message}</Text>

          <View style={styles.buttonRow}>
            {alertConfig.buttons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                style={styles.button}
                onPress={() => {
                  closeAlert();
                  btn.onPress && btn.onPress();
                }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === "destructive" && { color: "#EF4444" },
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  return { showAlert, AlertComponent };
};

export default useAlert;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  alertBox: {
    width: "85%",
    borderRadius: 14,
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  message: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  button: {
    marginLeft: 16,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});