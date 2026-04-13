import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ismServices } from '../../services/ismServices';

const PendingStatusScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { token, societyId, formId } = route.params || {};

  const [status, setStatus] = useState('PENDING');
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null); // ✅ NEW

  const checkStatus = async () => {
    try {
      setRefreshing(true);

      const response = await ismServices.getFormStatus(societyId, formId, token);

      if (response && response.status === 'success') {
        const currentStatus = response.data?.status;
        setStatus(currentStatus);

        // ✅ Parse user data
        if (response.data?.data) {
          const parsed = JSON.parse(response.data.data)[0];
          setUserData(parsed);
        }

        // ✅ Auto redirect if approved
        if (currentStatus === 'APPROVED' || currentStatus === 'COMPLETED') {
          await AsyncStorage.removeItem('pendingRegistration');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Login" }]
            })
          );
        }
      }

    } catch (error) {
      console.log("Status check error", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('pendingRegistration');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Login" }]
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#074B7C" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Registration Status</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Icon name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={checkStatus}
          />
        }
      >

        {/* Status Banner */}
        <View style={styles.banner}>
          <Text style={styles.statusText}>Status: {status}</Text>
          <Text style={styles.subText}>Pull down to refresh</Text>
        </View>

        {/* Main Content */}
        <View style={styles.container}>

          <Icon name="hourglass-top" size={70} color="#f59e0b" />

          <Text style={styles.title}>Verification Pending</Text>

          <Text style={styles.description}>
            Your request has been submitted. Please wait for admin approval.
          </Text>

          {/* ✅ USER DETAILS */}
          {userData && (
            <View style={styles.detailsBox}>

              <Text style={styles.detailsTitle}>Submitted Details</Text>

              <Text>Name: {userData.name}</Text>
              <Text>Phone: {userData.phone_no}</Text>
              <Text>Email: {userData.email}</Text>
              <Text>Flat: {userData.flat_no}</Text>
              <Text>Tenant: {userData.is_tenant ? "Yes" : "No"}</Text>

              {userData.remarks ? (
                <Text>Remarks: {userData.remarks}</Text>
              ) : null}

            </View>
          )}

        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default PendingStatusScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: '#074B7C',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },

  scrollContent: {
    flexGrow: 1
  },

  banner: {
    backgroundColor: '#f59e0b',
    padding: 20,
    alignItems: 'center'
  },

  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },

  subText: {
    color: '#fff',
    fontSize: 12
  },

  container: {
    padding: 25,
    alignItems: 'center'
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10
  },

  description: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    color: '#666'
  },

  detailsBox: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10
  },

  detailsTitle: {
    fontWeight: 'bold',
    marginBottom: 10
  }
});