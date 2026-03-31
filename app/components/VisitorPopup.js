import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { navigate } from "../../NavigationService";

const VisitorPopup = ({ visible, message, onClose }) => {
    const handleOk = () => {
        onClose?.();

        navigate("MainApp", {
            screen: "Visitors",
        });
    };

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.popup}>
                    <Text style={styles.title}>🚪 Visitor Alert</Text>

                    <Text style={styles.message}>
                        {message || "Visitor is at the gate. Please allow."}
                    </Text>

                    <TouchableOpacity style={styles.button} onPress={handleOk}>
                        <Text style={styles.buttonText}>View</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default VisitorPopup;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  popup: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
    color: "#555",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});