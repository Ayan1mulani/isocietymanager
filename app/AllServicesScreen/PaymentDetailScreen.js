import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator
} from "react-native";
import AppHeader from "../components/AppHeader";
import Ionicons from "react-native-vector-icons/Ionicons";


import { ismServices } from "../../services/ismServices";

const PaymentDetailScreen = ({ route }) => {

  const { id } = route.params || {};

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayment();
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
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1996D3" />
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
  let createdBy = {};

  try {
    parsedData = payment.data ? JSON.parse(payment.data) : {};
  } catch { }

  try {
    createdBy = payment.created_by ? JSON.parse(payment.created_by) : {};
  } catch { }

  const isCredit =
    payment.type === "CREDIT" || payment.p_type === "CR";

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
          <Row label="Type" value={payment.type} />
          <Row label="Mode" value={payment.mode} />
          <Row label="Flat No" value={payment.flat_no} />
          <Row label="Date" value={payment.transaction_date_time} />
          <Row label="Remarks" value={payment.remarks} />
          <Row label="Sequence No" value={payment.sequence_no} />
          <Row label="URN" value={payment.urn} />
          <Row label="Reference ID" value={payment.reference_id} />
          <Row label="Bill Type" value={payment.bill_type} />
          <Row label="Tax" value={payment.tax} />
          <Row label="Created At" value={payment.created_at} />
          <Row label="Updated At" value={payment.updated_at} />
        </Card>

        {/* Created By */}
        {createdBy?.name && (
          <Card title="Created By">
            <Row label="Name" value={createdBy.name} />
            <Row label="Email" value={createdBy.email} />
            <Row label="User ID" value={String(createdBy.user_id)} />
          </Card>
        )}

        {/* Extra JSON Data */}
        {Object.keys(parsedData).length > 0 && (
          <Card title="Extra Details">
            <Row label="User ID" value={String(parsedData.user_id)} />
            <Row label="Flat No" value={parsedData.flatNo} />
            <Row label="TDS" value={String(parsedData.TDS)} />
            <Row label="Time" value={parsedData.CURRENT_TIME_LOCAL} />
          </Card>
        )}

        {/* Receipt */}
        {payment.url && (
          <TouchableOpacity
            onPress={openReceipt}
            style={{
              backgroundColor: "#1996D3",
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
        maxWidth: "60%",
        textAlign: "right"
      }}>
        {value}
      </Text>
    </View>
  );
};

export default PaymentDetailScreen;