import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Modal, Dimensions, Platform, Animated, Image, FlatList, ActivityIndicator
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
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const PRIMARY = BRAND.COLORS.primary;

// ─── Status Modal ─────────────────────────────────────────────────────────────
const StatusModal = ({ visible, type = "loading", title, subtitle, onClose, autoClose = true }) => {
  const [internalVisible, setInternalVisible] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(null);
  const { t } = useTranslation();

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
              <Text style={sm.closeText}>{t('Close')}</Text>
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
  const { t } = useTranslation();
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

  const th = nightMode
    ? { bg: '#18181F', text: '#F1F5F9', sub: '#64748B', border: '#22222E', row: '#22222E' }
    : { bg: '#FFFFFF', text: '#111827', sub: '#6B7280', border: '#E5E7EB', row: '#F8FAFC' };

  const fmt = (d) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-- : --';

  const handleDone = () => {
    if (tempFrom && tempTo) {
      const fromMins = tempFrom.getHours() * 60 + tempFrom.getMinutes();
      const toMins = tempTo.getHours() * 60 + tempTo.getMinutes();
      if (fromMins >= toMins) { setTimeError(t('End time must be after start time.')); return; }
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
        <View style={[tp.sheet, { backgroundColor: th.bg }]}>
          <View style={[tp.handle, { backgroundColor: th.border }]} />
          <Text style={[tp.title, { color: th.text }]}>{t('Select Time Range')}</Text>
          {Platform.OS === 'android' && (
            <Text style={{ fontSize: 13, color: th.sub, marginBottom: 14, marginTop: -4 }}>
              {t('Tap FROM or TO to change time')}
            </Text>
          )}

          <View style={tp.row}>
            <TouchableOpacity
              style={[tp.timeBtn, { backgroundColor: th.row, borderColor: picking === 'from' ? PRIMARY : th.border }]}
              onPress={() => handleTabPress('from')} activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color={PRIMARY} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[tp.label, { color: th.sub }]}>{t('FROM')}</Text>
                <Text style={[tp.time, { color: th.text }]}>{fmt(tempFrom)}</Text>
              </View>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={16} color={th.sub} style={{ alignSelf: 'center' }} />

            <TouchableOpacity
              style={[tp.timeBtn, { backgroundColor: th.row, borderColor: picking === 'to' ? PRIMARY : th.border }]}
              onPress={() => handleTabPress('to')} activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color={PRIMARY} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[tp.label, { color: th.sub }]}>{t('TO')}</Text>
                <Text style={[tp.time, { color: th.text }]}>{fmt(tempTo)}</Text>
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
                style={{ height: 140 }} textColor={th.text}
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
            <Text style={tp.doneTxt}>{t('Done')}</Text>
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
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, color: 'black' },
  time: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  doneBtn: { marginTop: 12, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  doneTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorTxt: { fontSize: 12, fontWeight: '500', marginBottom: 8, marginTop: 4, textAlign: 'center' },
  pickerContainer: { height: 150, justifyContent: 'center' },
});

// ─── Location Modal — Stack-based drill-down ──────────────────────────────────
/**
 * FIX: constant_society_id is now explicitly tracked via `rootAreaId` state.
 * - When user selects a top-level area (level 0), rootAreaId = that area's API id (e.g. 4709)
 * - When user drills into sub-locations, rootAreaId stays the same (top-level id)
 * - This guarantees constant_society_id is ALWAYS the API-level area id, never a JSON sub-id
 */
const LocationModal = ({ visible, onClose, selected, onSelect, nightMode, locations = [] }) => {
  const { t } = useTranslation();

  const th = nightMode
    ? {
        bg: '#13131A', surface: '#1C1C27', text: '#F1F5F9', sub: '#64748B',
        border: '#2A2A3A', chip: '#22222E', searchBg: '#1C1C27', activeChip: PRIMARY,
      }
    : {
        bg: '#FFFFFF', surface: '#F8FAFC', text: '#111827', sub: '#9CA3AF',
        border: '#ECEEF2', chip: '#F3F4F6', searchBg: '#F3F4F6', activeChip: PRIMARY,
      };

  // Stack navigation state
  // Each entry: { items: Node[], selectedNode: Node, label: string }
  const [navStack, setNavStack] = useState([]);
  const [currentItems, setCurrentItems] = useState([]);
  const [currentSelected, setCurrentSelected] = useState(null); // node selected at this level
  const [rootAreaId, setRootAreaId] = useState(null); // 🔑 always the top-level API id
  const [searchQuery, setSearchQuery] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setNavStack([]);
      setCurrentItems(locations);
      setCurrentSelected(null);
      setRootAreaId(null);
      setSearchQuery('');
      slideAnim.setValue(0);
    }
  }, [visible, locations]);

  const level = navStack.length; // 0 = root

  const levelTitles = [
    t('Select Location'),
    t('Select Zone / Tower'),
    t('Select Block / Floor'),
    t('Select Room / Area'),
  ];
  const currentTitle = levelTitles[level] || t('Select Sub-area');

  // Breadcrumb parts from nav stack
  const breadcrumb = navStack.map(entry => entry.selectedNode.name);

  const filteredItems = level === 0 && searchQuery.trim()
    ? currentItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentItems;

  const animateIn = () => {
    slideAnim.setValue(width * 0.3);
    Animated.spring(slideAnim, { toValue: 0, tension: 180, friction: 22, useNativeDriver: true }).start();
  };

  const animateOut = (callback) => {
    Animated.timing(slideAnim, { toValue: -width * 0.3, duration: 160, useNativeDriver: true }).start(callback);
  };

  /**
   * When a user selects a node:
   * - At level 0: rootAreaId = node.id (the real API id like 4709, 8609, etc.)
   * - At deeper levels: rootAreaId remains unchanged (still the top-level API id)
   * - constant_society_id is ALWAYS the rootAreaId
   */
  const handleSelect = (item) => {
    // 🔑 KEY FIX: derive rootAreaId before setState (since setState is async)
    const newRootId = level === 0 ? item.id : rootAreaId;
    if (level === 0) setRootAreaId(item.id);

    setCurrentSelected(item);

    // Always call onSelect so parent has latest selection with correct constant_society_id
    onSelect?.({
      id: item.id,
      name: item.name,
      breadcrumb: [...breadcrumb, item.name].join(' › '),
      constant_society_id: newRootId, // 🔑 always top-level area id
    });

    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

    if (hasChildren) {
      // Push current level onto stack, navigate into children
      setNavStack(prev => [...prev, {
        items: currentItems,
        selectedNode: item,
        label: currentTitle,
      }]);
      setCurrentItems(item.children);
      setCurrentSelected(null);
      animateIn();
      setSearchQuery('');
    } else {
      // Leaf node — selection done
      onClose();
    }
  };

  const handleBack = () => {
    if (navStack.length === 0) {
      onClose();
      return;
    }
    animateOut(() => {
      const newStack = [...navStack];
      const prev = newStack.pop();
      setNavStack(newStack);
      setCurrentItems(prev.items);
      setCurrentSelected(prev.selectedNode);
      slideAnim.setValue(0);

      // Revert onSelect to the parent node's selection
      const parentLevel = newStack.length;
      const parentRootId = parentLevel === 0 ? prev.selectedNode.id : rootAreaId;
      onSelect?.({
        id: prev.selectedNode.id,
        name: prev.selectedNode.name,
        breadcrumb: [...newStack.map(e => e.selectedNode.name), prev.selectedNode.name].join(' › '),
        constant_society_id: parentRootId,
      });

      // If going back to root, clear rootAreaId
      if (newStack.length === 0) {
        // rootAreaId stays as prev.selectedNode.id (still selecting that area)
      }
    });
  };

  const handleClear = () => {
    setNavStack([]);
    setCurrentItems(locations);
    setCurrentSelected(null);
    setRootAreaId(null);
    setSearchQuery('');
    onSelect?.(null);
  };

  const renderItem = ({ item, index }) => {
    const isSelected = currentSelected?.id === item.id;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const typeLabel = item.type === 'commonarea' ? 'Common' : item.type === 'customarea' ? 'Custom' : null;

    return (
      <TouchableOpacity
        style={[
          lm.item,
          {
            backgroundColor: isSelected ? `${PRIMARY}14` : th.surface,
            borderColor: isSelected ? `${PRIMARY}50` : th.border,
          },
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        {/* Left icon */}
        <View style={[lm.itemIconWrap, { backgroundColor: isSelected ? `${PRIMARY}22` : th.chip }]}>
          <Ionicons
            name={hasChildren ? 'layers-outline' : 'location-outline'}
            size={16}
            color={isSelected ? PRIMARY : th.sub}
          />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text style={[lm.itemName, { color: isSelected ? PRIMARY : th.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          {level === 0 && typeLabel && (
            <View style={[lm.typeBadge, { backgroundColor: isSelected ? `${PRIMARY}20` : th.chip }]}>
              <Text style={[lm.typeBadgeTxt, { color: isSelected ? PRIMARY : th.sub }]}>
                {typeLabel}
              </Text>
            </View>
          )}
          {hasChildren && (
            <Text style={[lm.subText, { color: th.sub }]}>
              {item.children.length} {item.children.length === 1 ? t('sub-location') : t('sub-locations')}
            </Text>
          )}
        </View>

        {/* Right */}
        {isSelected && !hasChildren ? (
          <View style={[lm.checkCircle, { backgroundColor: PRIMARY }]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        ) : (
          <View style={[lm.chevronWrap, { backgroundColor: hasChildren ? `${PRIMARY}12` : 'transparent' }]}>
            <Ionicons
              name={hasChildren ? "chevron-forward" : "checkmark-circle-outline"}
              size={hasChildren ? 14 : 16}
              color={hasChildren ? PRIMARY : isSelected ? PRIMARY : th.sub}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={lm.overlay}>
        <TouchableOpacity style={lm.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[lm.sheet, { backgroundColor: th.bg }]}>
          {/* ── Static top section — never flexes ── */}
          <View>
            {/* Handle */}
            <View style={[lm.handle, { backgroundColor: th.border }]} />

            {/* Header */}
            <View style={lm.headerRow}>
              {/* Back or close */}
              <TouchableOpacity
                style={[lm.iconBtn, { backgroundColor: th.surface, borderColor: th.border }]}
                onPress={level > 0 ? handleBack : onClose}
                activeOpacity={0.7}
              >
                <Ionicons name={level > 0 ? "arrow-back" : "close"} size={18} color={th.text} />
              </TouchableOpacity>

              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[lm.title, { color: th.text }]} numberOfLines={1}>{currentTitle}</Text>
                {/* Depth indicator dots */}
                {level > 0 && (
                  <View style={lm.depthDots}>
                    {[...Array(Math.max(4, level + 2))].map((_, i) => (
                      <View
                        key={i}
                        style={[
                          lm.dot,
                          {
                            backgroundColor: i <= level ? PRIMARY : th.border,
                            width: i === level ? 14 : 6,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* Clear button (only if something selected) */}
              {(rootAreaId || currentSelected) ? (
                <TouchableOpacity
                  style={[lm.clearBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                  onPress={handleClear}
                >
                  <Text style={lm.clearTxt}>{t('Clear')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 50 }} />
              )}
            </View>

            {/* Breadcrumb trail */}
            {breadcrumb.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={lm.breadcrumbScroll}
                contentContainerStyle={lm.breadcrumbContent}
              >
                <TouchableOpacity onPress={handleClear} activeOpacity={0.6}>
                  <View style={[lm.crumb, lm.crumbRoot, { backgroundColor: `${PRIMARY}15`, borderColor: `${PRIMARY}30` }]}>
                    <Ionicons name="home" size={10} color={PRIMARY} />
                    <Text style={[lm.crumbTxt, { color: PRIMARY }]}>{t('All')}</Text>
                  </View>
                </TouchableOpacity>

                {breadcrumb.map((name, i) => (
                  <React.Fragment key={i}>
                    <Ionicons name="chevron-forward" size={10} color={th.sub} style={{ alignSelf: 'center' }} />
                    <View
                      style={[
                        lm.crumb,
                        {
                          backgroundColor: i === breadcrumb.length - 1 ? `${PRIMARY}18` : th.surface,
                          borderColor: i === breadcrumb.length - 1 ? `${PRIMARY}40` : th.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          lm.crumbTxt,
                          { color: i === breadcrumb.length - 1 ? PRIMARY : th.sub, fontWeight: i === breadcrumb.length - 1 ? '700' : '500' },
                        ]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </ScrollView>
            )}

            {/* Search (only at root level) */}
            {level === 0 && (
              <View style={[lm.searchBar, { backgroundColor: th.searchBg, borderColor: th.border }]}>
                <Ionicons name="search-outline" size={16} color={th.sub} />
                <TextInput
                  style={[lm.searchInput, { color: th.text }]}
                  placeholder={t('Search locations...')}
                  placeholderTextColor={th.sub}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={th.sub} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Count badge */}
            {filteredItems.length > 0 && (
              <View style={lm.countRow}>
                <Text style={[lm.countTxt, { color: th.sub }]}>
                  {filteredItems.length} {filteredItems.length === 1 ? t('location') : t('locations')}
                </Text>
                {level === 0 && (
                  <Text style={[lm.countTxt, { color: th.sub }]}>
                    {t('Tap to drill down')}
                  </Text>
                )}
              </View>
            )}
          </View>
          {/* ── End static top section ── */}

          {/* List */}
          <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={lm.listContent}
              ListEmptyComponent={
                <View style={lm.empty}>
                  <Ionicons name="location-outline" size={40} color={th.border} />
                  <Text style={[lm.emptyTxt, { color: th.sub }]}>
                    {searchQuery ? t('No matching locations') : t('No locations available')}
                  </Text>
                </View>
              }
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
            />
          </Animated.View>

          {/* Footer: current full selection */}
          {rootAreaId && currentSelected && (
            <View style={[lm.footer, { borderTopColor: th.border, backgroundColor: th.surface }]}>
              <View style={[lm.footerIconWrap, { backgroundColor: `${PRIMARY}18` }]}>
                <Ionicons name="location" size={14} color={PRIMARY} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[lm.footerLabel, { color: th.sub }]}>{t('Selected')}</Text>
                <Text style={[lm.footerName, { color: th.text }]} numberOfLines={1}>
                  {[...breadcrumb, currentSelected.name].join(' › ')}
                </Text>
              </View>
              <View style={[lm.confirmedBadge, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                <Ionicons name="checkmark" size={10} color="#16A34A" />
                <Text style={lm.confirmedTxt}>{t('Set')}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const lm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { height: 60, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 16, paddingBottom: 0,
    height: Dimensions.get('window').height - 60,
    flex: 1,
    overflow: 'hidden',
  },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  depthDots: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dot: { height: 6, borderRadius: 3 },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  clearTxt: { fontSize: 12, fontWeight: '600', color: '#EF4444' },

  // Breadcrumb
  breadcrumbScroll: { marginBottom: 10, flexGrow: 0, flexShrink: 0, height: 36 },
  breadcrumbContent: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8,
  },
  crumb: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  crumbRoot: {},
  crumbTxt: { fontSize: 11, fontWeight: '600' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Count
  countRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 8, paddingHorizontal: 2,
  },
  countTxt: { fontSize: 11, fontWeight: '500' },

  // List
  listContent: { paddingBottom: 16 },

  // Item
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1,
    paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8,
  },
  itemIconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  itemName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  typeBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, marginTop: 3,
  },
  typeBadgeTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  subText: { fontSize: 11, marginTop: 2, fontWeight: '400' },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  chevronWrap: {
    width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 13, fontWeight: '500' },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    marginHorizontal: -16, marginTop: 4,
    borderTopWidth: 1,
  },
  footerIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  footerLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 1 },
  footerName: { fontSize: 13, fontWeight: '700' },
  confirmedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  confirmedTxt: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
});

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ label, required, error, children, t: th }) => (
  <View style={[s.section, { backgroundColor: th.surface, borderColor: error ? '#EF444440' : th.border }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <Text style={[s.secLabel, { color: th.sub, marginBottom: 0 }]}>{label.toUpperCase()}</Text>
      {required && <Text style={s.starTxt}> ✱</Text>}
    </View>
    {children}
    {!!error && (
      <View style={s.inlineError}>
        <Ionicons name="alert-circle" size={13} color="#EF4444" />
        <Text style={s.inlineErrorTxt}>{error}</Text>
      </View>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ComplaintInputScreen = ({ navigation, route }) => {
  const { nightMode } = usePermissions();
  const { t } = useTranslation();
  const { category, subCategory } = route.params || {};
  const [image, setImage] = useState(null);

  const th = nightMode ? {
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
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [errors, setErrors] = useState({});
  const [modalConfig, setModalConfig] = useState({ visible: false, type: 'loading', title: '', subtitle: '' });

  useEffect(() => { loadConfig(); }, []);

  const openLocation = async () => {
    if (locations.length === 0) {
      setIsLoadingLocations(true);
      await loadLocations();
      setIsLoadingLocations(false);
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
      const result = await launchCamera({ mediaType: 'photo', includeBase64: true, quality: 0.7 });
      if (result?.assets?.length > 0) {
        const base64 = result.assets[0].base64;
        setImage(`data:image/jpeg;base64,${base64}`);
      }
    } catch (err) {
      console.log("Image picker error:", err);
    }
  };

  const loadLocations = async () => {
    try {
      const res = await otherServices.getCommonAreas();

      const formatted = res.map(item => {
        // Items with sub-location data: parse and attach as children
        if (item.data) {
          try {
            const parsed = JSON.parse(item.data);
            return {
              ...item,
              children: parsed.locations || [],
            };
          } catch (e) {
            return { ...item, children: [] };
          }
        }
        // Items without sub-locations: no children
        return { ...item, children: [] };
      });

      setLocations(formatted);
    } catch (err) {
      console.log("Load locations error:", err);
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
    : fromTime ? `${t('From')} ${fmtTime(fromTime)}` : t('Select time range');

  const showModal = (type, title, subtitle) => setModalConfig({ visible: true, type, title, subtitle });
  const hideModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  const handleSubmit = async () => {
    // Collect ALL errors at once so all red messages show together
    const newErrors = {};

    if (!selectedArea) {
      newErrors.area = t('Please select an area type.');
    }
    if (selectedArea === 'common' && !location) {
      newErrors.location = t('Please select a specific location.');
    }
    if (!remarks.trim()) {
      newErrors.remarks = t('Please describe the issue.');
    }
    if (!isASAP) {
      if (!selectedDate) newErrors.date = t('Please select a date.');
      if (!fromTime || !toTime) {
        newErrors.time = t('Please select both start and end time.');
      } else {
        const fromMins = fromTime.getHours() * 60 + fromTime.getMinutes();
        const toMins = toTime.getHours() * 60 + toTime.getMinutes();
        if (fromMins >= toMins) newErrors.time = t('End time must be after start time.');
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (isASAP && config?.complaint_lock_time) {
      const current = new Date().toTimeString().slice(0, 5);
      const { from, to } = config.complaint_lock_time;
      if (current < from || current > to) {
        setErrors({ submit: `${t('Complaints allowed only between')} ${from} ${t('and')} ${to}` });
        return;
      }
    }

    const probableDate = !isASAP ? formatDate(selectedDate) : null;
    const probableTime = !isASAP && fromTime && toTime ? `${fmtTime(fromTime)} to ${fmtTime(toTime)}` : null;
    if (!isASAP && !probableDate) {
      setErrors({ date: t('Could not read the selected date.') });
      return;
    }

    showModal('loading', t('Submitting...'), t('Please wait while we process your request'));

    try {
      const complaintData = {
        sub_category: subCategory?.name,
        complaint_type: category?.id,
        description: `${subCategory?.name} : ${remarks}`,
        severity: 'normal',
        sub_category_id: subCategory?.id,
        probable_date: probableDate,
        probable_time: probableTime,
        file: image,
      };

      if (selectedArea === 'common' && location?.constant_society_id) {
        complaintData.constant_society_id = location.constant_society_id;
      }

      const res = await complaintService.addComplaint(complaintData);

      if (res?.status === 'success') {
        showModal('success', t('Success'), `${t('Complaint No')}: ${res.data.com_no}`);
        setTimeout(() => {
          navigation.navigate('MainApp', {
            screen: 'Service Requests',
            params: { screen: 'ServiceRequestsMain' },
          });
        }, 1500);
      } else {
        showModal('error', t('Error'), res?.message || t('Failed to submit complaint.'));
      }
    } catch (error) {
      showModal('error', t('Error'), error?.message || error?.response?.data?.message || t('Something went wrong'));
    }
  };

  // Display label for the selected location in the picker button
  const locationDisplayName = location
    ? (location.breadcrumb || location.name)
    : null;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: th.bg }]} edges={['top']}>
      <AppHeader title={t('Submit Complaint')} />

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
            <Text style={[s.issueCat, { color: th.text }]}>{category?.name || t('Unknown Category')}</Text>
            <Text style={[s.issueSub, { color: PRIMARY }]}>{subCategory?.name || t('Unknown Subcategory')}</Text>
          </View>
          <View style={[s.issueBadge, { backgroundColor: `${PRIMARY}20` }]}>
            <Text style={[s.issueBadgeTxt, { color: PRIMARY }]}>{t('Active')}</Text>
          </View>
        </View>

        {/* ── Priority ─────────────────────────────────────────────────────── */}
        <Section label={t('Priority')} t={th}>
          <View style={s.priorityRow}>
            <TouchableOpacity
              style={[s.priorityBtn, {
                borderColor: isASAP ? PRIMARY : th.border,
                backgroundColor: isASAP ? `${PRIMARY}12` : th.input,
              }]}
              onPress={() => handlePriorityChange(true)}
              activeOpacity={0.75}
            >
              <View style={[s.priorityIconWrap, { backgroundColor: isASAP ? `${PRIMARY}20` : th.border + '40' }]}>
                <Ionicons name="flash-outline" size={16} color={isASAP ? PRIMARY : th.sub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.priorityTxt, { color: isASAP ? PRIMARY : th.text }]}>{t('ASAP')}</Text>
                <Text style={[s.priorityDesc, { color: th.sub }]}>{t('High Priority')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.priorityBtn, {
                borderColor: !isASAP ? PRIMARY : th.border,
                backgroundColor: !isASAP ? `${PRIMARY}12` : th.input,
              }]}
              onPress={() => handlePriorityChange(false)}
              activeOpacity={0.75}
            >
              <View style={[s.priorityIconWrap, { backgroundColor: !isASAP ? `${PRIMARY}20` : th.border + '40' }]}>
                <Ionicons name="calendar-outline" size={16} color={!isASAP ? PRIMARY : th.sub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.priorityTxt, { color: !isASAP ? PRIMARY : th.text }]}>{t('Schedule')}</Text>
                <Text style={[s.priorityDesc, { color: th.sub }]}>{t('Date & time')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {!isASAP && (
            <View style={[s.scheduleBox, { borderColor: PRIMARY, backgroundColor: `${PRIMARY}08` }]}>
              <View style={s.scheduleRow}>
                <View style={{ flex: 1 }}>
                  <CalendarSelector
                    selectedDate={selectedDate}
                    onDateSelect={(d) => { setSelectedDate(d); setErrors(e => ({ ...e, date: undefined })); }}
                    required
                    nightMode={nightMode}
                  />
                  {!!errors.date && (
                    <View style={s.inlineError}>
                      <Ionicons name="alert-circle" size={13} color="#EF4444" />
                      <Text style={s.inlineErrorTxt}>{errors.date}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.scheduleFieldLabel, { color: th.sub }]}>
                    {t('TIME')} <Text style={{ color: '#EF4444' }}>✱</Text>
                  </Text>
                  <TouchableOpacity
                    style={[s.timeBtn, {
                      borderColor: errors.time ? '#EF4444' : fromTime ? PRIMARY : th.border,
                      backgroundColor: th.surface,
                    }]}
                    onPress={() => { setShowTimePicker(true); setErrors(e => ({ ...e, time: undefined })); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.timeBtnValue, { color: fromTime ? th.text : th.sub }]} numberOfLines={1}>
                      {timeLabel}
                    </Text>
                  </TouchableOpacity>
                  {!!errors.time && (
                    <View style={s.inlineError}>
                      <Ionicons name="alert-circle" size={13} color="#EF4444" />
                      <Text style={s.inlineErrorTxt}>{errors.time}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </Section>

        {/* ── Area Type ────────────────────────────────────────────────────── */}
        <Section label={t('Area Type')} required error={errors.area} t={th}>
          <TouchableOpacity
            style={[s.areaBtn, {
              backgroundColor: selectedArea === 'unit' ? `${PRIMARY}12` : th.input,
              borderColor: selectedArea === 'unit' ? PRIMARY : errors.area ? '#EF444430' : th.border,
              marginBottom: 8,
            }]}
            onPress={() => { setSelectedArea('unit'); setLocation(null); setErrors(e => ({ ...e, area: undefined, location: undefined })); }}
            activeOpacity={0.75}
          >
            <View style={[s.areaIconWrap, { backgroundColor: selectedArea === 'unit' ? `${PRIMARY}20` : th.border + '50' }]}>
              <Ionicons name="home-outline" size={18} color={selectedArea === 'unit' ? PRIMARY : th.sub} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.areaBtnText, { color: selectedArea === 'unit' ? PRIMARY : th.text }]}>{t('My Unit')}</Text>
              <Text style={[s.areaBtnDesc, { color: th.sub }]}>{t('Issue is inside your flat / apartment')}</Text>
            </View>
            {selectedArea === 'unit' && (
              <View style={[s.areaCheck, { backgroundColor: PRIMARY }]}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View>
            <TouchableOpacity
              style={[s.areaBtn, {
                backgroundColor: selectedArea === 'common' ? `${PRIMARY}12` : th.input,
                borderColor: selectedArea === 'common' ? PRIMARY : th.border,
              },
              selectedArea === 'common' && s.attachedTopBtn
              ]}
              onPress={() => { setSelectedArea('common'); setLocation(null); setErrors(e => ({ ...e, area: undefined })); }}
              activeOpacity={0.75}
            >
              <View style={[s.areaIconWrap, { backgroundColor: selectedArea === 'common' ? `${PRIMARY}20` : th.border + '50' }]}>
                <Ionicons name="people-outline" size={18} color={selectedArea === 'common' ? PRIMARY : th.sub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.areaBtnText, { color: selectedArea === 'common' ? PRIMARY : th.text }]}>{t('Common Area')}</Text>
                <Text style={[s.areaBtnDesc, { color: th.sub }]}>{t('Lobby, gym, pool, corridor & shared spaces')}</Text>
              </View>
              {selectedArea === 'common' && (
                <View style={[s.areaCheck, { backgroundColor: PRIMARY }]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {selectedArea === 'common' && (
              <View style={[s.attachedPanel, { borderColor: errors.location ? '#EF4444' : PRIMARY, backgroundColor: `${PRIMARY}08` }]}>
                <TouchableOpacity
                  style={[s.locationPicker, {
                    backgroundColor: th.surface,
                    borderColor: errors.location ? '#EF4444' : location ? PRIMARY : th.border,
                    opacity: isLoadingLocations ? 0.7 : 1,
                  }]}
                  onPress={() => { openLocation(); setErrors(e => ({ ...e, location: undefined })); }}
                  activeOpacity={0.8}
                  disabled={isLoadingLocations}
                >
                  <View style={[s.locationIconWrap, { backgroundColor: location ? `${PRIMARY}20` : th.border + '60' }]}>
                    {isLoadingLocations
                      ? <ActivityIndicator size="small" color={PRIMARY} />
                      : <Ionicons name="location-outline" size={15} color={location ? PRIMARY : th.sub} />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.locationPickerTxt, { color: location ? th.text : errors.location ? '#EF4444' : th.sub }]} numberOfLines={2}>
                      {isLoadingLocations
                        ? t('Loading locations...')
                        : (locationDisplayName || t('Select specific location'))
                      }
                    </Text>
                  </View>
                  {isLoadingLocations
                    ? <ActivityIndicator size="small" color={PRIMARY} style={{ marginLeft: 4 }} />
                    : <Ionicons
                        name={location ? "checkmark-circle" : "chevron-forward"}
                        size={16}
                        color={location ? PRIMARY : th.sub}
                      />
                  }
                </TouchableOpacity>
                {!!errors.location && (
                  <View style={[s.inlineError, { marginTop: 8 }]}>
                    <Ionicons name="alert-circle" size={13} color="#EF4444" />
                    <Text style={s.inlineErrorTxt}>{errors.location}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Section>

        {/* ── Photo Attachment ──────────────────────────────────────────────── */}
        <Section label={t('Photo Attachment (Optional)')} t={th}>
          {image ? (
            <View style={s.imagePreviewWrap}>
              <Image source={{ uri: image }} style={s.imagePreview} />
              <TouchableOpacity style={s.removeImageBtn} onPress={() => setImage(null)}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.addPhotoBtn, { borderColor: th.border, backgroundColor: th.input }]}
              onPress={takePicture}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={28} color={th.sub} />
              <Text style={[s.addPhotoTxt, { color: th.sub }]}>{t('Tap to capture photo')}</Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* ── Remarks ──────────────────────────────────────────────────────── */}
        <Section label={t('Remarks')} required error={errors.remarks} t={th}>
          <TextInput
            style={[s.textarea, {
              backgroundColor: th.input,
              borderColor: errors.remarks ? '#EF4444' : th.border,
              color: th.text,
            }]}
            placeholder={t('Describe the issue in detail…')}
            placeholderTextColor={th.sub}
            multiline
            numberOfLines={4}
            value={remarks}
            onChangeText={(v) => { setRemarks(v); if (v.trim()) setErrors(e => ({ ...e, remarks: undefined })); }}
            textAlignVertical="top"
          />
          {remarks.length > 0 && (
            <Text style={[s.charCount, { color: th.sub }]}>{remarks.length} {t('characters')}</Text>
          )}
        </Section>

        {/* Submit-level error (e.g. complaints closed time) */}
        {!!errors.submit && (
          <View style={s.submitError}>
            <Ionicons name="time-outline" size={15} color="#EF4444" />
            <Text style={s.submitErrorTxt}>{errors.submit}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: PRIMARY, opacity: modalConfig.type === 'loading' && modalConfig.visible ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={modalConfig.type === 'loading' && modalConfig.visible}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={s.submitTxt}>{t('Submit Complaint')}</Text>
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
  issueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1,
  },
  issueIconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  issueCat: { fontSize: 15, fontWeight: '700' },
  issueSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  issueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  issueBadgeTxt: { fontSize: 11, fontWeight: '700' },
  section: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  secLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  priorityRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  priorityBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5,
  },
  priorityIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  priorityTxt: { fontSize: 13, fontWeight: '700' },
  priorityDesc: { fontSize: 10, marginTop: 1 },
  attachedTopBtn: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  attachedPanel: {
    borderWidth: 1.5, borderTopWidth: 0,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 12,
  },
  scheduleBox: { borderRadius: 12, borderWidth: 1.5, marginTop: 12, padding: 12 },
  scheduleRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  scheduleFieldLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 46,
  },
  timeBtnValue: { fontSize: 11, flex: 1 },
  areaBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5,
  },
  areaIconWrap: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  areaBtnText: { fontSize: 13, fontWeight: '700' },
  areaBtnDesc: { fontSize: 11, marginTop: 1 },
  areaCheck: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  locationPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12,
  },
  locationIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  locationPickerTxt: { fontSize: 13, fontWeight: '500' },
  locationIdTxt: { fontSize: 10, fontWeight: '600', marginTop: 2, opacity: 0.8 },
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
  textarea: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 100, lineHeight: 22 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6 },
  starTxt: { fontSize: 12, fontWeight: '800', color: '#EF4444', marginBottom: 0 },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  inlineErrorTxt: { fontSize: 12, color: '#EF4444', fontWeight: '500', flex: 1 },
  submitError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 10,
  },
  submitErrorTxt: { fontSize: 13, color: '#DC2626', fontWeight: '500', flex: 1 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 6,
    elevation: 3, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});