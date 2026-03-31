// ServiceRequestDetailCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePermissions } from '../../Utils/ConetextApi';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const COLORS = {
  primary: '#1996D3',
  success: '#28A745',
  warning: '#FFC107',
  info: '#0052CC',
  open: '#1996D3',
  light: {
    background: '#FFFFFF',
    surface: '#ffffff',
    text: '#212529',
    textSecondary: '#6C757D',
    border: '#DEE2E6',
    description: '#495057',
  },
  dark: {
    background: '#1E1E1E',
    surface: '#2A2A2A',
    text: '#FFFFFF',
    textSecondary: '#9E9E9E',
    border: '#2C2C2C',
    description: '#CCCCCC',
  },
};

const REQUEST_STATUS = {
  // ✅ Open — blue
  OPEN: {
    light: { bg: '#CCE7FF', color: COLORS.primary },
    dark: { bg: '#1A2D3D', color: COLORS.primary },
    label: 'Open',
    icon: 'radio-button-on',
  },
  // ✅ WIP / In Progress — orange
  IN_PROGRESS: {
    light: { bg: '#FFF3CD', color: '#E67E00' },
    dark: { bg: '#3D3A1A', color: '#FFC107' },
    label: 'In Progress',
    icon: 'sync',
  },
  // ✅ Pending — yellow
  PENDING: {
    light: { bg: '#FFF3CD', color: COLORS.warning },
    dark: { bg: '#3D3A1A', color: COLORS.warning },
    label: 'Pending',
    icon: 'time-outline',
  },

  REOPEN: {
  light: { bg: '#E9D5FF', color: '#9333EA' },
  dark: { bg: '#2D1B3D', color: '#A855F7' },
  label: 'Reopened',
  icon: 'reload-circle',
},
  // ✅ Resolved / Closed — green
  RESOLVED: {
    light: { bg: '#D4EDDA', color: COLORS.success },
    dark: { bg: '#1A3D2E', color: COLORS.success },
    label: 'Resolved',
    icon: 'checkmark-circle',
  },
  UNKNOWN: {
    light: { bg: '#E9ECEF', color: COLORS.light.textSecondary },
    dark: { bg: '#2A2A2A', color: COLORS.dark.textSecondary },
    label: 'Unknown',
    icon: 'help-circle-outline',
  },
};
const CATEGORY_ICONS = {
  ELECTRICITY: {
    name: "flash",
    library: "Ionicons",
    color: "#F59E0B"   // orange
  },

  PLUMBING: {
    name: "water",
    library: "Ionicons",
    color: "#0EA5E9"   // blue
  },

  HVAC: {
    name: "snow",
    library: "Ionicons",
    color: "#3B82F6"   // cool blue
  },

  MAINTENANCE: {
    name: "construct",
    library: "Ionicons",
    color: "#22C55E"   // green
  },

  CLEANING: {
    name: "sparkles",
    library: "Ionicons",
    color: "#A855F7"   // purple
  },

  DEFAULT: {
    name: "build",
    library: "Ionicons",
    color: "#6B7280"   // gray
  }
};


// ✅ Fixed: proper status mapping
const getStatusConfig = (status, nightMode) => {
  const s = status?.toLowerCase() || '';
  const isActiveStatus = !['resolved', 'closed', 'completed'].includes(status);


  let key = 'UNKNOWN';

  if (['resolved', 'closed', 'completed'].includes(s)) key = 'RESOLVED';
  else if (s === 'open') key = 'OPEN';
  else if (['wip', 'in progress', 'inprogress'].includes(s)) key = 'IN_PROGRESS';
  else if (s === 'pending') key = 'PENDING';
  else if (['reopen', 'reopened'].includes(s)) key = 'REOPEN';

  const config = REQUEST_STATUS[key];
  const themeStyle = nightMode ? config.dark : config.light;

  return {
    ...config,
    bg: themeStyle.bg,
    color: themeStyle.color,
    label: key === 'UNKNOWN' && status ? status : config.label,
  };
};

const getCategoryIcon = (categoryName, theme) => {
  const c = categoryName?.toLowerCase() || "";

  if (c.includes("electric")) return CATEGORY_ICONS.ELECTRICITY;
  if (c.includes("plumb")) return CATEGORY_ICONS.PLUMBING;
  if (c.includes("hvac")) return CATEGORY_ICONS.HVAC;
  if (c.includes("maintenance")) return CATEGORY_ICONS.MAINTENANCE;
  if (c.includes("clean")) return CATEGORY_ICONS.CLEANING;

  return {
    ...CATEGORY_ICONS.DEFAULT,
    color: theme.textSecondary
  };
};

const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateString || '—';
  }
};

const AppIcon = ({ name, library, color, size = 16 }) => {
  switch (library) {
    case 'FontAwesome5':
      return <FontAwesome5 name={name} size={size} color={color} />;
    case 'MaterialIcons':
      return <MaterialIcons name={name} size={size} color={color} />;
    default:
      return <Ionicons name={name} size={size} color={color} />;
  }
};

const ServiceRequestDetailCard = ({ complaint, onPress }) => {
  const { nightMode } = usePermissions();
  const theme = nightMode ? COLORS.dark : COLORS.light;
  let parsedData = {};
  try {
    parsedData = complaint?.data ? JSON.parse(complaint.data) : {};
  } catch (e) { }

  const otp = parsedData?.otp;
  const status = complaint?.status?.toLowerCase();
  const isActiveStatus = !['resolved', 'closed', 'completed'].includes(status);
  const isClosed = ['resolved', 'closed', 'completed'].includes(status);


  const shouldShowOtp =
    otp && !['resolved', 'closed', 'completed'].includes(status);
  const probableDate = complaint?.probable_date;



  const statusConfig = getStatusConfig(complaint?.status, nightMode);
  const categoryIcon = getCategoryIcon(
    complaint?.complaint_type_name,
    complaint?.sub_category,
    theme
  ); const requestNumber = `#${complaint?.com_no ?? complaint?.id ?? '—'}`;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.surface }]}
    >
      {/* Row 1: Request ID + Status badge */}
      <View style={styles.headerRow}>
        <Text style={[styles.idText, { color: COLORS.primary }]} numberOfLines={1}>
          {requestNumber}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Ionicons
            name={statusConfig.icon}
            size={13}
            color={statusConfig.color}
            style={styles.statusIcon}
          />
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Row 2: Category avatar + title / description */}
      <View style={styles.bodyRow}>
        <View style={[styles.avatar, { backgroundColor: `${categoryIcon.color}18` }]}>
          <AppIcon
            name={categoryIcon.name}
            library={categoryIcon.library}
            color={categoryIcon.color}
            size={22}
          />
        </View>
        <View style={styles.textBlock}>
          <Text
            style={[
              styles.categoryText,
              { color: theme.text }
            ]}
            numberOfLines={1}
          >
            {complaint?.complaint_type_name || complaint?.sub_category || 'Service Request'}
          </Text>
          <Text style={[styles.descriptionText, { color: theme.description }]} numberOfLines={2}>
            {complaint?.description || 'No description provided.'}
          </Text>
        </View>
      </View>

      {isActiveStatus && (
        <View style={styles.serviceRow}>

          <View style={styles.visitRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
            <Text style={[styles.probableDateText, { color: theme.textSecondary }]}>
              {probableDate
                ? `Expected Visit: ${formatDate(probableDate)}`
                : "Visit not scheduled"}
            </Text>
          </View>

          {shouldShowOtp && (
            <View style={styles.otpRow}>
              <Ionicons name="key-outline" size={14} color={COLORS.primary} />
              <Text style={[styles.otpLabel, { color: theme.textSecondary }]}>
                OTP:
              </Text>
              <Text style={[styles.otpValue, { color: "#13812c" }]}>
                {otp}
              </Text>
            </View>
          )}

        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Row 3: Created + Updated dates */}
      <View style={styles.footerRow}>
        <View style={styles.dateItem}>
          <View style={styles.dateTexts}>
            <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Created</Text>
            <Text style={[styles.dateValue, { color: theme.text }]}>
              {formatDate(complaint?.created_at)}
            </Text>
          </View>
        </View>
        <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
        <View style={styles.dateItem}>
          <View style={styles.dateTexts}>
            <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
              {isClosed ? "Closed" : "Updated"}
            </Text>

            <Text style={[styles.dateValue, { color: theme.text }]}>
              {formatDate(isClosed ? complaint?.closed_at : complaint?.updated_at)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 3,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(3, 65, 109, 0.09)',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  idText: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    marginLeft: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },

  probableDateText: {
    fontSize: 11,
    fontWeight: "500"
  },

  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  otpValue: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 4,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  dateTexts: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 1,
  },
  verticalDivider: {
    width: 1,
    height: '100%',
    minHeight: 36,
    marginHorizontal: 12,
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    padding: 6,
    borderRadius: 8
  },

  otpLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  otpValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 4,
  }
});

export default ServiceRequestDetailCard;