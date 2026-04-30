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
import { useTranslation } from 'react-i18next';
import { ismServices } from '../../services/ismServices';
import { otherServices } from '../../services/otherServices';
import AppHeader from '../components/AppHeader';
import BRAND from '../config';
import { usePermissions } from '../../Utils/ConetextApi';
import useAlert from '../components/UseAlert';

/* ─────────────────────────────────────────────────────────────────────────────
   Parser: reads custom_bill_config → pmt_validations
   NOTE: decimalPlaces intentionally removed per requirement
───────────────────────────────────────────────────────────────────────────── */
const parsePmtValidations = (billTypeObj) => {
  const result = {
    minPayable:   null,
    maxPayable:   null,
    fixedAmounts: null,
    isEditable:   true,
    remarks:      null,
  };

  if (!billTypeObj?.custom_bill_config) return result;

  try {
    const config =
      typeof billTypeObj.custom_bill_config === 'string'
        ? JSON.parse(billTypeObj.custom_bill_config)
        : billTypeObj.custom_bill_config;

    const pv = config?.pmt_validations;
    if (!pv) return result;

    result.minPayable   = pv.min           != null ? +pv.min   : null;
    result.maxPayable   = pv.max           != null ? +pv.max   : null;
    result.fixedAmounts = Array.isArray(pv.fixed_amounts) ? pv.fixed_amounts : null;
    result.isEditable   = pv.is_editable  !== '0';
    result.remarks      = pv.remarks      ?? null;
  } catch (e) {
    console.log('parsePmtValidations error:', e);
  }

  return result;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────────── */
function BillPaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { nightMode } = usePermissions();
  const { showAlert, AlertComponent } = useAlert(nightMode);
  const COLORS = BRAND.COLORS;

  /* ── State ────────────────────────────────────────────────────────────── */
  const [billTypes,    setBillTypes]    = useState([]);  // filtered to outstanding only
  const [outstanding,  setOutstanding]  = useState([]);  // raw outstanding list
  const [selectedBill, setSelectedBill] = useState(null);

  const [amount,       setAmount]       = useState('');
  const [payRemarks,   setPayRemarks]   = useState('');

  const [loading,      setLoading]      = useState(true);
  const [paying,       setPaying]       = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // pmt_validations state
  const [minPayable,    setMinPayable]    = useState(null);
  const [maxPayable,    setMaxPayable]    = useState(null);
  const [fixedAmounts,  setFixedAmounts]  = useState(null);
  const [isEditable,    setIsEditable]    = useState(true);
  const [remarks,       setRemarks]       = useState(null);

  // Validation state
  const [invalidAmount,      setInvalidAmount]      = useState(false);
  const [amountMessage,      setAmountMessage]      = useState('');
  const [selectedFixedAmount, setSelectedFixedAmount] = useState(null);

  /* ── Init ─────────────────────────────────────────────────────────────── */
  useEffect(() => { initData(); }, []);

  const initData = async () => {
    try {
      setLoading(true);

      // Step 1: get outstanding — use passed param or fetch fresh
      let outList = route?.params?.outstanding ?? [];
      if (!outList.length) {
        const res = await otherServices.getOutStandings();
        outList = res?.data ?? [];
      }
      setOutstanding(outList);

      // Step 2: get all bill types
      const btRes = await ismServices.getBillTypes();
      let allTypes = Array.from((btRes?.data ?? btRes ?? []).values());

      // Step 3: sort by display_order
      allTypes = allTypes.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      // Step 4: ONLY keep bill types that exist in outstanding
      // This ensures we never show a bill the user doesn't owe
      const myPlanIds = outList.map((o) => String(o.id));
      const filtered  = allTypes.filter((bt) => myPlanIds.includes(String(bt.id)));
      setBillTypes(filtered);

      // Step 5: pre-select the bill type passed from AccountsScreen/ResidentProfile
      const paramBillTypeId = route?.params?.billType;
      const paramAmount     = route?.params?.amount;

      if (paramBillTypeId != null) {
        const matched = filtered.find((bt) => String(bt.id) === String(paramBillTypeId));
        if (matched) {
          // Pass outList directly since setOutstanding hasn't flushed yet
          applyBillTypeSelection(matched, outList, paramAmount);
          return; // amount already set inside applyBillTypeSelection
        }
      }

      // No pre-selected bill — set amount from param if provided
      if (paramAmount && +paramAmount > 0) {
        setAmount(Math.round(Math.abs(+paramAmount)).toString());
      }

    } catch (err) {
      console.log('initData error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Bill type selection ──────────────────────────────────────────────────
     Called when:
       • A bill type is tapped in the bottom-sheet modal
       • A bill type is pre-selected from route params

     Logic:
       1. Parse pmt_validations from custom_bill_config
       2. Read the balance for this bill from outstanding list
       3. If fixedAmounts exist → don't auto-fill; wait for user to tap a chip
       4. Otherwise → auto-fill from outstanding balance (rounded, no decimals)
  ───────────────────────────────────────────────────────────────────────── */
  const applyBillTypeSelection = useCallback((
    billTypeObj,
    outList    = outstanding,   // accept fresh list during init
    paramAmount = null,
  ) => {
    setSelectedBill(billTypeObj);
    setSelectedFixedAmount(null);  // reset fixed selection
    setInvalidAmount(false);
    setAmountMessage('');

    // Parse config
    const cfg = parsePmtValidations(billTypeObj);
    setMinPayable(cfg.minPayable);
    setMaxPayable(cfg.maxPayable);
    setFixedAmounts(cfg.fixedAmounts);
    setIsEditable(cfg.isEditable);
    setRemarks(cfg.remarks);

    // If fixed amounts exist, clear the input — user must tap a chip
    if (cfg.fixedAmounts && cfg.fixedAmounts.length > 0) {
      setAmount('');
      return;
    }

    // Read outstanding balance for this bill type
    let newAmount = cfg.minPayable ?? 1;
    const match   = outList.find((o) => String(o.id) === String(billTypeObj.id));

    if (match) {
      if (match.show_bal && match?.data?.balance != null) {
        const bal = Math.round(Math.abs(parseFloat(match.data.balance)));
        newAmount = bal > 0 ? bal : (cfg.minPayable ?? 1);
      } else {
        newAmount = cfg.minPayable ?? 1;
      }
    }

    // Prefer paramAmount if it was explicitly passed (from route param)
    if (paramAmount != null && +paramAmount > 0) {
      newAmount = Math.round(Math.abs(+paramAmount));
    }

    const finalAmount = Math.max(0, newAmount);
    setAmount(finalAmount.toString());
    validateAmount(finalAmount, cfg.minPayable, cfg.maxPayable);
  }, [outstanding]);

  /* ── Validation ─────────────────────────────────────────────────────────── */
  const validateAmount = (val, min = minPayable, max = maxPayable) => {
    const num = parseFloat(val);
    if (isNaN(num)) {
      setInvalidAmount(true);
      setAmountMessage(t('Please enter a valid amount'));
    } else if (min != null && num < min) {
      setInvalidAmount(true);
      setAmountMessage(`${t('Min amount payable is')} ₹${min}`);
    } else if (max != null && num > max) {
      setInvalidAmount(true);
      setAmountMessage(`${t('Max amount payable is')} ₹${max}`);
    } else {
      setInvalidAmount(false);
      setAmountMessage('');
    }
  };

  const onAmountChange = (val) => {
    setAmount(val);
    setSelectedFixedAmount(null); // deselect chip if user types manually
    validateAmount(val);
  };

  /* ── Fixed amount chip tap ───────────────────────────────────────────────
     Tapping a chip sets BOTH the amount AND marks which chip is selected.
     Tapping the same chip again deselects it and clears the amount.
  ───────────────────────────────────────────────────────────────────────── */
  const onFixedAmountTap = (val) => {
    if (selectedFixedAmount === val) {
      // Deselect: clear amount
      setSelectedFixedAmount(null);
      setAmount('');
      setInvalidAmount(false);
      setAmountMessage('');
    } else {
      setSelectedFixedAmount(val);
      const num = +val;
      setAmount(num.toString());
      validateAmount(num);
    }
  };

  /* ── Payment ─────────────────────────────────────────────────────────────
     Guards (mirrors Angular onPay()):
       • Must have a selected bill
       • Amount must be a positive number
       • Amount must pass min/max validation
       • If fixedAmounts exist, one must be selected
  ───────────────────────────────────────────────────────────────────────── */
  const handlePayment = async () => {
    if (!selectedBill) {
      showAlert({ title: t('Error'), message: t('Please select a bill type'), buttons: [{ text: t('OK') }] });
      return;
    }

    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      showAlert({ title: t('Error'), message: t('Please enter a valid amount'), buttons: [{ text: t('OK') }] });
      return;
    }

    // If fixed amounts are configured, user must pick one
    if (fixedAmounts && fixedAmounts.length > 0 && selectedFixedAmount == null) {
      showAlert({ title: t('Error'), message: t('Please select an amount'), buttons: [{ text: t('OK') }] });
      return;
    }

    if (invalidAmount) {
      showAlert({ title: t('Error'), message: amountMessage, buttons: [{ text: t('OK') }] });
      return;
    }

    try {
      setPaying(true);
      const paymentUrl = await ismServices.makePayment(num, selectedBill, payRemarks);
      const canOpen    = await Linking.canOpenURL(paymentUrl);
      if (canOpen) Linking.openURL(paymentUrl);
    } catch (error) {
      console.log('Payment error:', error);
      showAlert({ title: t('Error'), message: t('Payment failed. Please try again.'), buttons: [{ text: t('OK') }] });
    } finally {
      setPaying(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={t('Make Payment')} nightMode={nightMode} showBack />

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

          {/* ── Bill Type Selector ─────────────────────────────────────
               Hidden when there is exactly one bill with id === 0 (recharge)
          ──────────────────────────────────────────────────────────── */}
          {!(billTypes.length === 1 && billTypes[0]?.id === 0) && (
            <>
              <Text style={styles.label}>{t('Bill Type')}</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownText, !selectedBill && styles.placeholder]}>
                  {selectedBill ? selectedBill.name : t('Select bill type')}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            </>
          )}

          {/* ── Amount ────────────────────────────────────────────────── */}
          <Text style={styles.label}>{t('Amount')}</Text>
          <TextInput
            value={amount}
            onChangeText={onAmountChange}
            keyboardType="numeric"
            placeholder={`₹ ${t('Enter amount')}`}
            placeholderTextColor="#9CA3AF"
            editable={isEditable}
            style={[
              styles.input,
              !isEditable  && styles.inputDisabled,
              invalidAmount && styles.inputError,
            ]}
          />

          {/* Amount validation error */}
          {invalidAmount && (
            <Text style={styles.errorText}>{amountMessage}</Text>
          )}

          {/* ── Fixed Amount Chips ────────────────────────────────────
               Shown only when pmt_validations.fixed_amounts is set.
               One chip must be selected before payment is allowed.
               Tapping the active chip deselects it.
          ──────────────────────────────────────────────────────────── */}
          {fixedAmounts && fixedAmounts.length > 0 && (
            <View style={styles.fixedAmountsRow}>
              {fixedAmounts.map((a) => {
                const isActive = selectedFixedAmount === a;
                return (
                  <TouchableOpacity
                    key={a}
                    style={[styles.fixedBtn, isActive && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                    onPress={() => onFixedAmountTap(a)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.fixedBtnText, isActive && { color: '#fff' }]}>
                      ₹{a}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Remarks ───────────────────────────────────────────────── */}
          <Text style={styles.label}>{t('Remark (Optional)')}</Text>
          <TextInput
            value={payRemarks}
            onChangeText={setPayRemarks}
            placeholder={t('Add remark...')}
            placeholderTextColor="#9CA3AF"
            style={[styles.input, { height: 50 }]}
            multiline
          />

          {/* Note from pmt_validations.remarks */}
          {!!remarks && (
            <View style={styles.remarksBox}>
              <Text style={styles.remarksNote}>
                <Text style={{ fontWeight: '700' }}>{t('Note')}: </Text>
                {remarks}
              </Text>
            </View>
          )}

          {/* ── Pay Button ────────────────────────────────────────────── */}
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
              : <Text style={styles.buttonText}>{t('Make Payment')}</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* ── Bill Type Bottom Sheet Modal ───────────────────────────────── */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal}>
            {/* Handle bar */}
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{t('Select Bill Type')}</Text>
            <FlatList
              data={billTypes}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedBill?.id === item.id;
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      // Pass outstanding directly so balance auto-fills correctly
                      applyBillTypeSelection(item, outstanding);
                      setModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalText, isSelected && { color: COLORS.primary }]}>
                      {item.name}
                    </Text>
                    {/* Checkmark on currently selected bill */}
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <AlertComponent />
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:   { padding: 16, paddingBottom: 40 },

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

  fixedAmountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  fixedBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  fixedBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  remarksBox: {
    marginTop: 12, padding: 12, borderRadius: 10,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA',
  },
  remarksNote: { fontSize: 12, color: '#92400E', lineHeight: 18 },

  button: {
    marginTop: 28, paddingVertical: 15,
    borderRadius: 12, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 30, maxHeight: '70%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#D1D5DB',
    borderRadius: 2, alignSelf: 'center', marginVertical: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalText: { fontSize: 14, fontWeight: '600', color: '#111827' },
});

export default BillPaymentScreen;