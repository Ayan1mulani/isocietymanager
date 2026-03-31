import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";

const IvrSetupScreen = ({ navigation }) => {

  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");

  const saveIvr = () => {

    console.log("Primary IVR:", primary);
    console.log("Secondary IVR:", secondary);

    // call updateUser API here

  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>IVR Not Configured</Text>

      <Text>Enter Primary IVR Number</Text>

      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        value={primary}
        onChangeText={setPrimary}
      />

      <Text>Enter Secondary IVR Number</Text>

      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        value={secondary}
        onChangeText={setSecondary}
      />

      <Button title="Save IVR Settings" onPress={saveIvr} />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5
  }
});

export default IvrSetupScreen;