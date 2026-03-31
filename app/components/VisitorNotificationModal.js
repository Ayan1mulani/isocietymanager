import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function VisitorNotificationModal({
  visible,
  visitor,
  onAccept,
  onReject,
  onClose
}) {

  if (!visitor) return null;

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>

          <Text style={styles.title}>Visitor Request</Text>

          <Text>Name: {visitor.name}</Text>
          <Text>Mobile: {visitor.mobile}</Text>
          <Text>Purpose: {visitor.purpose}</Text>

          <View style={styles.buttons}>

            <TouchableOpacity style={styles.accept} onPress={onAccept}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.reject} onPress={onReject}>
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>

          </View>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({

  overlay:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    backgroundColor:"rgba(0,0,0,0.5)"
  },

  box:{
    width:"85%",
    backgroundColor:"#fff",
    padding:20,
    borderRadius:10
  },

  title:{
    fontSize:20,
    fontWeight:"bold",
    marginBottom:15
  },

  buttons:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginTop:20
  },

  accept:{
    backgroundColor:"#28a745",
    padding:10,
    borderRadius:6
  },

  reject:{
    backgroundColor:"#dc3545",
    padding:10,
    borderRadius:6
  },

  btnText:{
    color:"#fff",
    fontWeight:"bold"
  },

  close:{
    textAlign:"center",
    marginTop:15
  }

});