import React, { useState } from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import AppHeader from "../components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const MyNoticeDetailScreen = ({ route }) => {
  const { t } = useTranslation();
  const { notice } = route.params;
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      {/* Subject is dynamic from API, usually kept as is */}
      <AppHeader title={notice.subject || t("Notice Detail")} />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1996D3" />
          <Text style={styles.loadingText}>{t("Loading Content...")}</Text>
        </View>
      )}

      <WebView
        originWhitelist={["*"]}
        source={{ html: notice.notice }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        javaScriptEnabled={true}
      />
    </SafeAreaView>
  );
};

export default MyNoticeDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.8)' // Light overlay while loading
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280"
  }
});