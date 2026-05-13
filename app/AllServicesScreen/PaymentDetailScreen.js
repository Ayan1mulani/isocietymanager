import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated
} from "react-native";
import AppHeader from "../components/AppHeader";
import Ionicons from "react-native-vector-icons/Ionicons";

import BRAND from "../config";


import { ismServices } from "../../services/ismServices";

const PaymentDetailScreen = ({ route }) => {

  const { id } = route.params || {};

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    loadPayment();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const loadPayment = async () => {
    try {
      console.log("Fetching payment ID:", id);

      const res = await ismServices.getPaymentById(id);

      console.log("DETAIL RESPONSE:", res);

      if (res?.status === "success" && res?.data?.length > 0) {
        setPayment(res.data[0]);
      }

    } catch (e) {
      console.log("Detail Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const openReceipt = () => {
    if (payment?.url) Linking.openURL(payment.url);
  };

  const formatAmount = (amt) => {
    return parseFloat(amt || 0).toFixed(0);
  };

  if (loading) {
    const translateX = shimmer.interpolate({
      inputRange: [-1, 1],
      outputRange: [-320, 320],
    });

    return (
      <View style={{ flex: 1, backgroundColor: "#F4F6F9" }}>
        <AppHeader title="Payment Details" />

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View
            style={{
              backgroundColor: '#E5E7EB',
              height: 120,
              borderRadius: 16,
              marginBottom: 12,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                width: 120,
                height: '100%',
                backgroundColor: 'rgba(255,255,255,0.45)',
                transform: [{ translateX }],
              }}
            />
          </View>

          <View
            style={{
              backgroundColor: '#E5E7EB',
              height: 360,
              borderRadius: 16,
              marginBottom: 12,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                width: 120,
                height: '100%',
                backgroundColor: 'rgba(255,255,255,0.45)',
                transform: [{ translateX }],
              }}
            />
          </View>

          <View
            style={{
              backgroundColor: '#E5E7EB',
              height: 60,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                width: 120,
                height: '100%',
                backgroundColor: 'rgba(255,255,255,0.45)',
                transform: [{ translateX }],
              }}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No data found</Text>
      </View>
    );
  }

  // ✅ PARSE JSON
  let parsedData = {};

  try {
    parsedData = payment.data ? JSON.parse(payment.data) : {};
  } catch { }

  const isCredit =
    payment.type === "CREDIT" || payment.p_type === "CR";

  const transactionType = payment.mode || payment.type || "Payment";
  const billPlan = payment.bill_plan_name || payment.bill_plan || payment.bill_type || "-";


  return (
    <View style={{ flex: 1, backgroundColor: "#F4F6F9" }}>


      <AppHeader
        title="Payment Details"
        rightIcon={
          payment?.url && (
            <Ionicons
              name="download-outline"
              size={22}
              color="#111"
              onPress={openReceipt}
            />
          )
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Amount */}
        <View style={{
          backgroundColor: "#fff",
          padding: 20,
          borderRadius: 16,
          marginBottom: 12,
          alignItems: "center"
        }}>
          <Text style={{
            fontSize: 26,
            fontWeight: "800",
            color: isCredit ? "#16A34A" : "#EF4444"
          }}>
            ₹ {formatAmount(payment.amount)}
          </Text>

          <Text style={{ marginTop: 6, color: "#6B7280" }}>
            {isCredit ? "Credit" : "Debit"}
          </Text>
        </View>

        {/* Main Details */}
        <Card>
          <Row label="Status" value={payment.status} />
          <Row label="Transaction Type" value={transactionType} />
          <Row label="Payment Type" value={isCredit ? 'Credit' : 'Debit'} />
          <Row label="Mode" value={payment.mode} />
          <Row label="Bill Plan" value={billPlan} />
          <Row label="Amount" value={`₹ ${formatAmount(payment.amount)}`} />
          <Row label="Transaction Date" value={payment.transaction_date_time} />
          <Row label="Bank" value={payment.bank_name} />
          <Row label="Account To" value={payment.account_to} />
          <Row label="Payment Status" value={payment.status} />
          <Row label="Processed" value={payment.processed === 1 ? 'Yes' : 'No'} />
          <Row label="Payment Tag" value={payment.tag} />
          <Row label="Order Bank" value={payment.o_bank} />
          <Row label="Order Date" value={payment.o_date} />
          <Row label="Sequence No" value={payment.sequence_no} />
          <Row label="Reference ID" value={payment.reference_id} />
          <Row label="URN" value={payment.urn} />
          <Row label="Order Number" value={payment.o_number} />
          <Row label="Created At" value={payment.created_at} />
        </Card>

        {/* Receipt */}
        {payment.url && (
          <TouchableOpacity
            onPress={openReceipt}
            style={{
              backgroundColor: BRAND.COLORS.primary,
              padding: 14,
              borderRadius: 10,
              alignItems: "center"
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              View Receipt
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
};

const Card = ({ children, title }) => (
  <View style={{
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  }}>
    {title && (
      <Text style={{ fontWeight: "700", marginBottom: 10 }}>
        {title}
      </Text>
    )}
    {children}
  </View>
);

const Row = ({ label, value }) => {
  if (!value && value !== 0) return null;

  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 0.5,
      borderColor: "#eee"
    }}>
      <Text style={{ color: "#6B7280" }}>{label}</Text>
      <Text style={{
        color: "#111827",
        fontWeight: "600",
        flexShrink: 1,
        maxWidth: "65%",
        textAlign: "right"
      }}>
        {value}
      </Text>
    </View>
  );
};

export default PaymentDetailScreen;