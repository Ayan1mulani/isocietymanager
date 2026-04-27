import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
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
import { StyleSheet } from 'react-native';

import { ismServices } from '../../services/ismServices';
import { otherServices } from '../../services/otherServices';
import AppHeader from '../components/AppHeader';
import BRAND from '../config';
import { usePermissions } from '../../Utils/ConetextApi';
import useAlert from '../components/UseAlert';

/* ---------- PARSER ---------- */

const parsePmtValidations = (billTypeObj) => {
  const result = {
    pmtValidations: null,
    minPayable: null,
    maxPayable: null,
    fixedAmounts: null,
    isEditable: true,
    remarks: null,
    decimalPlaces: 0,
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
    result.minPayable = pv.min != null ? +pv.min : null;
    result.maxPayable = pv.max != null ? +pv.max : null;
    result.fixedAmounts = Array.isArray(pv.fixed_amounts) ? pv.fixed_amounts : null;
    result.isEditable = pv.is_editable !== '0';
    result.remarks = pv.remarks ?? null;
    result.decimalPlaces = pv.decimal ? +pv.decimal : 0;
  } catch (e) {}

  return result;
};

/* ---------- MAIN ---------- */

function BillPaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { nightMode } = usePermissions();
  const { showAlert, AlertComponent } = useAlert(nightMode);
  const COLORS = BRAND.COLORS;

  const [billTypes, setBillTypes] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);

  const [amount, setAmount] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [minPayable, setMinPayable] = useState(null);
  const [maxPayable, setMaxPayable] = useState(null);
  const [fixedAmounts, setFixedAmounts] = useState(null);
  const [isEditable, setIsEditable] = useState(true);
  const [remarks, setRemarks] = useState(null);
  const [decimalPlaces, setDecimalPlaces] = useState(0);

  const [invalidAmount, setInvalidAmount] = useState(false);
  const [amountMessage, setAmountMessage] = useState('');

  const [selectedFixedAmount, setSelectedFixedAmount] = useState(null);
  const [fixedAmountError, setFixedAmountError] = useState(false);

  /* ── applyBillTypeSelection must be defined BEFORE initData so the
        auto-select logic inside initData can reference it ── */
  const applyBillTypeSelection = useCallback((billTypeObj, overrideAmount = null) => {
    setSelectedBill(billTypeObj);

    const cfg = parsePmtValidations(billTypeObj);

    setMinPayable(cfg.minPayable);
    setMaxPayable(cfg.maxPayable);
    setFixedAmounts(cfg.fixedAmounts);
    setIsEditable(cfg.isEditable);
    setRemarks(cfg.remarks);
    setDecimalPlaces(cfg.decimalPlaces);

    setSelectedFixedAmount(null);
    setFixedAmountError(false);

    // Use the overrideAmount (from route params) when available,
    // otherwise fall back to the config's minimum or 1.
    const defaultAmount =
      overrideAmount != null
        ? Math.abs(overrideAmount)          // strip sign coming from balance
        : (cfg.minPayable ?? 1);

    setAmount(defaultAmount.toString());
    validateAmount(defaultAmount, cfg.minPayable, cfg.maxPayable);
  }, []);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      setLoading(true);

      /* outstanding list */
      let outList = route?.params?.outstanding ?? [];
      if (!outList.length) {
        const res = await otherServices.getOutStandings();
        outList = res?.data ?? [];
      }
      setOutstanding(outList);

      /* bill types */
      const btRes = await ismServices.getBillTypes();
      let allTypes = Array.from((btRes?.data ?? btRes ?? []).values());
      allTypes = allTypes.sort((a, b) => a.display_order - b.display_order);
      setBillTypes(allTypes);

      /* ── Auto-select bill type passed from the previous screen ── */
      const paramBillTypeId = route?.params?.billType;   // id passed by ResidentProfile
      const paramAmount     = route?.params?.amount;     // balance passed by ResidentProfile

      if (paramBillTypeId != null) {
        const matched = allTypes.find((bt) => bt.id === paramBillTypeId);
        if (matched) {
          applyBillTypeSelection(matched, paramAmount);
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (val, min = minPayable, max = maxPayable) => {
    const num = parseFloat(val);

    if (min != null && num < min) {
      setInvalidAmount(true);
      setAmountMessage(`${t('Min amount payable is')} ${min}`);
    } else if (max != null && num > max) {
      setInvalidAmount(true);
      setAmountMessage(`${t('Max amount payable is')} ${max}`);
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
    setAmount(val.toString());
    setSelectedFixedAmount(val);
    setFixedAmountError(false);
    validateAmount(val);
  };

  const handlePayment = async () => {
    if (!selectedBill) {
      showAlert({
        title: t('Error'),
        message: t('Please select a bill type'),
        buttons: [{ text: t('OK') }],
      });
      return;
    }

    if (fixedAmounts && selectedFixedAmount === null) {
      setFixedAmountError(true);
      return;
    }

    const num = parseFloat(amount);
    if (!amount || num <= 0) {
      showAlert({
        title: t('Error'),
        message: t('Please enter a valid amount'),
        buttons: [{ text: t('OK') }],
      });
      return;
    }

    try {
      setPaying(true);
      const url = await ismServices.makePayment(num, selectedBill, payRemarks);
      if (await Linking.canOpenURL(url)) Linking.openURL(url);
    } catch {
      showAlert({
        title: t('Error'),
        message: t('Payment failed. Please try again.'),
        buttons: [{ text: t('OK') }],
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={t('Make Payment')} showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {/* Bill Type */}
          <Text style={styles.label}>{t('Bill Type')}</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setModalVisible(true)}
          >
            <Text style={[styles.dropdownText, !selectedBill && styles.placeholder]}>
              {selectedBill ? selectedBill.name : t('Select bill type')}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          {/* Amount */}
          <Text style={styles.label}>{t('Amount')}</Text>

          <TextInput
            value={amount}
            onChangeText={onAmountChange}
            placeholder={t('Enter amount')}
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            editable={isEditable}
            style={[
              styles.input,
              !isEditable && styles.inputDisabled,
              invalidAmount && styles.inputError,
            ]}
          />

          {invalidAmount && (
            <Text style={styles.errorText}>{amountMessage}</Text>
          )}

          {/* Fixed Amounts */}
          {fixedAmounts && fixedAmounts.length > 0 && (
            <>
              <View style={styles.fixedAmountsRow}>
                {fixedAmounts.map((a) => {
                  const isActive = selectedFixedAmount === +a;
                  return (
                    <TouchableOpacity
                      key={a}
                      style={[
                        styles.fixedBtn,
                        isActive && {
                          backgroundColor: COLORS.primary,
                          borderColor: COLORS.primary,
                        },
                        fixedAmountError && !isActive && { borderColor: '#EF4444' },
                      ]}
                      onPress={() => onFixedAmountTap(a)}
                    >
                      <Text style={[styles.fixedBtnText, isActive && { color: '#fff' }]}>
                        {a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {fixedAmountError && (
                <Text style={styles.errorText}>
                  {t('Please select a fixed amount to proceed')}
                </Text>
              )}
            </>
          )}

          {/* Remarks */}
          <Text style={styles.label}>{t('Remark (Optional)')}</Text>

          <TextInput
            value={payRemarks}
            onChangeText={setPayRemarks}
            placeholder={t('Add remark...')}
            placeholderTextColor="#9CA3AF"
            style={[styles.input, { height: 50 }]}
            multiline
          />

          {!!remarks && (
            <View style={styles.remarksBox}>
              <Text style={styles.remarksNote}>
                <Text style={{ fontWeight: '700' }}>{t('Note')}: </Text>
                {remarks}
              </Text>
            </View>
          )}

          {/* Pay Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: COLORS.primary },
              (invalidAmount || paying) && styles.buttonDisabled,
            ]}
            onPress={handlePayment}
            disabled={invalidAmount || paying}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('Make Payment')}</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* Bill Type Modal */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal}>
            <View style={styles.handle} />

            <Text style={styles.modalTitle}>{t('Select Bill Type')}</Text>

            <FlatList
              data={billTypes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedBill?.id === item.id;
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      applyBillTypeSelection(item);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalText, isSelected && { color: COLORS.primary }]}>
                      {item.name}
                    </Text>
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

  fixedAmountsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10,
  },
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
