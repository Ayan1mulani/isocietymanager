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

    result.minPayable = pv.min != null ? +pv.min : null;
    result.maxPayable = pv.max != null ? +pv.max : null;
    result.fixedAmounts = Array.isArray(pv.fixed_amounts) ? pv.fixed_amounts : null;
    result.isEditable = pv.is_editable !== '0';
    result.remarks = pv.remarks ?? null;
    result.decimalPlaces = pv.decimal ? +pv.decimal : 0;
  } catch (e) { }

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

  const [invalidAmount, setInvalidAmount] = useState(false);
  const [amountMessage, setAmountMessage] = useState('');

  const [selectedFixedAmount, setSelectedFixedAmount] = useState(null);
  const [fixedAmountError, setFixedAmountError] = useState(false);

  /* ✅ FIXED FUNCTION */
  const applyBillTypeSelection = useCallback((billTypeObj, overrideAmount = null) => {
    setSelectedBill(billTypeObj);

    const cfg = parsePmtValidations(billTypeObj);

    setMinPayable(cfg.minPayable);
    setMaxPayable(cfg.maxPayable);
    setFixedAmounts(cfg.fixedAmounts);
    setIsEditable(cfg.isEditable);
    setRemarks(cfg.remarks);

    setSelectedFixedAmount(null);
    setFixedAmountError(false);

    // ✅ USE PASSED AMOUNT ONLY
    const defaultAmount =
      overrideAmount != null
        ? Math.abs(overrideAmount)
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

      let outList = route?.params?.outstanding ?? [];
      if (!outList.length) {
        const res = await otherServices.getOutStandings();
        outList = res?.data ?? [];
      }
      setOutstanding(outList);

      const btRes = await ismServices.getBillTypes();
      let allTypes = Array.from((btRes?.data ?? btRes ?? []).values());

      // filter only user bills
      const filtered = allTypes.filter((type) =>
        outList.some((bill) => String(bill.id) === String(type.id))
      );

      setBillTypes(filtered);

      const paramBillTypeId = route?.params?.billType;
      const paramAmount = route?.params?.amount;

      if (paramBillTypeId != null) {
        const matched = filtered.find(
          (bt) => String(bt.id) === String(paramBillTypeId)
        );
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

  const handlePayment = async () => {
    try {
      setPaying(true);
      const url = await ismServices.makePayment(parseFloat(amount), selectedBill, payRemarks);
      if (await Linking.canOpenURL(url)) Linking.openURL(url);
    } catch {
      showAlert({
        title: t('Error'),
        message: t('Payment failed'),
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
            onChangeText={(val) => {
              setAmount(val);
              validateAmount(val);
            }}
            keyboardType="numeric"
            style={styles.input}
          />

          {/* Pay Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.primary }]}
            onPress={handlePayment}
          >
            <Text style={styles.buttonText}>{t('Make Payment')}</Text>
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* Modal */}
      <Modal transparent visible={modalVisible}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modal}>
            <FlatList
              data={billTypes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      const matched = outstanding.find(
                        (b) => String(b.id) === String(item.id)
                      );

                      const amt = parseFloat(matched?.data?.balance || 0);

                      applyBillTypeSelection(item, amt);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalText}>{item.name}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },

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
  placeholder: { color: '#9CA3AF' },

  input: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
    fontSize: 14, color: '#111827',
  },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  inputError: { borderColor: '#EF4444' },

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
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

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
