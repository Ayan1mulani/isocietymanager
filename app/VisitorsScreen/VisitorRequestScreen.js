import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { visitorServices } from '../services/visitorServices';

const VisitorRequestScreen = ({ route, navigation }) => {
  const { visitor } = route.params;

  const handleAccept = async () => {
    try {
      await visitorServices.acceptVisitor(visitor.id);
      navigation.goBack();
    } catch (e) {
      console.log("Accept error:", e);
    }
  };

  const handleDecline = async () => {
    try {
      await visitorServices.denyVisitor(visitor.id);
      navigation.goBack();
    } catch (e) {
      console.log("Decline error:", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visitor Request</Text>

      {visitor.photo ? (
        <Image source={{ uri: visitor.photo }} style={styles.image} />
      ) : null}

      <Text style={styles.name}>{visitor.name}</Text>
      <Text style={styles.info}>📞 {visitor.phoneNumber}</Text>
      <Text style={styles.info}>🎯 {visitor.purpose}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.accept} onPress={handleAccept}>
          <Text style={styles.btnText}>ACCEPT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.decline} onPress={handleDecline}>
          <Text style={styles.btnText}>DECLINE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VisitorRequestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  info: {
    fontSize: 16,
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 30,
  },
  accept: {
    backgroundColor: '#22C55E',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  decline: {
    backgroundColor: '#EF4444',
    padding: 15,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});