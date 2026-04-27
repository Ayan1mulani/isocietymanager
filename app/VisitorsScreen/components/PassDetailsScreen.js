import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '../../../Utils/ConetextApi';
import AppHeader from '../../components/AppHeader';
import { visitorServices } from '../../../services/visitorServices';
import { useNavigation } from '@react-navigation/native';
import StatusModal from '../../components/StatusModal';
import useAlert from '../../components/UseAlert';
import { useTranslation } from 'react-i18next';
import Text from '../../components/TranslatedText';

const BASE_URL          = "https://ism-vms.s3.amazonaws.com/company-logo/";
const DEFAULT_GUEST_URI = "https://app.factech.co.in/user/assets/images/visitor/default-guest.png";

const LOCAL_IMAGES = {
  cab:      require('../../../assets/images/cab.jpg'),
  delivery: require('../../../assets/images/delivery.jpg'),
};

const getLogoSource = (pass) => {
  const purpose = (pass.purpose || '').toLowerCase();
  const name    = (pass.company_name || pass.name || '').toLowerCase();

  if (purpose === 'cab') {
    if (!name) return LOCAL_IMAGES.cab;
    return `${BASE_URL}${name.replace(/\s+/g, '-')}.png`;
  }
  if (purpose === 'delivery') {
    if (!name) return LOCAL_IMAGES.delivery;
    return `${BASE_URL}${name.replace(/\s+/g, '-')}.png`;
  }
  return DEFAULT_GUEST_URI;
};

const DetailsAvatar = memo(({ source, purpose, style }) => {
  const isRemote = typeof source === 'string';
  const [imgSrc, setImgSrc] = useState(isRemote ? { uri: source } : source);
  const prevSource = useRef(source);

  useEffect(() => {
    if (prevSource.current === source) return;
    prevSource.current = source;
    setImgSrc(isRemote ? { uri: source } : source);
  }, [source, isRemote]);

  const handleError = useCallback(() => {
    const p = (purpose || '').toLowerCase();
    if      (p === 'cab')      setImgSrc(LOCAL_IMAGES.cab);
    else if (p === 'delivery') setImgSrc(LOCAL_IMAGES.delivery);
    else                       setImgSrc({ uri: DEFAULT_GUEST_URI });
  }, [purpose]);

  return <Image source={imgSrc} style={style} resizeMode="contain" onError={handleError} />;
});

const InfoRow = memo(({ label, value, isLast, theme }) => (
  <>
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.subText }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
    </View>
    {!isLast && <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />}
  </>
));

const PassDetailsScreen = ({ route }) => {
  const { t, i18n } = useTranslation();
  const hasChanges = useRef(false);
  const pass       = route?.params?.pass || {};
  const onGoBack   = route?.params?.onGoBack;

  const { nightMode } = usePermissions() || { nightMode: false };
  const navigation = useNavigation();
  const { showAlert, AlertComponent } = useAlert(nightMode);

  const [modalConfig, setModalConfig] = useState({
    visible: false, type: 'loading', title: '', subtitle: '',
  });

  const theme = useMemo(() => ({
    background: nightMode ? '#121212' : '#F4F6F9',
    card:       nightMode ? '#1E1E1E' : '#FFFFFF',
    text:       nightMode ? '#FFFFFF' : '#111827',
    subText:    nightMode ? '#9CA3AF' : '#6B7280',
    border:     nightMode ? '#2C2C2C' : '#E5E7EB',
  }), [nightMode]);

  const logoSource = useMemo(() => getLogoSource(pass), [pass.purpose, pass.company_name, pass.name]);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const formatDate = useCallback((ds) => {
    if (!ds) return '-';
    try {
      return new Date(ds).toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return ds; }
  }, [i18n.language]);

  const handleDelete = useCallback(() => {
    showAlert({
      title:   t('Delete Pass'),
      message: t('Are you sure you want to delete this pass? This cannot be undone.'),
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        {
          text:  t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setModalConfig({ visible: true, type: 'loading', title: t('Deleting Pass'), subtitle: t('Please wait...') });
              const res = await visitorServices.cancelPass(pass.id);
              if (res?.status === 'success') {
                hasChanges.current = true;
                setModalConfig({ visible: true, type: 'success', title: t('Deleted!'), subtitle: t('The pass has been removed.') });
                setTimeout(() => {
                  setModalConfig(prev => ({ ...prev, visible: false }));
                  if (hasChanges.current && onGoBack) onGoBack();
                  navigation.goBack();
                }, 1500);
              } else {
                setModalConfig({ visible: true, type: 'error', title: t('Failed'), subtitle: res?.message || t('Could not remove this pass.') });
              }
            } catch {
              setModalConfig({ visible: true, type: 'error', title: t('Error'), subtitle: t('Something went wrong.') });
            }
          },
        },
      ],
    });
  }, [pass.id, onGoBack, showAlert, navigation, t]);

  if (!pass?.id) return null;

  const isCab   = (pass.purpose || '').toLowerCase() === 'cab';
  const isGuest = (pass.purpose || '').toLowerCase() === 'guest';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <AppHeader title={t("Pass Details")} nightMode={nightMode} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Animated.View style={[styles.card, { backgroundColor: theme.card, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoContainer}>
            <DetailsAvatar source={logoSource} purpose={pass.purpose} style={styles.logo} />
          </View>

          <View style={[styles.infoBox, { borderColor: theme.border }]}>
            <InfoRow label={isGuest ? t('Visitor Name') : t('Company Name')} value={pass.company_name || pass.name || '-'} theme={theme} />
            {!!pass.mobile && pass.mobile !== '0' && (
              <InfoRow label={t("Phone")} value={String(pass.mobile)} theme={theme} />
            )}
            {isGuest && pass.pass_no && (
              <InfoRow label={t("Pass No.")} value={pass.pass_no} theme={theme} />
            )}
            <InfoRow label={t("Visit Date")} value={pass.date_time ? formatDate(pass.date_time) : '-'} isLast theme={theme} />
          </View>

          {isCab && pass.pass_no && (
            <View style={[styles.cabBox, { backgroundColor: nightMode ? '#2C2C2C' : '#F3F4F6' }]}>
              <Text style={[styles.cabLabel, { color: theme.subText }]}>{t("Cab No.")}</Text>
              <Text style={[styles.cabNumber, { color: theme.text }]}>{pass.pass_no}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.deleteButton, { opacity: modalConfig.visible ? 0.7 : 1 }]} onPress={handleDelete} disabled={modalConfig.visible}>
            <Text style={styles.deleteText}>{t("Delete Pass")}</Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: theme.subText }]}>
            {t("Created at")} {pass.created_at ? formatDate(pass.created_at) : '-'}
          </Text>
        </Animated.View>
      </ScrollView>

      <StatusModal visible={modalConfig.visible} type={modalConfig.type} title={modalConfig.title} subtitle={modalConfig.subtitle} onClose={() => setModalConfig({ ...modalConfig, visible: false })} />
      <AlertComponent />
    </SafeAreaView>
  );
};

export default PassDetailsScreen;

const styles = StyleSheet.create({
  card: {
    borderRadius:  24,
    margin:        16,
    padding:       20,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius:  12,
    elevation:     6,
    alignItems:    'center',
  },
  logoContainer: { alignItems: 'center', marginTop: 8, marginBottom: 10 },
  logo:          { width: 80, height: 80, borderRadius: 40 },
  statusBadge: {
    alignSelf:       'center',
    paddingHorizontal: 14,
    paddingVertical:  5,
    borderRadius:    10,
    marginBottom:    14,
  },
  statusText:    { fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  infoBox: {
    width:        '100%',
    borderWidth:  1,
    borderRadius: 16,
    overflow:     'hidden',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical:   12,
    paddingHorizontal: 16,
  },
  rowDivider:  { height: 1, width: '100%' },
  infoLabel:   { fontSize: 13, fontWeight: '600', flex: 1 },
  infoValue:   { fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  cabBox: {
    borderRadius:  14,
    paddingVertical: 14,
    alignItems:    'center',
    width:         '100%',
    marginBottom:  14,
    borderWidth:   1,
    borderColor:   'rgba(0,0,0,0.05)',
  },
  cabLabel:  { fontSize: 11, marginBottom: 4, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  cabNumber: { fontSize: 30, fontWeight: '800', letterSpacing: 4 },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius:    14,
    alignItems:      'center',
    width:           '100%',
    shadowColor:     '#EF4444',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.2,
    shadowRadius:    6,
    elevation:       3,
    marginBottom:    4,
  },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  footerText: { fontSize: 12, textAlign: 'center', marginTop: 12 },
});