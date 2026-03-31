import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
const PreApprovedCard = ({ item, theme, onEdit }) => {

  // Week labels
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Active day indexes (0-6)
  const activeDays = item.activeDays || [];

  // Format date nicely
  const formatDate = (date) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  return (
    <View style={[styles.card,]}>

      {/* ================= TOP SECTION ================= */}
      {/* Photo + Info (Left) and PassID + Edit (Right) */}
      <View style={styles.topRow}>

        {/* ---------- LEFT SIDE (Photo + Details) ---------- */}

        <View style={styles.leftSection}>

          {/* Profile Photo */}
          <Image
            source={{ uri: item.photo }}
            style={styles.photo}
          />

          {/* Info Section */}
          <View style={styles.infoSection}>

            {/* Name */}
            <Text style={[styles.name, { color: theme.text }]}>
              {item.name}
            </Text>

            {/* Type + Allowed per day */}
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: "#8652e0ed" }]}>
                {item.type}
              </Text>

              <Text style={[styles.dotSeparator, { color: theme.textSecondary }]}>

              </Text>

              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {item.allowedPerDay}
              </Text>
            </View>

            {/* Phone */}
            {item.phone && (
              <Text style={[styles.phone, { color: theme.textSecondary }]}>
                {item.phone}
              </Text>
            )}

          </View>
        </View>



        {/* ---------- RIGHT SIDE (Pass ID + Edit Button) ---------- */}
        <View style={styles.rightSection}>

          {/* Pass ID */}
          {item.passId && (
            <Text style={[styles.passId, { color: theme.primary }]}>
              #{item.passId}
            </Text>
          )}

          {/* Edit Button */}
          {/* <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme.editButtonBg }]}
            onPress={() => onEdit(item)}
            activeOpacity={0.7}
          >
            < Ionicons
              name="create-outline"
              size={16}
              color={theme.editButtonText}
            />
          </TouchableOpacity> */}

        </View>
      </View>

      {/* ================= DIVIDER ================= */}
      <View style={[styles.divider, { backgroundColor: theme.divider }]} />

      {/* ================= BOTTOM SECTION ================= */}
      <View style={styles.footerRow}>

        {/* Created Date */}
        <View style={styles.createdSection}>

          <Text style={[styles.createdText, { color: theme.textSecondary }]}>
            Created: {formatDate(item.createdDate)}
          </Text>
        </View>

        {/* Weekday Availability */}
  <View style={styles.weekDaysContainer}>
  {weekDays.map((day, index) => {
    const isActive = activeDays.includes(index);

    return (
      <View key={index} style={styles.dayColumn}>
        <Text
          style={[
            styles.dayText,
            {
              color: isActive
                ? '#22C55E' // ✅ GREEN TEXT
                : '#a29a9aeb',
              fontWeight: isActive ? '600' : '400',
            },
          ]}
        >
          {day}
        </Text>
      </View>
    );
  })}
</View>
      </View>

    </View>
  );
};

export default PreApprovedCard;

const styles = StyleSheet.create({

  /* Card Container */
  card: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden', // 👈 important
  },


  /* ===== TOP ROW ===== */
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  /* Left Section */
  leftSection: {
    flexDirection: 'row',
    flex: 1,
  },

  /* Profile Photo */
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#f3f4f6',
  },

  /* Info Container */
  infoSection: {
    flex: 1,
    justifyContent: 'start',
  },

  /* Name */
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeDayBox: {
    backgroundColor: '#22C55E',   // GREEN
    borderRadius: 10,
    paddingVertical: 4,
  },

  /* Phone */
  phone: {
    fontSize: 12,
    marginLeft: 4,
    marginTop: 1
  },

  /* Meta row */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },

  weekDaysContainer: {
  flexDirection: 'row',
  marginLeft: 10,
},

dayColumn: {
  alignItems: 'center',
  width: 18,
},

dayText: {
  fontSize: 11,
},
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    fontSize: 13,
    marginLeft: 4,
  },

  iconWrapper: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkIcon: {
    width: 10,
    height: 10,
  },

  /* Right Section */
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 56,
  },

  passId: {
    fontSize: 14,
    fontWeight: '700',
  },

  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },




  /* ===== FOOTER ===== */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11
  },

  createdSection: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
  },

  createdText: {
    fontSize: 12,
    marginLeft: 6,
  },

  weekDaysContainer: {
    flexDirection: 'row',
    flexShrink: 1,
    marginLeft: 10,
  },

  dayColumn: {
    alignItems: 'center',
    width: 18,
  },

  emptyCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },

  dayText: {
    fontSize: 10,
    marginTop: 3,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },

  infoSection: {
    flex: 1,
    justifyContent: 'center',
  },

  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  metaText: {
    fontSize: 13,
  },

  dotSeparator: {
    marginHorizontal: 2,
    fontSize: 13,
  },

  phone: {
    fontSize: 12,
    opacity: 0.8,
  },

});