import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Vibration, StatusBar
} from 'react-native';
import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DefaultPreference from 'react-native-default-preference';
import { visitorServices } from '../../services/visitorServices';
import { CommonActions } from '@react-navigation/native';

const VisitorApprovalScreen = ({ route, navigation }) => {
  const { visitor } = route.params || {};
  
  // ✅ Tracks EXACTLY which button was pressed ('ACCEPT', 'DECLINE', or null)
  const [loadingAction, setLoadingAction] = useState(null);
  
  const soundRef = useRef(null);

  /* ======================================================
     SOUND — tied to mount/unmount ONLY
  ====================================================== */
  useEffect(() => {
    if (!visitor?.id) return;

    let isMounted = true;

    const startSound = async () => {
      try {
        const stored = await AsyncStorage.getItem("notificationSoundSettings");
        let isVisitSoundOn = true;

        if (stored) {
          const parsed = JSON.parse(stored);
          const visit = parsed.find(item => item.name === "VISIT");
          isVisitSoundOn = visit?.switch === 1;
        }

        if (!isVisitSoundOn) {
         Vibration.vibrate([0, 500, 200, 500], true);
          return;
        }

        if (!isMounted) return;

        Sound.setCategory('Playback');

        const sound = new Sound('visitor_alert.wav', Sound.MAIN_BUNDLE, (error) => {
          if (error || !isMounted) {
            console.log('❌ Sound load error:', error);
            return;
          }
          soundRef.current = sound;
          sound.setVolume(1.0);
          sound.setNumberOfLoops(-1);
          sound.play((success) => {
            if (!success) console.log('❌ Sound play failed');
          });
        });

      } catch (e) {
        console.log("❌ Sound setup error:", e);
      }
    };

    startSound();

    return () => {
      isMounted = false;
      stopSound();
    };
  }, [visitor?.id]);

  /* ======================================================
     STOP SOUND
  ====================================================== */
  const stopSound = () => {
    Vibration.cancel();
    const sound = soundRef.current;
    if (!sound) return;
    soundRef.current = null;
    try {
      sound.stop(() => sound.release());
    } catch (e) {
      console.log("❌ stopSound error:", e);
    }
  };

  /* ======================================================
     EXIT — securely navigates to Visitors list
  ====================================================== */
  const exitToVisitors = async () => {
    // ✅ Tell HomeScreen we handled this, so it doesn't run API loops
    await DefaultPreference.set("VISITOR_JUST_HANDLED", "true");

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{
          name: "MainApp", // Adjust to your main navigator name if needed
          state: {
            routes: [{ name: "Visitors" }],
          },
        }],
      })
    );
  };

  /* ======================================================
     ACCEPT
  ====================================================== */
  const handleAccept = async () => {
    if (loadingAction) return; // Stop if something is already loading
    setLoadingAction('ACCEPT');
    try {
      await visitorServices.acceptVisitor(visitor.id);
      console.log("✅ Accepted:", visitor.id);
      exitToVisitors(); 
    } catch (error) {
      console.error('❌ Accept error:', error);
      setLoadingAction(null); // Reset if it fails so they can try again
    }
  };

  /* ======================================================
     DECLINE
  ====================================================== */
  const handleDecline = async () => {
    if (loadingAction) return; // Stop if something is already loading
    setLoadingAction('DECLINE');
    try {
      await visitorServices.denyVisitor(visitor.id);
      console.log("❌ Declined:", visitor.id);
      exitToVisitors(); 
    } catch (error) {
      console.error('❌ Decline error:', error);
      setLoadingAction(null); // Reset if it fails so they can try again
    }
  };

  /* ======================================================
     NO VISITOR DATA
  ====================================================== */
  if (!visitor?.id) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Text style={styles.errorText}>No visitor data available</Text>
        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          onPress={exitToVisitors}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ======================================================
     UI
  ====================================================== */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <Text style={styles.headerIcon}>🔔</Text>
        <Text style={styles.headerText}>Visitor Request</Text>
      </View>

      <View style={styles.content}>
        {visitor.photo ? (
          <Image source={{ uri: visitor.photo }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.placeholderPhoto]}>
             <Text style={styles.placeholderIcon}>👤</Text>
          </View>
        )}
        
        <Text style={styles.name}>{visitor.name}</Text>

        {visitor.phoneNumber && (
          <Text style={styles.detail}>📱 {visitor.phoneNumber}</Text>
        )}
        {visitor.purpose && (
          <Text style={styles.purpose}>Purpose: {visitor.purpose}</Text>
        )}
        
        <Text style={styles.message}>
          {visitor.name || "This visitor"} is requesting entry to your premises.
        </Text>
      </View>

      <View style={styles.actions}>
        
        {/* --- DECLINE BUTTON --- */}
        <TouchableOpacity
          style={[
            styles.button, 
            styles.declineButton,
            loadingAction === 'ACCEPT' && { opacity: 0.4 } // Dim if Accept is loading
          ]}
          onPress={handleDecline}
          disabled={!!loadingAction} // Disable if ANYTHING is loading
        >
          {loadingAction === 'DECLINE' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Declining...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Decline</Text>
          )}
        </TouchableOpacity>

        {/* --- ACCEPT BUTTON --- */}
        <TouchableOpacity
          style={[
            styles.button, 
            styles.acceptButton,
            loadingAction === 'DECLINE' && { opacity: 0.4 } // Dim if Decline is loading
          ]}
          onPress={handleAccept}
          disabled={!!loadingAction} // Disable if ANYTHING is loading
        >
          {loadingAction === 'ACCEPT' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Accepting...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Accept</Text>
          )}
        </TouchableOpacity>

      </View>

    </View>
  );
};

export default VisitorApprovalScreen;

// ✅ Styles matching the Android Native Lock Screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
    padding: 24,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16, 
    color: '#94A3B8',
    marginBottom: 20, 
    textAlign: 'center',
  },
  header: {
    alignItems: 'center', 
    marginBottom: 30,
    paddingBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#334155', // Slate 700 divider
  },
  headerIcon: {
    fontSize: 42,
    marginBottom: 8,
  },
  headerText: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#FFFFFF' 
  },
  content: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  photo: {
    width: 130, 
    height: 130, 
    borderRadius: 65,
    marginBottom: 20, 
    borderWidth: 3, 
    borderColor: '#22C55E', // Match the accept button green
  },
  placeholderPhoto: {
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#334155',
  },
  placeholderIcon: {
    fontSize: 50,
  },
  name: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#F1F5F9', // Off-white/Slate 100
    marginBottom: 8,
    textAlign: 'center'
  },
  detail: { 
    fontSize: 16, 
    color: '#94A3B8', // Slate 400
    marginVertical: 4 
  },
  purpose: { 
    fontSize: 15, 
    color: '#64748B', // Slate 500
    marginTop: 8,
    marginBottom: 16 
  },
  message: { 
    fontSize: 15, 
    color: '#94A3B8', 
    textAlign: 'center', 
    marginTop: 10,
    paddingHorizontal: 20,
    lineHeight: 22
  },
  actions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  button: {
    flex: 1, 
    height: 56, 
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  acceptButton: { 
    backgroundColor: '#22C55E' // Green 500
  },
  declineButton: { 
    backgroundColor: '#EF4444' // Red 500
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});