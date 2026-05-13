import React, { useState } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import AppHeader from "../components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const MyNoticeDetailScreen = ({ route }) => {
  const { t } = useTranslation();
  const { notice } = route.params;
  const [loading, setLoading] = useState(true);

  const fileUrls = notice?.file_urls
    ? JSON.parse(notice.file_urls)
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={notice.subject || t("Notice Detail")} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.webViewContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1996D3" />
              <Text style={styles.loadingText}>
                {t("Loading Content...")}
              </Text>
            </View>
          )}

          <WebView
            originWhitelist={["*"]}
            source={{ html: notice.notice || "" }}
            style={styles.webview}
            onLoadEnd={() => setLoading(false)}
            onError={() => setLoading(false)}
            scrollEnabled={false}
            javaScriptEnabled={true}
          />
        </View>

        {fileUrls.length > 0 && (
          <View style={styles.attachmentContainer}>
            <Text style={styles.attachmentTitle}>Attachments</Text>

            {fileUrls.map((url, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => Linking.openURL(url)}
              >
                <Image
                  source={{ uri: url }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  scrollContainer: {
    paddingBottom: 20,
  },
  webViewContainer: {
    height: 350,
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
  },
  attachmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  attachmentTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },
  attachmentImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: "#E5E7EB",
  },
});