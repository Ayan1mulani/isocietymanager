import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
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

const BASE_URL          = "https://ism-vms.s3.amazonaws.com/company-logo/";
const DEFAULT_GUEST_URI = "https://app.factech.co.in/user/assets/images/visitor/default-guest.png";

const LOCAL_IMAGES = {
  cab:      require('../../../assets/images/cab.jpg'),
  delivery: require('../../../assets/images/delivery.jpg'),
};

// ─────────────────────────────────────────────────────────────────────────────
// getLogoSource — pure function, returns STABLE primitives
//
// BUG (old): getLogo() returned `{ uri: "..." }` (new object) on every call.
// DetailsAvatar's useEffect watched `source` by reference → fired every render
// → setState → re-render → new object → fired again = infinite loop.
//
// FIX: return a URI string or stable require() number so PassAvatar can
// compare by value (primitive), not by object identity.
// ─────────────────────────────────────────────────────────────────────────────
const getLogoSource = (pass) => {
  const purpose = (pass.purpose || '').toLowerCase();
  const name    = (pass.company_name || pass.name || '').toLowerCase();

  if (purpose === 'cab') {
    if (!name) return LOCAL_IMAGES.cab;                          // stable number
    return `${BASE_URL}${name.replace(/\s+/g, '-')}.png`;       // stable string
  }

  if (purpose === 'delivery') {
    if (!name) return LOCAL_IMAGES.delivery;                     // stable number
    return `${BASE_URL}${name.replace(/\s+/g, '-')}.png`;       // stable string
  }

  return DEFAULT_GUEST_URI;                                      // stable string
};

// ─────────────────────────────────────────────────────────────────────────────
// DetailsAvatar — receives a URI string OR require() number.
// Compares by value so useEffect only fires when the image actually changes.
// ─────────────────────────────────────────────────────────────────────────────
const DetailsAvatar = memo(({ source, purpose, style }) => {
  const isRemote = typeof source === 'string';
  const [imgSrc, setImgSrc] = useState(
    isRemote ? { uri: source } : source
  );

  // useRef tracks previous value so we skip unnecessary setState calls
  const prevSource = useRef(source);
  useEffect(() => {
    if (prevSource.current === source) return;   // same primitive → skip
    prevSource.current = source;
    setImgSrc(isRemote ? { uri: source } : source);
  }, [source]);                                  // safe: source is a primitive

  const handleError = useCallback(() => {
    const p = (purpose || '').toLowerCase();
    if      (p === 'cab')      setImgSrc(LOCAL_IMAGES.cab);
    else if (p === 'delivery') setImgSrc(LOCAL_IMAGES.delivery);
    else                       setImgSrc({ uri: DEFAULT_GUEST_URI });
  }, [purpose]);

  return (
    <Image
      source={imgSrc}
      style={style}
      resizeMode="contain"
      onError={handleError}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Reusable info row — memo so it won't re-render unless its own props change
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow = memo(({ label, value, isLast, theme }) => (
  <>
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.subText }]}>{label}</Text>
      <Text
        style={[styles.infoValue, { color: theme.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
    {!isLast && <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />}
  </>
));

// ─────────────────────────────────────────────────────────────────────────────

const PassDetailsScreen = ({ route }) => {
  const hasChanges = useRef(false);
  const pass       = route?.params?.pass || {};
  const onGoBack   = route?.params?.onGoBack;

  const { nightMode }             = usePermissions() || { nightMode: false };
  const navigation                = useNavigation();
  const { showAlert, AlertComponent } = useAlert(nightMode);

  const [modalConfig, setModalConfig] = useState({
    visible: false, type: 'loading', title: '', subtitle: '',
  });

  // ── Theme (memoized so object reference is stable between renders) ────────
  const theme = useMemo(() => ({
    background: nightMode ? '#121212' : '#F4F6F9',
    card:       nightMode ? '#1E1E1E' : '#FFFFFF',
    text:       nightMode ? '#FFFFFF' : '#111827',
    subText:    nightMode ? '#9CA3AF' : '#6B7280',
    border:     nightMode ? '#2C2C2C' : '#E5E7EB',
  }), [nightMode]);

  // ── Logo source (memoized — only recomputes if pass changes) ─────────────
  // BUG (old): getLogo() called inline → new object every render
  const logoSource = useMemo(() => getLogoSource(pass), [pass.purpose, pass.company_name, pass.name]);

  // ── Entry animation ───────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Status ────────────────────────────────────────────────────────────────
const status = useMemo(() => {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const visitDate = new Date(pass.date_time); visitDate.setHours(0, 0, 0, 0);
  const isToday   = pass.date_time && today.getTime() === visitDate.getTime();

  if (isToday)   return { label: 'ACTIVE',   color: '#34C759' };
  const s = String(pass.status);
  if (s === '1') return { label: 'ACTIVE',   color: '#34C759' };
  if (s === '0') return { label: 'INACTIVE', color: '#EF4444' };
  return            { label: 'PENDING',  color: '#F59E0B' };
}, [pass.status, pass.date_time]);

  // ── Delete handler (stable reference) ────────────────────────────────────
  const handleDelete = useCallback(() => {
    showAlert({
      title:   'Delete Pass',
      message: 'Are you sure you want to delete this pass? This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setModalConfig({ visible: true, type: 'loading', title: 'Deleting Pass', subtitle: 'Please wait...' });

              const res = await visitorServices.cancelPass(pass.id);

              if (res?.status === 'success') {
                hasChanges.current = true;
                setModalConfig({ visible: true, type: 'success', title: 'Deleted!', subtitle: 'The pass has been removed.' });

                setTimeout(() => {
                  setModalConfig(prev => ({ ...prev, visible: false }));
                  if (hasChanges.current && onGoBack) onGoBack();
                  navigation.goBack();
                }, 1500);
              } else {
                setModalConfig({ visible: true, type: 'error', title: 'Failed to delete', subtitle: res?.message || 'Could not remove this pass.' });
              }
            } catch {
              setModalConfig({ visible: true, type: 'error', title: 'Error', subtitle: 'Something went wrong. Please check your connection.' });
            }
          },
        },
      ],
    });
  }, [pass.id, onGoBack, showAlert, navigation]);

  const formatDate = useCallback((ds) => {
    if (!ds) return '-';
    return new Date(ds).toLocaleDateString('en-GB');
  }, []);

  if (!pass?.id) return null;

  const isCab        = (pass.purpose || '').toLowerCase() === 'cab';
  const isGuest      = (pass.purpose || '').toLowerCase() === 'guest';
  const validMobile  = !!pass.mobile && pass.mobile !== 0 && pass.mobile !== '0';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['top', 'left', 'right']}
    >
      <AppHeader title="Pass Details" nightMode={nightMode} showBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              opacity:   fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <DetailsAvatar source={logoSource} purpose={pass.purpose} style={styles.logo} />
          </View>

          {/* Status badge */}
          {/* <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View> */}

          {/* Info rows */}
          <View style={[styles.infoBox, { borderColor: theme.border }]}>
            <InfoRow
              label={isGuest ? 'Visitor Name' : 'Company Name'}
              value={pass.company_name || pass.name || '-'}
              theme={theme}
            />
            {validMobile && (
              <InfoRow label="Phone" value={String(pass.mobile)} theme={theme} />
            )}
            {isGuest && pass.pass_no && (
              <InfoRow label="Pass No." value={pass.pass_no} theme={theme} />
            )}
            <InfoRow
              label="Visit Date"
              value={pass.date_time ? formatDate(pass.date_time) : '-'}
              isLast
              theme={theme}
            />
          </View>

          {/* Cab number box */}
          {isCab && pass.pass_no && (
            <View style={[
              styles.cabBox,
              { backgroundColor: nightMode ? '#2C2C2C' : '#F3F4F6' },
            ]}>
              <Text style={[styles.cabLabel, { color: theme.subText }]}>Cab No.</Text>
              <Text style={[styles.cabNumber, { color: theme.text }]}>{pass.pass_no}</Text>
            </View>
          )}

          {/* Delete */}
          <TouchableOpacity
            style={[styles.deleteButton, { opacity: modalConfig.visible ? 0.7 : 1 }]}
            onPress={handleDelete}
            disabled={modalConfig.visible}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteText}>Delete Pass</Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: theme.subText }]}>
            Created at {pass.created_at ? formatDate(pass.created_at) : '-'}
          </Text>
        </Animated.View>
      </ScrollView>

      <StatusModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        onClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
      />

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