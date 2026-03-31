import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ismServices } from '../../services/ismServices';
import { otherServices } from '../../services/otherServices';
import AppHeader from '../components/AppHeader';
import BRAND from '../config';
import { usePermissions } from '../../Utils/ConetextApi';
import useAlert from '../components/UseAlert';

// ─── Helper: parse custom_bill_config safely ──────────────────────────────────
// Mirrors Angular's setBillTypeAndConfig()
const parsePmtValidations = (billTypeObj) => {
  const result = {
    pmtValidations: null,
    minPayable:     null,
    maxPayable:     null,
    fixedAmounts:   null,
    isEditable:     true,
    remarks:        null,
    decimalPlaces:  0,
  };

  if (!billTypeObj?.custom_bill_config) return result;

  try {
    const config =
      typeof billTypeObj.custom_bill_config === 'string'
        ? JSON.parse(billTypeObj.custom_bill_config)
        : billTypeObj.custom_bill_config;

    const pv = config?.pmt_validations;
    if (!pv) return result;

    result.pmtValidations = pv;
    result.minPayable     = pv.min     != null ? +pv.min     : null;
    result.maxPayable     = pv.max     != null ? +pv.max     : null;
    result.fixedAmounts   = Array.isArray(pv.fixed_amounts) ? pv.fixed_amounts : null;
    result.isEditable     = pv.is_editable !== '0';
    result.remarks        = pv.remarks ?? null;
    result.decimalPlaces  = pv.decimal ? +pv.decimal : 0;
  } catch (e) {
    console.log('parsePmtValidations error:', e);
  }

  return result;
};

// ─── Component ────────────────────────────────────────────────────────────────

 function BillPaymentScreen({ navigation, route }) {
  const { nightMode } = usePermissions();
  const { showAlert, AlertComponent } = useAlert(nightMode);
  const COLORS = BRAND.COLORS;

  // ── State ──────────────────────────────────────────────────────────────────
  const [billTypes,     setBillTypes]     = useState([]);  // filtered by outstanding ids
  const [outstanding,   setOutstanding]   = useState([]);  // raw outstanding list
  const [selectedBill,  setSelectedBill]  = useState(null);
  const [amount,        setAmount]        = useState('');
  const [payRemarks,    setPayRemarks]    = useState('');
  const [loading,       setLoading]       = useState(true);
  const [paying,        setPaying]        = useState(false);
  const [modalVisible,  setModalVisible]  = useState(false);

  // pmt_validations derived state
  const [minPayable,    setMinPayable]    = useState(null);
  const [maxPayable,    setMaxPayable]    = useState(null);
  const [fixedAmounts,  setFixedAmounts]  = useState(null);
  const [isEditable,    setIsEditable]    = useState(true);
  const [remarks,       setRemarks]       = useState(null);
  const [decimalPlaces, setDecimalPlaces] = useState(0);
  const [invalidAmount, setInvalidAmount] = useState(false);
  const [amountMessage, setAmountMessage] = useState('');

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    initData();
  }, []);

  /**
   * Mirrors Angular MakePaymentPage constructor:
   * 1. Get outstandings (or use passed-in param)
   * 2. Get all bill types
   * 3. Filter bill types by outstanding plan ids  ← key Angular logic
   * 4. If a billType was pre-selected (from AccountsScreen tab), select it
   */
  const initData = async () => {
    try {
      setLoading(true);

      // Outstanding — use passed param or fetch fresh
      let outList = route?.params?.outstanding ?? [];
      if (!outList || outList.length === 0) {
        const res = await otherServices.getOutStandings();
        outList = res?.data ?? [];
      }
      setOutstanding(outList);

      // All bill types
      const btRes = await ismServices.getBillTypes();
      let allTypes = Array.from((btRes?.data ?? btRes ?? []).values());

      // Sort by display_order (same as RN original)
      allTypes = allTypes.sort((a, b) => a.display_order - b.display_order);

      // Filter: only plans the user has in outstanding
      // Angular: if billTypes[0].id != 0, filter by outstanding plan ids
      let filtered = allTypes;
      if (allTypes.length > 0 && allTypes[0]?.id !== 0) {
        const myPlanIds = outList.map((o) => o.id);
        filtered = allTypes.filter((bt) => myPlanIds.includes(bt.id));
      }
      setBillTypes(filtered);

      // Pre-select tab that was active in AccountsScreen
      const preSelectedId = route?.params?.billType;
      if (preSelectedId) {
        const match = filtered.find((bt) => bt.id === preSelectedId);
        if (match) {
          applyBillTypeSelection(match, outList);
        }
      }

      // Pre-fill amount if passed
      const preAmount = route?.params?.amount;
      if (preAmount && +preAmount > 0) {
        setAmount((+preAmount).toString());
      }

    } catch (err) {
      console.log('initData error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mirrors Angular setBillTypeAndConfig() + onChange():
   * - Parse pmt_validations from custom_bill_config
   * - Auto-fill amount from outstanding balance for this plan
   */
  const applyBillTypeSelection = useCallback((billTypeObj, outList = outstanding) => {
    setSelectedBill(billTypeObj);

    // Parse validations
    const cfg = parsePmtValidations(billTypeObj);
    setMinPayable(cfg.minPayable);
    setMaxPayable(cfg.maxPayable);
    setFixedAmounts(cfg.fixedAmounts);
    setIsEditable(cfg.isEditable);
    setRemarks(cfg.remarks);
    setDecimalPlaces(cfg.decimalPlaces);
    setInvalidAmount(false);
    setAmountMessage('');

    // Auto-fill amount from outstanding balance — mirrors Angular onChange()
    let newAmount = cfg.minPayable ?? 1;
    let found = false;

    outList.forEach((o) => {
      if (o.id === billTypeObj.id) {
        found = true;
        if (o.show_bal && o?.data?.balance != null) {
          const bal = +o.data.balance;
          newAmount = bal < 0 ? 0 : +bal.toFixed(cfg.decimalPlaces);
        } else {
          newAmount = cfg.minPayable ?? 1;
        }
      }
    });

    if (!found) newAmount = cfg.minPayable ?? 1;
    if (newAmount < 0) newAmount = 0;

    setAmount(newAmount.toString());
    validateAmount(newAmount, cfg.minPayable, cfg.maxPayable);
  }, [outstanding]);

  // ── Amount validation — mirrors Angular amountChange() ─────────────────────
  const validateAmount = (val, min = minPayable, max = maxPayable) => {
    const num = parseFloat(val);
    if (min != null && num < min) {
      setInvalidAmount(true);
      setAmountMessage(`Min amount payable is ₹${min}`);
    } else if (max != null && num > max) {
      setInvalidAmount(true);
      setAmountMessage(`Max amount payable is ₹${max}`);
    } else {
      setInvalidAmount(false);
      setAmountMessage('');
    }
  };

  const onAmountChange = (val) => {
    setAmount(val);
    validateAmount(val);
  };

  const onFixedAmountTap = (val) => {
    const num = +val;
    setAmount(num.toString());
    validateAmount(num);
  };

  // ── Payment — mirrors Angular onPay() ──────────────────────────────────────
  const handlePayment = async () => {
    if (!selectedBill) {
      showAlert({ title: 'Error', message: 'Please select a bill type', buttons: [{ text: 'OK' }] });
      return;
    }

    const num = parseFloat(amount);
    if (!amount || num <= 0) {
      showAlert({ title: 'Error', message: 'Please enter a valid amount', buttons: [{ text: 'OK' }] });
      return;
    }

    if (invalidAmount) {
      showAlert({ title: 'Error', message: amountMessage, buttons: [{ text: 'OK' }] });
      return;
    }

    try {
      setPaying(true);
      const paymentUrl = await ismServices.makePayment(num, selectedBill, payRemarks);
      const ok = await Linking.canOpenURL(paymentUrl);
      if (ok) Linking.openURL(paymentUrl);
    } catch (error) {
      console.log('Payment error:', error);
      showAlert({ title: 'Error', message: 'Payment failed. Please try again.', buttons: [{ text: 'OK' }] });
    } finally {
      setPaying(false);
    }
  };

  // ── Bill type modal item ────────────────────────────────────────────────────
  const renderBillItem = ({ item }) => {
    const isSelected = selectedBill?.id === item.id;
    return (
      <TouchableOpacity
        style={styles.modalItem}
        onPress={() => {
          applyBillTypeSelection(item);
          setModalVisible(false);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.modalText, isSelected && { color: COLORS.primary }]}>
          {item.name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Make Payment" nightMode={nightMode} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Bill type selector ──────────────────────────────────── */}
          {/* Hidden when only one plan with id === 0, same as Angular */}
          {!(billTypes.length === 1 && billTypes[0]?.id === 0) && (
            <>
              <Text style={styles.label}>Bill Type</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownText, !selectedBill && styles.placeholder]}>
                  {selectedBill ? selectedBill.name : 'Select bill type'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            </>
          )}

          {/* ── Amount ─────────────────────────────────────────────── */}
          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={onAmountChange}
            keyboardType="numeric"
            placeholder="₹ Enter amount"
            placeholderTextColor="#9CA3AF"
            editable={isEditable}
            style={[
              styles.input,
              !isEditable && styles.inputDisabled,
              invalidAmount && styles.inputError,
            ]}
          />

          {/* Validation error */}
          {invalidAmount && (
            <Text style={styles.errorText}>{amountMessage}</Text>
          )}

          {/* Fixed amount quick-tap buttons — mirrors Angular fixed_amounts */}
          {fixedAmounts && fixedAmounts.length > 0 && (
            <View style={styles.fixedAmountsRow}>
              {fixedAmounts.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[
                    styles.fixedBtn,
                    amount === a.toString() && { backgroundColor: COLORS.primary },
                  ]}
                  onPress={() => onFixedAmountTap(a)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.fixedBtnText,
                    amount === a.toString() && { color: '#fff' },
                  ]}>
                    ₹{a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Remarks (optional) ─────────────────────────────────── */}
          <Text style={styles.label}>Remark (Optional)</Text>
          <TextInput
            value={payRemarks}
            onChangeText={setPayRemarks}
            placeholder="Add remark..."
            placeholderTextColor="#9CA3AF"
            style={[styles.input, { height: 50 }]}
            multiline
          />

          {/* Note from pmt_validations.remarks — mirrors Angular <p *ngIf="remarks"> */}
          {!!remarks && (
            <View style={styles.remarksBox}>
              <Text style={styles.remarksNote}>
                <Text style={{ fontWeight: '700' }}>Note: </Text>
                {remarks}
              </Text>
            </View>
          )}

          {/* ── Pay button ─────────────────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: COLORS.primary },
              (invalidAmount || paying) && styles.buttonDisabled,
            ]}
            onPress={handlePayment}
            disabled={invalidAmount || paying}
            activeOpacity={0.85}
          >
            {paying
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.buttonText}>Make Payment</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Bill type bottom sheet modal ──────────────────────────── */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Select Bill Type</Text>
            <FlatList
              data={billTypes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderBillItem}
              showsVerticalScrollIndicator={false}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <AlertComponent />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F4F6F9' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:     { padding: 16, paddingBottom: 40 },

  label: {
    fontSize: 13, fontWeight: '600',
    marginTop: 18, marginBottom: 6, color: '#374151',
  },

  dropdown: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownText: { fontSize: 14, color: '#111827' },
  placeholder:  { color: '#9CA3AF' },

  input: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
    fontSize: 14, color: '#111827',
  },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  inputError:    { borderColor: '#EF4444' },

  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 2 },

  /* Fixed amount buttons */
  fixedAmountsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10,
  },
  fixedBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  fixedBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  /* Remarks note */
  remarksBox: {
    marginTop: 12, padding: 12, borderRadius: 10,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA',
  },
  remarksNote: { fontSize: 12, color: '#92400E', lineHeight: 18 },

  /* Pay button */
  button: {
    marginTop: 28, paddingVertical: 15,
    borderRadius: 12, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* Modal */
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 30, maxHeight: '70%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#D1D5DB',
    borderRadius: 2, alignSelf: 'center', marginVertical: 12,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700',
    paddingHorizontal: 20, marginBottom: 8,
  },
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalText: { fontSize: 14, fontWeight: '600', color: '#111827' },
});

export default BillPaymentScreen;