import React, { useState } from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import AppHeader from "../components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";

const MyNoticeDetailScreen = ({ route }) => {
  const { notice } = route.params;
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={notice.subject} />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1996D3" />
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
  },
});