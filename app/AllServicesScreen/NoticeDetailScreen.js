import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Linking,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import sanitizeHtml from "sanitize-html";
import AppHeader from "../components/AppHeader";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

// ─────────────────────────────────────────────────────────────────────────────
// ALLOWED_TAGS
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_TAGS = [
  "div", "span", "p", "br", "hr",
  "section", "article", "main", "aside", "nav",
  "header", "footer",
  "figure", "figcaption",
  "details", "summary",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "del", "ins",
  "sub", "sup", "small", "mark",
  "abbr", "cite", "q", "time",
  "kbd", "samp", "var",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "caption", "colgroup", "col",
  "a", "img",
  "blockquote", "pre", "code",
];

const SAFE_STYLES = {
  "*": {
    color: [/.*/],
    "background-color": [/.*/],
    background: [/^(?!.*url\s*\().*$/i],
    "font-size": [/.*/],
    "font-weight": [/.*/],
    "font-style": [/.*/],
    "font-family": [/.*/],
    "font-variant": [/.*/],
    "text-align": [/.*/],
    "text-decoration": [/.*/],
    "text-decoration-color": [/.*/],
    "text-decoration-style": [/.*/],
    "text-indent": [/.*/],
    "text-overflow": [/^(ellipsis|clip)$/i],
    "text-shadow": [/.*/],
    "text-transform": [/.*/],
    "line-height": [/.*/],
    "letter-spacing": [/.*/],
    "word-spacing": [/.*/],
    "white-space": [/^(normal|pre|pre-wrap|pre-line)$/i],
    "vertical-align": [/.*/],
    margin: [/.*/],
    "margin-top": [/.*/],
    "margin-right": [/.*/],
    "margin-bottom": [/.*/],
    "margin-left": [/.*/],
    padding: [/.*/],
    "padding-top": [/.*/],
    "padding-right": [/.*/],
    "padding-bottom": [/.*/],
    "padding-left": [/.*/],
    border: [/.*/],
    "border-top": [/.*/],
    "border-right": [/.*/],
    "border-bottom": [/.*/],
    "border-left": [/.*/],
    "border-color": [/.*/],
    "border-style": [/.*/],
    "border-width": [/.*/],
    "border-radius": [/.*/],
    "border-collapse": [/^(collapse|separate)$/i],
    "box-shadow": [/.*/],
    outline: [/.*/],
    width: [/^(\d+(\.\d+)?(px|%|em|rem)|auto)$/i],
    "min-width": [/^(\d+(\.\d+)?(px|%|em|rem))$/i],
    "max-width": [/^(\d+(\.\d+)?(px|%|em|rem)|100%)$/i],
    height: [/^(\d+(\.\d+)?(px|%|em|rem)|auto)$/i],
    "min-height": [/^(\d+(\.\d+)?(px|%|em|rem))$/i],
    "max-height": [/^(\d+(\.\d+)?(px|%|em|rem)|none)$/i],
    display: [/^(block|inline|inline-block|flex|inline-flex|grid|inline-grid|none|table|table-cell|table-row|list-item)$/i],
    "flex-direction": [/^(row|column|row-reverse|column-reverse)$/i],
    "flex-wrap": [/^(nowrap|wrap|wrap-reverse)$/i],
    "justify-content": [/^(flex-start|flex-end|center|space-between|space-around|space-evenly)$/i],
    "align-items": [/^(flex-start|flex-end|center|baseline|stretch)$/i],
    "align-self": [/^(auto|flex-start|flex-end|center|baseline|stretch)$/i],
    flex: [/.*/],
    gap: [/.*/],
    "column-gap": [/.*/],
    "row-gap": [/.*/],
    float: [/^(left|right|none)$/i],
    clear: [/^(left|right|both|none)$/i],
    overflow: [/^(hidden|scroll|auto)$/i],
    "overflow-x": [/^(hidden|scroll|auto)$/i],
    "overflow-y": [/^(hidden|scroll|auto)$/i],
    opacity: [/^(0(\.\d+)?|1(\.0+)?)$/],
    "list-style": [/.*/],
    "list-style-type": [/.*/],
    "table-layout": [/^(auto|fixed)$/i],
    cursor: [/^(default|pointer|text|move|not-allowed|help)$/i],
    position: [/^(static|relative)$/i],
    "z-index": [/^\d+$/],
  },
};

const DANGEROUS_CSS_PATTERNS = [
  /url\s*\(/gi,
  /expression\s*\(/gi,
  /javascript\s*:/gi,
  /@import\b/gi,
  /behavior\s*:/gi,
  /-moz-binding\s*:/gi,
];

const extractStyles = (raw = "") => {
  const styleBlocks = [];
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleTagRegex.exec(raw)) !== null) {
    const css = match[1];
    const safeLines = css
      .split("\n")
      .filter((line) => !DANGEROUS_CSS_PATTERNS.some((p) => p.test(line)))
      .join("\n");
    if (safeLines.trim()) styleBlocks.push(safeLines);
  }
  return styleBlocks.join("\n");
};

const sanitizeContent = (raw = "") =>
  sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      "*": ["style", "class"],
    },
    allowedStyles: SAFE_STYLES,
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { img: ["http", "https"] },
    disallowedTagsMode: "discard",
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });

const buildHtml = (body = "", extractedCss = "") => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      html, body { overflow-x: hidden; max-width: 100%; margin: 0; padding: 0; }
      * { box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; unicode-bidi: embed; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 17px;
        line-height: 1.9;
        color: #374151;
        padding: 20px 10px 36px;
        margin: 0;
      }
      h1,h2,h3,h4,h5,h6 { color: #111827; margin-top: 16px; margin-bottom: 8px; font-weight: 700; word-break: break-word; overflow-wrap: anywhere; }
      p { margin-bottom: 16px; }
      ul,ol { padding-left: 20px; margin-bottom: 12px; }
      li { margin-bottom: 4px; }
      a { color: #1565A9; text-decoration: underline; }
      img { max-width: 100%; height: auto; border-radius: 6px; display: block; }
      table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 12px; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; }
      th,td { border: 1px solid #E5E7EB; padding: 10px 12px; font-size: 15px; text-align: left; overflow: hidden; word-break: break-word; overflow-wrap: anywhere; max-width: 0; }
      th { background: #F3F4F6; font-weight: 600; color: #111827; }
      blockquote { border-left: 3px solid #1565A9; padding-left: 12px; color: #6B7280; font-style: italic; margin-bottom: 12px; }
      pre,code { white-space: pre-wrap; word-break: break-all; overflow-wrap: anywhere; font-size: 14px; background: #F3F4F6; padding: 10px; border-radius: 6px; }
      strong,b { font-weight: 700; color: #111827; }
      hr { border: none; border-top: 1px solid #E5E7EB; margin: 16px 0; }
    </style>
    ${extractedCss ? `<style>${extractedCss}</style>` : ""}
    <style>
      * { max-width: 100% !important; overflow-x: hidden !important; word-break: break-word !important; overflow-wrap: anywhere !important; unicode-bidi: embed !important; }
      div,section,article,main,aside,nav,header,footer,figure,p,blockquote { max-width: 100% !important; overflow-x: hidden !important; }
      img { max-width: 100% !important; height: auto !important; }
      table { width: 100% !important; max-width: 100% !important; table-layout: fixed !important; overflow-x: hidden !important; }
      pre,code { white-space: pre-wrap !important; word-break: break-all !important; overflow-wrap: anywhere !important; overflow-x: hidden !important; }
      h1,h2,h3,h4,h5,h6 { word-break: break-word !important; overflow-wrap: anywhere !important; max-width: 100% !important; }
      /* ── Fix: some notices inject "body { display:flex; height:100vh }" via
         their own <style> block. That makes document.body.scrollHeight return
         the viewport height instead of the real content height, causing the
         WebView wrapper to be sized wrong and content to appear shifted up.
         Force body back to normal block flow so height is always content-driven. ── */
      html, body {
        display: block !important;
        height: auto !important;
        min-height: unset !important;
        align-items: unset !important;
        justify-content: unset !important;
      }
    </style>
  </head>
  <body>${body}</body>
</html>
`;

const prepareNoticeHtml = (raw = "") => {
  const extractedCss = extractStyles(raw);
  const sanitizedBody = sanitizeContent(raw);
  return buildHtml(
    sanitizedBody || "<p>No content available.</p>",
    extractedCss,
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const SkeletonItem = ({ width, height, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: "#E5E7EB", borderRadius: 4, opacity },
        style,
      ]}
    />
  );
};

const WebContentSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <SkeletonItem width="100%" height={16} style={{ marginBottom: 12 }} />
    <SkeletonItem width="100%" height={16} style={{ marginBottom: 12 }} />
    <SkeletonItem width="85%" height={16} style={{ marginBottom: 24 }} />
    <SkeletonItem width="100%" height={16} style={{ marginBottom: 12 }} />
    <SkeletonItem width="90%" height={16} style={{ marginBottom: 12 }} />
    <SkeletonItem width="60%" height={16} />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// ATTACHMENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const parseFileUrls = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;

const isImageUrl = (url = "") => IMAGE_EXTS.test(url.split("?")[0]);

const getFileExt = (url = "") => {
  try {
    const path = new URL(url).pathname;
    const name = path.split("/").pop() || "";
    return name.split(".").pop()?.toUpperCase() ?? "FILE";
  } catch {
    return "FILE";
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentsSection
// ─────────────────────────────────────────────────────────────────────────────
const AttachmentsSection = ({ fileUrls }) => {
  if (!fileUrls.length) return null;

  const images = fileUrls.filter(isImageUrl);
  const docs = fileUrls.filter((u) => !isImageUrl(u));

  const handleOpen = (url) => {
    Linking.openURL(url).catch((err) =>
      console.warn("AttachmentsSection: failed to open URL", url, err)
    );
  };

  return (
    <View style={attachStyles.container}>
      <Text style={attachStyles.heading}>Attachments</Text>

      {images.map((url, idx) => (
        <TouchableOpacity
          key={`img-${idx}`}
          activeOpacity={0.85}
          onPress={() => handleOpen(url)}
          style={attachStyles.imageWrapper}
        >
          <Image
            source={{ uri: url }}
            style={attachStyles.image}
            resizeMode="contain"
          />
          <View style={attachStyles.imageDownloadIconWrapper}>
            <Text style={attachStyles.imageDownloadIcon}>↓</Text>
          </View>
        </TouchableOpacity>
      ))}

      {docs.map((url, idx) => {
        const ext = getFileExt(url);
        return (
          <TouchableOpacity
            key={`doc-${idx}`}
            activeOpacity={0.75}
            onPress={() => handleOpen(url)}
            style={attachStyles.fileRow}
          >
            <View style={attachStyles.fileBadge}>
              <Text style={attachStyles.fileBadgeText}>{ext}</Text>
            </View>
            <View style={attachStyles.fileInfo}>
              <Text style={attachStyles.fileName}>Attachment {idx + 1}</Text>
              <Text style={attachStyles.fileSub}>Tap to download</Text>
            </View>
            <View style={attachStyles.downloadIconWrapper}>
              <Text style={attachStyles.downloadIcon}>↓</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NoticeDetailScreenWithHeight
// ─────────────────────────────────────────────────────────────────────────────
const NoticeDetailScreenWithHeight = ({ route }) => {
  const { t, i18n } = useTranslation();
  const { notice, headerTitle } = route.params;
  const [loading, setLoading] = useState(true);
  const [webViewHeight, setWebViewHeight] = useState(400);

  // ✅ FIX 1: Read the real bottom inset so the scroll view always clears
  //            the home indicator / gesture bar on every device.
  const insets = useSafeAreaInsets();

  // Reset loading + height every time this screen is navigated to,
  // so stale content/height from a previous visit never shows.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setWebViewHeight(400);
    }, [])
  );

  const fullHtml = prepareNoticeHtml(notice?.notice);
  const fileUrls = parseFileUrls(notice?.file_urls);

  const formattedDate = notice.published_at
    ? new Date(notice.published_at).toLocaleDateString(
      i18n.language === "km" ? "km-KH" : "en-IN",
      { day: "numeric", month: "long", year: "numeric" }
    )
    : "";

  return (
    // ✅ FIX 2: Only apply top + left + right safe-area via SafeAreaView.
    //            Bottom is handled manually via useSafeAreaInsets so the
    //            ScrollView's rubber-band area stays white instead of being
    //            double-inset or clipped.
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <AppHeader
        title={t(headerTitle || "Notice Details")}
        showBack
      />

      {/* ── Header (title + date) — kept outside ScrollView so it stays fixed ── */}
      <View style={styles.header}>
        <Text style={styles.title}>{notice.subject}</Text>
        <Text style={styles.meta}>{formattedDate}</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        // ✅ FIX 3: Use the real bottom inset + extra breathing room instead
        //            of the hardcoded 40 px that was too small on many devices.
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={true}
        bounces={false}
      >
        {/* ── Body (WebView — height grows to content) ── */}
        <View style={[styles.webViewWrapper, { height: webViewHeight }]}>
          {loading && <WebContentSkeleton />}

          <WebView
            originWhitelist={["about:blank", "about:*", "data:*"]}
            source={{ html: fullHtml }}
            // ✅ FIX 4: Keep opacity transition but also set pointerEvents so
            //            the invisible WebView can't accidentally swallow taps
            //            while the skeleton is showing.
            style={[styles.webView, { opacity: loading ? 0 : 1 }]}
            pointerEvents={loading ? "none" : "auto"}
            onLoadEnd={() => setLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={false}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            scalesPageToFit={false}
            mixedContentMode="never"
            injectedJavaScript={`
              (function() {
                function postHeight() {
                  window.ReactNativeWebView.postMessage(
                    JSON.stringify({ type: 'height', value: Math.max(document.documentElement.scrollHeight, document.documentElement.offsetHeight) })
                  );
                }
                postHeight();
                window.addEventListener('load', postHeight);
                setTimeout(postHeight, 300);
              })();
              true;
            `}
            onMessage={(e) => {
              try {
                const msg = JSON.parse(e.nativeEvent.data);
                if (msg.type === "height" && msg.value > 0) {
                  setWebViewHeight(msg.value + 24);
                }
              } catch { }
            }}
            onShouldStartLoadWithRequest={(req) => {
              const url = req.url || "";
              if (
                url === "about:blank" ||
                url === "" ||
                url.startsWith("data:")
              ) {
                return true;
              }
              Linking.openURL(url).catch((err) =>
                console.warn("NoticeDetailScreen: failed to open URL", url, err)
              );
              return false;
            }}
          />
        </View>

        {/* ── Attachments at the bottom ── */}
        <AttachmentsSection fileUrls={fileUrls} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default NoticeDetailScreenWithHeight;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flex: 1,
  },
  // paddingBottom is now set dynamically via insets — no static value here
  scrollContent: {},
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    marginBottom: 5,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 26,
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
  },
  webViewWrapper: {
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  skeletonContainer: {
    position: "absolute",
    top: 12,
    left: 14,
    right: 14,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
});

const attachStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  heading: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  imageWrapper: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  image: {
    width: "100%",
    height: 200,
    backgroundColor: "#E5E7EB",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
  },
  fileBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#1565A9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  fileBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    lineHeight: 20,
  },
  fileSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  downloadIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F2FB",
    justifyContent: "center",
    alignItems: "center",
  },
  downloadIcon: {
    fontSize: 22,
    color: "#1565A9",
    fontWeight: "700",
    lineHeight: 24,
  },
  imageDownloadIconWrapper: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(21, 101, 169, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageDownloadIcon: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 24,
  },
});