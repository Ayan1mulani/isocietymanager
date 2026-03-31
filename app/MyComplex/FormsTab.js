import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ismServices } from "../../services/ismServices";

const stripHtml = (html = "") =>
  html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const FormsScreen = () => {
  const navigation = useNavigation();

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchForms = useCallback(async () => {
    try {
      setError(null);
      const response = await ismServices.getMyNotices("FORMS");
      setForms(response?.data || []);
    } catch (err) {
      console.log("Forms Error:", err?.message);
      setError("Failed to load forms");
      setForms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchForms();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1F78D1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Unable to Load Forms</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={fetchForms}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={forms}
        keyExtractor={(item, index) =>
          item?.id ? String(item.id) : String(index)
        }
        renderItem={({ item }) => {
          const title = stripHtml(item.notice || "");

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("NoticeDetail", {
                  notice: item,
                })
              }
            >
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>

              {item.subject && (
                <Text style={styles.subject} numberOfLines={2}>
                  {item.subject}
                </Text>
              )}

              <Text style={styles.viewText}>
                View Form →
              </Text>
            </TouchableOpacity>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1F78D1"]}
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          {
            flexGrow: 1,
            justifyContent:
              forms.length === 0
                ? "center"
                : "flex-start",
          },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>
              No Forms Available
            </Text>
            <Text style={styles.emptyText}>
              There are no forms uploaded yet.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default FormsScreen;

/* ───────── Styles ───────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  listContainer: {
    padding: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },

  subject: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
  },

  viewText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F78D1",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },

  emptyText: {
    fontSize: 13,
    color: "#64748B",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  errorMessage: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
  },

  retryBtn: {
    backgroundColor: "#1F78D1",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryText: {
    color: "#fff",
    fontWeight: "700",
  },
});