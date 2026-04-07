import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Modal, Dimensions, Platform, Animated, Image, FlatList
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '../../Utils/ConetextApi';
import CalendarSelector from '../VisitorsScreen/components/Calender';
import { complaintService } from '../../services/complaintService';
import BRAND from '../config';
import AppHeader from '../components/AppHeader';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { otherServices } from '../../services/otherServices';
import { launchCamera } from 'react-native-image-picker';

const { width } = Dimensions.get('window');
const PRIMARY = BRAND.COLORS.primary;

// ─── Status Modal ─────────────────────────────────────────────────────────────
const StatusModal = ({ visible, type = "loading", title, subtitle, onClose, autoClose = true }) => {
  const [internalVisible, setInternalVisible] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(null);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      ]).start();
      if (type === "loading") {
        rotation.setValue(0);
        rotationAnim.current = Animated.loop(
          Animated.timing(rotation, { toValue: 1, duration: 1200, useNativeDriver: true })
        );
        rotationAnim.current.start();
      }
      if (type === "success" && autoClose) setTimeout(() => handleClose(), 1500);
    } else {
      handleClose();
    }
    return () => {
      if (rotationAnim.current) rotationAnim.current.stop();
      rotation.stopAnimation();
    };
  }, [visible, type]);

  const handleClose = () => {
    if (rotationAnim.current) rotationAnim.current.stop();
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.8, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setInternalVisible(false);
      if (onClose) onClose();
    });
  };

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const renderIcon = () => {
    if (type === "success") return <Ionicons name="checkmark-circle" size={60} color="#22C55E" />;
    if (type === "error") return <Ionicons name="close-circle" size={60} color="#EF4444" />;
    return (
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="sync" size={50} color={PRIMARY} />
      </Animated.View>
    );
  };

  if (!internalVisible) return null;

  return (
    <Modal transparent visible={internalVisible} animationType="none">
      <View style={sm.overlay}>
        <Animated.View style={[sm.box, { opacity, transform: [{ scale }] }]}>
          {renderIcon()}
          {title && <Text style={sm.title}>{title}</Text>}
          {subtitle && <Text style={sm.subtitle}>{subtitle}</Text>}
          {type === "error" && (
            <TouchableOpacity style={sm.closeBtn} onPress={handleClose}>
              <Text style={sm.closeText}>Close</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  box: { width: 280, backgroundColor: "#FFFFFF", padding: 28, borderRadius: 20, alignItems: "center", elevation: 8 },
  title: { fontSize: 18, fontWeight: "700", marginTop: 12, textAlign: "center", color: "#111827" },
  subtitle: { fontSize: 13, marginTop: 6, textAlign: "center", color: "#6B7280", lineHeight: 18 },
  closeBtn: { marginTop: 20, backgroundColor: "#EF4444", paddingVertical: 10, paddingHorizontal: 28, borderRadius: 10 },
  closeText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

// ─── Safe date formatter ──────────────────────────────────────────────────────
const formatDate = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  try {
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch (e) { return null; }
};

const makeTime = (hours, minutes = 0) => {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

// ─── Time Picker Modal ────────────────────────────────────────────────────────
const TimePicker = ({ visible, onClose, fromTime, toTime, onFromChange, onToChange, nightMode }) => {
  const [picking, setPicking] = useState('from');
  const [tempFrom, setTempFrom] = useState(null);
  const [tempTo, setTempTo] = useState(null);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [timeError, setTimeError] = useState('');

  useEffect(() => {
    if (visible) {
      setTempFrom(fromTime || makeTime(9));
      setTempTo(toTime || makeTime(10));
      setPicking('from');
      setShowAndroidPicker(false);
      setTimeError('');
    }
  }, [visible]);

  const t = nightMode
    ? { bg: '#18181F', text: '#F1F5F9', sub: '#64748B', border: '#22222E', row: '#22222E' }
    : { bg: '#FFFFFF', text: '#111827', sub: '#6B7280', border: '#E5E7EB', row: '#F8FAFC' };

  const fmt = (d) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-- : --';

  const handleDone = () => {
    if (tempFrom && tempTo) {
      const fromMins = tempFrom.getHours() * 60 + tempFrom.getMinutes();
      const toMins = tempTo.getHours() * 60 + tempTo.getMinutes();
      if (fromMins >= toMins) { setTimeError('End time must be after start time.'); return; }
    }
    setTimeError('');
    if (tempFrom) onFromChange(tempFrom);
    if (tempTo) onToChange(tempTo);
    onClose();
  };

  const handleTabPress = (tab) => {
    setPicking(tab);
    setTimeError('');
    if (Platform.OS === 'android') setShowAndroidPicker(true);
  };

  const onAndroidChange = (event, date) => {
    setShowAndroidPicker(false);
    if (event.type === 'set' && date) {
      if (picking === 'from') setTempFrom(date);
      else setTempTo(date);
    }
  };

  const activeTime = picking === 'from' ? (tempFrom || makeTime(9)) : (tempTo || makeTime(10));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tp.overlay}>
        <TouchableOpacity style={tp.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[tp.sheet, { backgroundColor: t.bg }]}>
          <View style={[tp.handle, { backgroundColor: t.border }]} />
          <Text style={[tp.title, { color: t.text }]}>Select Time Range</Text>
          {Platform.OS === 'android' && (
            <Text style={{ fontSize: 13, color: t.sub, marginBottom: 14, marginTop: -4 }}>
              Tap FROM or TO to change time
            </Text>
          )}

          <View style={tp.row}>
            <TouchableOpacity
              style={[tp.timeBtn, { backgroundColor: t.row, borderColor: picking === 'from' ? PRIMARY : t.border }]}
              onPress={() => handleTabPress('from')} activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color={PRIMARY} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[tp.label, { color: t.sub }]}>FROM</Text>
                <Text style={[tp.time, { color: t.text }]}>{fmt(tempFrom)}</Text>
              </View>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={16} color={t.sub} style={{ alignSelf: 'center' }} />

            <TouchableOpacity
              style={[tp.timeBtn, { backgroundColor: t.row, borderColor: picking === 'to' ? PRIMARY : t.border }]}
              onPress={() => handleTabPress('to')} activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color={PRIMARY} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[tp.label, { color: t.sub }]}>TO</Text>
                <Text style={[tp.time, { color: t.text }]}>{fmt(tempTo)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {!!timeError && <Text style={[tp.errorTxt, { color: '#EF4444' }]}>{timeError}</Text>}

          {Platform.OS === 'ios' && (
            <View style={tp.pickerContainer}>
              <DateTimePicker
                value={activeTime} mode="time" display="spinner"
                onChange={(_, date) => {
                  if (date) {
                    setTimeError('');
                    if (picking === 'from') setTempFrom(date);
                    else setTempTo(date);
                  }
                }}
                style={{ height: 140 }} textColor={t.text}
              />
            </View>
          )}

          {Platform.OS === 'android' && showAndroidPicker && (
            <DateTimePicker
              key={picking} value={activeTime} mode="time"
              display="default" is24Hour={false} onChange={onAndroidChange}
            />
          )}

          <TouchableOpacity
            style={[tp.doneBtn, { backgroundColor: PRIMARY, marginTop: Platform.OS === 'android' ? 20 : 12 }]}
            onPress={handleDone}
          >
            <Text style={tp.doneTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const tp = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  timeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 12 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 , color:'black'},
  time: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  doneBtn: { marginTop: 12, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  doneTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorTxt: { fontSize: 12, fontWeight: '500', marginBottom: 8, marginTop: 4, textAlign: 'center' },
  pickerContainer: { height: 150, justifyContent: 'center' },
});

// ─── Location Modal ────────────────────────────────────────────────────────────
const LocationModal = ({ visible, onClose, selected, onSelect, nightMode, locations = [] }) => {
  const t = nightMode
    ? { bg: '#18181F', text: '#F1F5F9', sub: '#64748B', border: '#2A2A38', row: '#22222E', searchBg: '#22222E' }
    : { bg: '#FFFFFF', text: '#111827', sub: '#9CA3AF', border: '#F0F0F5', row: '#FAFAFA', searchBg: '#F3F4F6' };

  const [columns, setColumns] = useState([]);
  const [selectedPath, setSelectedPath] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setColumns([locations]);
      setSelectedPath([]);
      setSearchQuery('');
    }
  }, [visible, locations]);

  const getColumnItems = useCallback((colItems, colIndex) => {
    if (colIndex === 0 && searchQuery.trim()) {
      return colItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return colItems;
  }, [searchQuery]);

  const handleParentSelect = (levelIndex, node) => {
    const newPath = [...selectedPath.slice(0, levelIndex), node];
    setSelectedPath(newPath);
    onSelect?.({
      id: node.id,
      name: node.name,
      society_id: node.society_id || null,   // ✅ DON'T fallback to id
      constant_society_id: node.constant_society_id || null
    });
    if (Array.isArray(node.children) && node.children.length > 0) {
      setColumns(prev => [...prev.slice(0, levelIndex + 1), node.children]);
    } else {
      setColumns(prev => prev.slice(0, levelIndex + 1));
      onClose();
    }
  };

  const breadcrumb = selectedPath.map(n => n.name).join(' › ');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={lm.overlay}>
        <TouchableOpacity style={lm.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[lm.sheet, { backgroundColor: t.bg }]}>
          <View style={[lm.handle, { backgroundColor: t.border }]} />

          <View style={lm.headerRow}>
            <View>
              <Text style={[lm.title, { color: t.text }]}>Select Location</Text>
              <Text style={[lm.subtitle, { color: t.sub }]}>Choose area for your complaint</Text>
            </View>
            <TouchableOpacity style={[lm.closeIconBtn, { backgroundColor: t.searchBg }]} onPress={onClose}>
              <Ionicons name="close" size={18} color={t.sub} />
            </TouchableOpacity>
          </View>

          <View style={[lm.searchBar, { backgroundColor: t.searchBg, borderColor: t.border }]}>
            <Ionicons name="search-outline" size={16} color={t.sub} />
            <TextInput
              style={[lm.searchInput, { color: t.text }]}
              placeholder="Search locations..."
              placeholderTextColor={t.sub}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={t.sub} />
              </TouchableOpacity>
            )}
          </View>

          {breadcrumb.length > 0 && (
            <View style={[lm.breadcrumb, { backgroundColor: `${PRIMARY}10`, borderColor: `${PRIMARY}25` }]}>
              <Ionicons name="navigate" size={12} color={PRIMARY} />
              <Text style={[lm.breadcrumbTxt, { color: PRIMARY }]} numberOfLines={1}>
                {breadcrumb}
              </Text>
            </View>
          )}

          {columns.length > 0 && (
            <View style={lm.columnHeadersRow}>
              {columns.map((_, colIndex) => (
                <View key={colIndex} style={lm.columnHeaderItem}>
                  <Text style={[lm.colHeaderTxt, { color: t.sub }]}>
                    {colIndex === 0 ? 'AREA' : colIndex === 1 ? 'ZONE' : colIndex === 2 ? 'BLOCK' : `LEVEL ${colIndex + 1}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Bound the height for FlatList using flex: 1 wrapper */}
          <View style={{ flex: 1 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexDirection: 'row', flexGrow: 1 }}
            >
              {columns.map((colItems, colIndex) => {
                const filteredItems = getColumnItems(colItems, colIndex);
                return (
                  <View
                    key={colIndex}
                    style={[
                      lm.column,
                      colIndex < columns.length - 1 && { borderRightWidth: 1, borderRightColor: t.border },
                    ]}
                  >
                    <FlatList
                      data={filteredItems}
                      keyExtractor={(item) => item.id.toString()}
                      showsVerticalScrollIndicator={false}
                      style={{ flex: 1 }}
                      contentContainerStyle={filteredItems.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
                      ListEmptyComponent={
                        <View style={lm.emptyCol}>
                          <Text style={[lm.emptyTxt, { color: t.sub }]}>No results</Text>
                        </View>
                      }
                      renderItem={({ item }) => {
                        const isSelected = selectedPath[colIndex]?.id === item.id;
                        const hasChildren = Array.isArray(item.children) && item.children.length > 0;

                        return (
                          <TouchableOpacity
                            style={[
                              lm.colItem,
                              isSelected && { backgroundColor: `${PRIMARY}15`, borderRadius: 10 },
                            ]}
                            onPress={() => handleParentSelect(colIndex, item)}
                            activeOpacity={0.65}
                          >
                            <View style={[lm.itemDot, { backgroundColor: isSelected ? PRIMARY : t.border }]} />
                            <Text
                              style={[
                                lm.colItemTxt,
                                { color: isSelected ? PRIMARY : t.text, fontWeight: isSelected ? '700' : '500' }
                              ]}
                              numberOfLines={2}
                            >
                              {item.name}
                            </Text>
                            {hasChildren && (
                              <Ionicons
                                name={isSelected ? "chevron-forward-circle" : "chevron-forward"}
                                size={14}
                                color={isSelected ? PRIMARY : t.sub}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      }}
                      initialNumToRender={15}
                      maxToRenderPerBatch={10}
                      windowSize={5}
                      removeClippedSubviews={Platform.OS === 'android'}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {selectedPath.length > 0 && (
            <View style={[lm.footer, { borderTopColor: t.border }]}>
              <View style={lm.footerLeft}>
                <Ionicons name="location" size={14} color={PRIMARY} />
                <Text style={[lm.footerTxt, { color: t.text }]} numberOfLines={1}>
                  {selectedPath[selectedPath.length - 1]?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={[lm.clearBtn, { borderColor: t.border }]}
                onPress={() => {
                  setSelectedPath([]);
                  setColumns([locations]); // reset immediately
                  setSearchQuery('');
                  onSelect?.(null);
                }}
              >
                <Text style={[lm.clearTxt, { color: t.sub }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const lm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 20, paddingBottom: 30, height: '75%',
  },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 2, fontWeight: '400' },
  closeIconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, marginBottom: 10,
  },
  breadcrumbTxt: { fontSize: 12, fontWeight: '600', flex: 1 },
  columnHeadersRow: { flexDirection: 'row', marginBottom: 4 },
  columnHeaderItem: { width: 170, paddingLeft: 6 },
  colHeaderTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  // CRITICAL FIX: Ensure column takes 100% height so the FlatList inside it is bounded
  column: { width: 170, paddingHorizontal: 4, height: '100%' },
  colItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 8, marginBottom: 2,
  },
  itemDot: { width: 7, height: 7, borderRadius: 4 },
  colItemTxt: { flex: 1, fontSize: 13 },
  emptyCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  emptyTxt: { fontSize: 12 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, marginTop: 8, borderTopWidth: 1,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  footerTxt: { fontSize: 13, fontWeight: '600', flex: 1 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  clearTxt: { fontSize: 12, fontWeight: '500' },
});

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ label, children, t }) => (
  <View style={[s.section, { backgroundColor: t.surface, borderColor: t.border }]}>
    <Text style={[s.secLabel, { color: t.sub }]}>{label.toUpperCase()}</Text>
    {children}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ComplaintInputScreen = ({ navigation, route }) => {
  const { nightMode } = usePermissions();
  const { category, subCategory } = route.params || {};
  const [image, setImage] = useState(null);

  const t = nightMode ? {
    bg: '#0F0F14', surface: '#18181F', border: '#22222ed4',
    text: '#F1F5F9', sub: '#64748B', input: '#1E1E2A',
  } : {
    bg: '#F4F5F8', surface: '#FFFFFF', border: '#ECEEF2',
    text: '#111827', sub: '#9CA3AF', input: '#F8FAFC',
  };

  const [config, setConfig] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [isASAP, setIsASAP] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [fromTime, setFromTime] = useState(null);
  const [toTime, setToTime] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState(null);
  const [showLocModal, setShowLocModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [locations, setLocations] = useState([]);
  const [modalConfig, setModalConfig] = useState({ visible: false, type: 'loading', title: '', subtitle: '' });

  useEffect(() => { loadConfig(); }, []);

  const openLocation = async () => {
    if (locations.length === 0) {
      await loadLocations();
    }
    setShowLocModal(true);
  };

  const loadConfig = async () => {
    try {
      const data = await AsyncStorage.getItem("SOCIETY_CONFIG");
      if (data) { const parsed = JSON.parse(data); setConfig(parsed.data); }
    } catch (error) { console.log("Config Error:", error); }
  };

  const takePicture = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.7,
      });

      if (result?.assets?.length > 0) {
        const base64 = result.assets[0].base64;
        const file = `data:image/jpeg;base64,${base64}`;
        setImage(file);
      }
    } catch (err) {
      console.log("Image picker error:", err);
    }
  };

  const loadLocations = async () => {
    try {
      const res = await otherServices.getCommonAreas();
      setLocations(Array.isArray(res) ? res : []);
    } catch (err) {
      setLocations([]);
    }
  };

  const handlePriorityChange = (val) => {
    setIsASAP(val);
    if (val) { setSelectedDate(null); setFromTime(null); setToTime(null); }
  };

  const fmtTime = (d) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;

  const timeLabel = fromTime && toTime
    ? `${fmtTime(fromTime)}  →  ${fmtTime(toTime)}`
    : fromTime ? `From ${fmtTime(fromTime)}` : 'Select time range';

  const showModal = (type, title, subtitle) => setModalConfig({ visible: true, type, title, subtitle });
  const hideModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  const handleSubmit = async () => {
    if (!selectedArea) { showModal('error', 'Required', 'Please select area type (Common or Unit).'); return; }
    if (selectedArea === 'common' && !location) { showModal('error', 'Required', 'Please select a location for common area.'); return; }
    if (!remarks.trim()) { showModal('error', 'Required', 'Please describe the issue.'); return; }

    if (!isASAP) {
      if (!selectedDate) { showModal('error', 'Required', 'Please select a date.'); return; }
      if (!fromTime || !toTime) { showModal('error', 'Required', 'Please select both start and end time.'); return; }
      const fromMins = fromTime.getHours() * 60 + fromTime.getMinutes();
      const toMins = toTime.getHours() * 60 + toTime.getMinutes();
      if (fromMins >= toMins) { showModal('error', 'Invalid Time', 'End time must be after start time.'); return; }
    }

    if (isASAP && config?.complaint_lock_time) {
      const current = new Date().toTimeString().slice(0, 5);
      const { from, to } = config.complaint_lock_time;
      if (current < from || current > to) {
        showModal('error', 'Complaints Closed', `Complaints allowed only between ${from} and ${to}`);
        return;
      }
    }

    const probableDate = !isASAP ? formatDate(selectedDate) : null;
    const probableTime = !isASAP && fromTime && toTime ? `${fmtTime(fromTime)} to ${fmtTime(toTime)}` : null;
    if (!isASAP && !probableDate) { showModal('error', 'Invalid Date', 'Could not read the selected date.'); return; }

    showModal('loading', 'Submitting...', 'Please wait while we process your request');

    try {
      const complaintData = {
        sub_category: subCategory?.name,
        complaint_type: category?.id,
        description: `${subCategory?.name} : ${remarks}`,
        severity: 'normal',
        sub_category_id: subCategory?.id,
        probable_date: probableDate,
        probable_time: probableTime,
        location_id: location?.id,
        file: image
      };

      if (selectedArea === 'common' && location) {
        complaintData.constant_society_id =
          location.constant_society_id ||
          location.society_id;
      }
      const res = await complaintService.addComplaint(complaintData);

      if (res?.status === 'success') {
        showModal('success', 'Success', `Complaint No: ${res.data.com_no}`);
        setTimeout(() => {
          navigation.navigate('MainApp', {
            screen: 'Service Requests',
            params: { screen: 'ServiceRequestsMain' },
          });
        }, 1500);
      } else {
        showModal('error', 'Error', res?.message || 'Failed to submit complaint.');
      }
    } catch (error) {
      showModal('error', 'Error', error?.message || error?.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]} edges={['top']}>
      <AppHeader title={"Submit Complaint"} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Issue Card */}
        <View style={[s.issueCard, { backgroundColor: `${PRIMARY}0D`, borderColor: `${PRIMARY}25` }]}>
          <View style={[s.issueIconWrap, { backgroundColor: `${PRIMARY}20` }]}>
            <MaterialIcons name="build" size={22} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.issueCat, { color: t.text }]}>{category?.name || 'Unknown Category'}</Text>
            <Text style={[s.issueSub, { color: PRIMARY }]}>{subCategory?.name || 'Unknown Subcategory'}</Text>
          </View>
          <View style={[s.issueBadge, { backgroundColor: `${PRIMARY}20` }]}>
            <Text style={[s.issueBadgeTxt, { color: PRIMARY }]}>Active</Text>
          </View>
        </View>

        {/* ── Priority ─────────────────────────────────────────────────────── */}
        <Section label="Priority" t={t}>
          <View style={s.priorityRow}>
            {/* ASAP Button */}
            <TouchableOpacity
              style={[s.priorityBtn, {
                borderColor: isASAP ? PRIMARY : t.border,
                backgroundColor: isASAP ? `${PRIMARY}12` : t.input,
              }]}
              onPress={() => handlePriorityChange(true)}
              activeOpacity={0.75}
            >
              <View style={[s.priorityIconWrap, { backgroundColor: isASAP ? `${PRIMARY}20` : t.border + '40' }]}>
                <Ionicons name="flash-outline" size={16} color={isASAP ? PRIMARY : t.sub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.priorityTxt, { color: isASAP ? PRIMARY : t.text }]}>ASAP</Text>
                <Text style={[s.priorityDesc, { color: t.sub }]}>High Priority</Text>
              </View>

            </TouchableOpacity>

            {/* Schedule Button */}
            <TouchableOpacity
              style={[s.priorityBtn, {
                borderColor: !isASAP ? PRIMARY : t.border,
                backgroundColor: !isASAP ? `${PRIMARY}12` : t.input,
              }]}
              onPress={() => handlePriorityChange(false)}
              activeOpacity={0.75}
            >
              <View style={[s.priorityIconWrap, { backgroundColor: !isASAP ? `${PRIMARY}20` : t.border + '40' }]}>
                <Ionicons name="calendar-outline" size={16} color={!isASAP ? PRIMARY : t.sub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.priorityTxt, { color: !isASAP ? PRIMARY : t.text }]}>Schedule</Text>
                <Text style={[s.priorityDesc, { color: t.sub }]}>Date & time</Text>
              </View>

            </TouchableOpacity>
          </View>

          {/* Schedule Container (Moved OUTSIDE the row to take full width like your original code) */}
          {!isASAP && (
            <View style={[s.scheduleBox, { borderColor: PRIMARY, backgroundColor: `${PRIMARY}08` }]}>
              <View style={s.scheduleRow}>
                <View style={{ flex: 1 }}>
                  <CalendarSelector
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    required
                    nightMode={nightMode}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.scheduleFieldLabel, { color: t.sub }]}>
                    TIME <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[s.timeBtn, { borderColor: fromTime ? PRIMARY : t.border, backgroundColor: t.surface }]}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.timeBtnValue, { color: fromTime ? t.text : t.sub }]} numberOfLines={1}>
                      {timeLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Section>

        {/* ── Area Type ────────────────────────────────────────────────────── */}
        <Section label="Area Type *" t={t}>
          {/* My Unit */}
          <TouchableOpacity
            style={[s.areaBtn, {
              backgroundColor: selectedArea === 'unit' ? `${PRIMARY}12` : t.input,
              borderColor: selectedArea === 'unit' ? PRIMARY : t.border,
              marginBottom: 8,
            }]}
            onPress={() => { setSelectedArea('unit'); setLocation(null); }}
            activeOpacity={0.75}
          >
            <View style={[s.areaIconWrap, { backgroundColor: selectedArea === 'unit' ? `${PRIMARY}20` : t.border + '50' }]}>
              <Ionicons name="home-outline" size={18} color={selectedArea === 'unit' ? PRIMARY : t.sub} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.areaBtnText, { color: selectedArea === 'unit' ? PRIMARY : t.text }]}>My Unit</Text>
              <Text style={[s.areaBtnDesc, { color: t.sub }]}>Issue is inside your flat / apartment</Text>
            </View>
            {selectedArea === 'unit' && (
              <View style={[s.areaCheck, { backgroundColor: PRIMARY }]}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Common Area Wrapper */}
          <View>
            <TouchableOpacity
              style={[s.areaBtn, {
                backgroundColor: selectedArea === 'common' ? `${PRIMARY}12` : t.input,
                borderColor: selectedArea === 'common' ? PRIMARY : t.border,
              },
              selectedArea === 'common' && s.attachedTopBtn // Removes bottom border/radius when active
              ]}
              onPress={() => { setSelectedArea('common'); setLocation(null); }}
              activeOpacity={0.75}
            >
              <View style={[s.areaIconWrap, { backgroundColor: selectedArea === 'common' ? `${PRIMARY}20` : t.border + '50' }]}>
                <Ionicons name="people-outline" size={18} color={selectedArea === 'common' ? PRIMARY : t.sub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.areaBtnText, { color: selectedArea === 'common' ? PRIMARY : t.text }]}>Common Area</Text>
                <Text style={[s.areaBtnDesc, { color: t.sub }]}>Lobby, gym, pool, corridor & shared spaces</Text>
              </View>
              {selectedArea === 'common' && (
                <View style={[s.areaCheck, { backgroundColor: PRIMARY }]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Nested Location Picker attached to Common Area */}
            {selectedArea === 'common' && (
              <View style={[s.attachedPanel, { borderColor: PRIMARY, backgroundColor: `${PRIMARY}08` }]}>
                <TouchableOpacity
                  style={[s.locationPicker, {
                    backgroundColor: t.surface,
                    borderColor: location ? PRIMARY : t.border,
                  }]}
                  onPress={openLocation}
                  activeOpacity={0.8}
                >
                  <View style={[s.locationIconWrap, { backgroundColor: location ? `${PRIMARY}20` : t.border + '60' }]}>
                    <Ionicons name="location-outline" size={15} color={location ? PRIMARY : t.sub} />
                  </View>
                  <Text style={[s.locationPickerTxt, { color: location ? t.text : t.sub }]} numberOfLines={1}>
                    {location?.name || 'Select specific location'}
                  </Text>
                  <Ionicons name={location ? "checkmark-circle" : "chevron-forward"} size={16} color={location ? PRIMARY : t.sub} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Section>

        {/* ── Photo Attachment Section ──────────────────────────────────────── */}
        <Section label="Photo Attachment (Optional)" t={t}>
          {image ? (
            <View style={s.imagePreviewWrap}>
              <Image source={{ uri: image }} style={s.imagePreview} />
              <TouchableOpacity style={s.removeImageBtn} onPress={() => setImage(null)}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.addPhotoBtn, { borderColor: t.border, backgroundColor: t.input }]}
              onPress={takePicture}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={28} color={t.sub} />
              <Text style={[s.addPhotoTxt, { color: t.sub }]}>Tap to capture photo</Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* ── Remarks ──────────────────────────────────────────────────────── */}
        <Section label="Remarks *" t={t}>
          <TextInput
            style={[s.textarea, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
            placeholder="Describe the issue in detail…"
            placeholderTextColor={t.sub}
            multiline
            numberOfLines={4}
            value={remarks}
            onChangeText={setRemarks}
            textAlignVertical="top"
          />
          {remarks.length > 0 && (
            <Text style={[s.charCount, { color: t.sub }]}>{remarks.length} characters</Text>
          )}
        </Section>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: PRIMARY, opacity: modalConfig.type === 'loading' && modalConfig.visible ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={modalConfig.type === 'loading' && modalConfig.visible}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={s.submitTxt}>Submit Complaint</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <TimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        fromTime={fromTime} toTime={toTime}
        onFromChange={setFromTime} onToChange={setToTime}
        nightMode={nightMode}
      />
      <LocationModal
        visible={showLocModal}
        onClose={() => setShowLocModal(false)}
        selected={location}
        onSelect={setLocation}
        nightMode={nightMode}
        locations={locations}
      />
      <StatusModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        onClose={hideModal}
      />
    </SafeAreaView>
  );
};

export default ComplaintInputScreen;

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90 },

  // Issue Card
  issueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1,
  },
  issueIconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  issueCat: { fontSize: 15, fontWeight: '700' },
  issueSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  issueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  issueBadgeTxt: { fontSize: 11, fontWeight: '700' },

  // Section
  section: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  secLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },

  // Priority
  priorityRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  priorityBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5,
  },
  priorityIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  priorityTxt: { fontSize: 13, fontWeight: '700' },
  priorityDesc: { fontSize: 10, marginTop: 1 },
  priorityCheck: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },

  // Nested Elements & Attachments
  attachedTopBtn: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  attachedPanel: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 12,
  },

  // Schedule box (Restored to Full Width layout)
  scheduleBox: { borderRadius: 12, borderWidth: 1.5, marginTop: 12, padding: 12 },
  scheduleRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  scheduleFieldLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 46,
  },
  timeBtnValue: { fontSize: 11, flex: 1 },

  // Area
  areaBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5,
  },
  areaIconWrap: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  areaBtnText: { fontSize: 13, fontWeight: '700' },
  areaBtnDesc: { fontSize: 11, marginTop: 1 },
  areaCheck: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // Location picker
  locationPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12,
  },
  locationIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  locationPickerTxt: { flex: 1, fontSize: 14 },

  // Photo Attachment
  addPhotoBtn: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 24, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
  },
  addPhotoTxt: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  imagePreviewWrap: {
    height: 140, width: '100%', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ECEEF2',
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#fff', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },

  // Remarks
  textarea: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 100, lineHeight: 22 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6 },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 6,
    elevation: 3, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});