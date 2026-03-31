import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { visitorServices } from "../../services/visitorServices";

const IVRCallModal = ({ visible, visitor, onClose }) => {

  const [loading, setLoading] = useState(false);

  if (!visitor) return null;

  const handleAccept = async () => {
    try {
      setLoading(true);

      await visitorServices.acceptVisitor(visitor.id);

      onClose();

    } catch (error) {
      console.log("Accept visitor error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);

      await visitorServices.denyVisitor(visitor.id);

      onClose();

    } catch (error) {
      console.log("Reject visitor error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.card}>

          <Text style={styles.title}>Visitor Calling</Text>

          <Text style={styles.text}>Name: {visitor.name}</Text>
          <Text style={styles.text}>Purpose: {visitor.purpose}</Text>
          <Text style={styles.text}>Mobile: {visitor.mobile}</Text>

          {loading ? (
            <ActivityIndicator size="small" />
          ) : (
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.accept} onPress={handleAccept}>
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.reject} onPress={handleReject}>
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};

export default IVRCallModal;

const styles = StyleSheet.create({
  container:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    backgroundColor:"rgba(0,0,0,0.5)"
  },

  card:{
    backgroundColor:"#fff",
    padding:20,
    borderRadius:12,
    width:"85%"
  },

  title:{
    fontSize:18,
    fontWeight:"bold",
    marginBottom:10
  },

  text:{
    fontSize:14,
    marginBottom:4
  },

  buttons:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginTop:20
  },

  accept:{
    backgroundColor:"#16A34A",
    padding:12,
    borderRadius:8,
    flex:1,
    alignItems:"center",
    marginRight:8
  },

  reject:{
    backgroundColor:"#DC2626",
    padding:12,
    borderRadius:8,
    flex:1,
    alignItems:"center",
    marginLeft:8
  },

  btnText:{
    color:"#fff",
    fontWeight:"600"
  }
});