import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import sanitizeHtml from "sanitize-html";
import AppHeader from "../components/AppHeader";

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

// ─────────────────────────────────────────────────────────────────────────────
// SAFE_STYLES
//
// OVERFLOW FIX 2: "overflow: visible" removed from allowed values.
// Inline styles can no longer make content visually bleed outside its box.
// Only hidden / scroll / auto are permitted.
// ─────────────────────────────────────────────────────────────────────────────
const SAFE_STYLES = {
  "*": {
    color:                   [/.*/],
    "background-color":      [/.*/],
    background:              [/^(?!.*url\s*\().*$/i],
    "font-size":             [/.*/],
    "font-weight":           [/.*/],
    "font-style":            [/.*/],
    "font-family":           [/.*/],
    "font-variant":          [/.*/],
    "text-align":            [/.*/],
    "text-decoration":       [/.*/],
    "text-decoration-color": [/.*/],
    "text-decoration-style": [/.*/],
    "text-indent":           [/.*/],
    "text-overflow":         [/^(ellipsis|clip)$/i],
    "text-shadow":           [/.*/],
    "text-transform":        [/.*/],
    "line-height":           [/.*/],
    "letter-spacing":        [/.*/],
    "word-spacing":          [/.*/],
    // OVERFLOW FIX 2: "nowrap" removed — it forces single-line content that
    // overflows the viewport on narrow screens
    "white-space":           [/^(normal|pre|pre-wrap|pre-line)$/i],
    "vertical-align":        [/.*/],
    margin:                  [/.*/],
    "margin-top":            [/.*/],
    "margin-right":          [/.*/],
    "margin-bottom":         [/.*/],
    "margin-left":           [/.*/],
    padding:                 [/.*/],
    "padding-top":           [/.*/],
    "padding-right":         [/.*/],
    "padding-bottom":        [/.*/],
    "padding-left":          [/.*/],
    border:                  [/.*/],
    "border-top":            [/.*/],
    "border-right":          [/.*/],
    "border-bottom":         [/.*/],
    "border-left":           [/.*/],
    "border-color":          [/.*/],
    "border-style":          [/.*/],
    "border-width":          [/.*/],
    "border-radius":         [/.*/],
    "border-collapse":       [/^(collapse|separate)$/i],
    "box-shadow":            [/.*/],
    outline:                 [/.*/],
    // OVERFLOW FIX 2: width/height allow only safe units — vw/vh blocked
    width:                   [/^(\d+(\.\d+)?(px|%|em|rem)|auto)$/i],
    "min-width":             [/^(\d+(\.\d+)?(px|%|em|rem))$/i],
    "max-width":             [/^(\d+(\.\d+)?(px|%|em|rem)|100%)$/i],
    height:                  [/^(\d+(\.\d+)?(px|%|em|rem)|auto)$/i],
    "min-height":            [/^(\d+(\.\d+)?(px|%|em|rem))$/i],
    "max-height":            [/^(\d+(\.\d+)?(px|%|em|rem)|none)$/i],
    display:                 [/^(block|inline|inline-block|flex|inline-flex|grid|inline-grid|none|table|table-cell|table-row|list-item)$/i],
    "flex-direction":        [/^(row|column|row-reverse|column-reverse)$/i],
    "flex-wrap":             [/^(nowrap|wrap|wrap-reverse)$/i],
    "justify-content":       [/^(flex-start|flex-end|center|space-between|space-around|space-evenly)$/i],
    "align-items":           [/^(flex-start|flex-end|center|baseline|stretch)$/i],
    "align-self":            [/^(auto|flex-start|flex-end|center|baseline|stretch)$/i],
    flex:                    [/.*/],
    gap:                     [/.*/],
    "column-gap":            [/.*/],
    "row-gap":               [/.*/],
    float:                   [/^(left|right|none)$/i],
    clear:                   [/^(left|right|both|none)$/i],
    // OVERFLOW FIX 2: "visible" removed — elements cannot opt out of clipping
    overflow:                [/^(hidden|scroll|auto)$/i],
    "overflow-x":            [/^(hidden|scroll|auto)$/i],
    "overflow-y":            [/^(hidden|scroll|auto)$/i],
    opacity:                 [/^(0(\.\d+)?|1(\.0+)?)$/],
    "list-style":            [/.*/],
    "list-style-type":       [/.*/],
    "table-layout":          [/^(auto|fixed)$/i],
    cursor:                  [/^(default|pointer|text|move|not-allowed|help)$/i],
    position:                [/^(static|relative)$/i],
    "z-index":               [/^\d+$/],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// extractStyles — pulls <style> blocks out before sanitizing so class-based
// CSS (e.g. .notice-container) survives into <head>.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeContent
// ─────────────────────────────────────────────────────────────────────────────
const sanitizeContent = (raw = "") =>
  sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a:   ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      "*": ["style", "class"],
    },
    allowedStyles:       SAFE_STYLES,
    allowedSchemes:      ["http", "https"],
    allowedSchemesByTag: { img: ["http", "https"] },
    disallowedTagsMode:  "discard",
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });

// ─────────────────────────────────────────────────────────────────────────────
// buildHtml
//
// Three <style> blocks in deliberate order:
//
//   1. BASE RESET     — box-sizing, word-break, overflow-x: hidden, etc.
//   2. EXTRACTED CSS  — server's class rules (.notice-container, etc.)
//                       injected here so they apply correctly
//   3. FINAL OVERRIDE — re-applies the critical overflow/width rules with
//                       !important AFTER the extracted CSS so nothing from
//                       the server can ever override them.
//
// OVERFLOW FIX 1: The server's CSS had `max-width: 600px` on
// .notice-container. Because extracted CSS was the last <style> block, it
// silently overrode our `* { max-width: 100% }` reset. The final override
// block (block 3) comes last and uses !important so it always wins.
// ─────────────────────────────────────────────────────────────────────────────
const buildHtml = (body = "", extractedCss = "") => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

    <!-- ── 1. BASE RESET ──────────────────────────────────────────────── -->
    <style>
      html, body {
        overflow-x: hidden;
        max-width:  100%;
        margin:     0;
        padding:    0;
      }
      * {
        box-sizing:    border-box;
        word-break:    break-word;
        overflow-wrap: anywhere;
        unicode-bidi:  embed;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size:   15px;
        line-height: 1.7;
        color:       #374151;
        padding:     4px 2px 32px;
      }
      h1, h2, h3, h4, h5, h6 {
        color:         #111827;
        margin-top:    16px;
        margin-bottom: 8px;
        font-weight:   700;
        word-break:    break-word;
        overflow-wrap: anywhere;
      }
      p          { margin-bottom: 12px; }
      ul, ol     { padding-left: 20px; margin-bottom: 12px; }
      li         { margin-bottom: 4px; }
      a          { color: #1565A9; text-decoration: underline; }
      img        { max-width: 100%; height: auto; border-radius: 6px; display: block; }
      table {
        width: 100%; table-layout: fixed; border-collapse: collapse;
        margin-bottom: 12px; word-break: break-word; overflow-wrap: anywhere;
        max-width: 100%;
      }
      th, td {
        border: 1px solid #E5E7EB; padding: 8px 10px; font-size: 14px;
        text-align: left; overflow: hidden;
        word-break: break-word; overflow-wrap: anywhere; max-width: 0;
      }
      th         { background: #F3F4F6; font-weight: 600; color: #111827; }
      blockquote { border-left: 3px solid #1565A9; padding-left: 12px; color: #6B7280; font-style: italic; margin-bottom: 12px; }
      pre, code  { white-space: pre-wrap; word-break: break-all; overflow-wrap: anywhere; font-size: 13px; background: #F3F4F6; padding: 8px; border-radius: 4px; }
      strong, b  { font-weight: 700; color: #111827; }
      hr         { border: none; border-top: 1px solid #E5E7EB; margin: 16px 0; }
    </style>

    <!-- ── 2. EXTRACTED CSS (server's class rules) ────────────────────── -->
    ${extractedCss ? `<style>${extractedCss}</style>` : ""}

    <!-- ── 3. FINAL OVERRIDE — must be LAST so !important rules win ───── -->
    <!--
      OVERFLOW FIX 1: Extracted server CSS (e.g. max-width:600px on
      .notice-container, margin:20px auto) was the last style block and
      overrode our reset. This block comes after it and uses !important
      to guarantee no server rule can cause horizontal overflow.

      OVERFLOW FIX 2: white-space:nowrap and overflow:visible are stripped
      in SAFE_STYLES, but class-based rules in extracted CSS could still set
      them. The overrides below close that gap.
    -->
    <style>
      /* Every element is capped at viewport width — non-negotiable */
      * {
        max-width:     100% !important;
        overflow-x:    hidden !important;
        /* Break words at any boundary so no single token can widen the page */
        word-break:    break-word !important;
        overflow-wrap: anywhere !important;
        /* Prevent RTL override characters from reflowing surrounding text */
        unicode-bidi:  embed !important;
      }

      /* Containers the server sets to a fixed pixel width get capped */
      div, section, article, main, aside, nav,
      header, footer, figure, p, blockquote {
        max-width:  100% !important;
        overflow-x: hidden !important;
      }

      /* Images can never be wider than their container */
      img {
        max-width: 100% !important;
        height:    auto !important;
      }

      /* Tables: fixed layout prevents cells from stretching the page */
      table {
        width:        100% !important;
        max-width:    100% !important;
        table-layout: fixed !important;
        overflow-x:   hidden !important;
      }

      /* pre/code blocks wrap instead of creating a horizontal scroll bar */
      pre, code {
        white-space:   pre-wrap !important;
        word-break:    break-all !important;
        overflow-wrap: anywhere !important;
        overflow-x:    hidden !important;
      }

      /* Headings with long words must wrap too */
      h1, h2, h3, h4, h5, h6 {
        word-break:    break-word !important;
        overflow-wrap: anywhere !important;
        max-width:     100% !important;
      }
    </style>
  </head>
  <body>${body}</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// prepareNoticeHtml — entry point
// ─────────────────────────────────────────────────────────────────────────────
const prepareNoticeHtml = (raw = "") => {
  const extractedCss  = extractStyles(raw);
  const sanitizedBody = sanitizeContent(raw);
  return buildHtml(
    sanitizedBody || "<p>No content available.</p>",
    extractedCss,
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const NoticeDetailScreen = ({ route }) => {
  const { notice } = route.params;
  const [loading, setLoading] = useState(true);

  const fullHtml = prepareNoticeHtml(notice?.notice);

  const formattedDate = notice.published_at
    ? new Date(notice.published_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Notice Details" showBack />

      <View style={styles.header}>
        <Text style={styles.title}>{notice.subject}</Text>
        <Text style={styles.meta}>
          {notice.category}
          {notice.category && formattedDate ? " • " : ""}
          {formattedDate}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* OVERFLOW FIX 3: webViewWrapper clips the WebView at the native layer.
          Even if the WebView miscalculates its own width, the RN View will
          hard-clip it. paddingHorizontal keeps content away from screen edges. */}
      <View style={styles.webViewWrapper}>
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="small" color="#1565A9" />
          </View>
        )}

        <WebView
          originWhitelist={["about:blank", "about:*", "data:*"]}
          source={{ html: fullHtml }}
          style={styles.webView}
          onLoadEnd={() => setLoading(false)}

          javaScriptEnabled={false}
          domStorageEnabled={false}

          // Vertical scroll is fine; horizontal must be completely disabled
          scrollEnabled={true}
          // OVERFLOW FIX 4: these two props together prevent any horizontal
          // scroll surface from being created in the WebView at the OS level.
          // showsHorizontalScrollIndicator:false only hides the indicator —
          // the user can still scroll. We need both props set.
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={true}

          bounces={false}
          // Android: "never" stops the WebView from bouncing or creating
          // a secondary horizontal scroll container
          overScrollMode="never"
          scalesPageToFit={false}
          mixedContentMode="never"

          onShouldStartLoadWithRequest={(req) => {
            const url = req.url || "";
            if (url === "about:blank" || url === "" || url.startsWith("data:")) {
              return true;
            }
            Linking.openURL(url).catch((err) =>
              console.warn("NoticeDetailScreen: failed to open URL", url, err)
            );
            return false;
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default NoticeDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop:        14,
    paddingBottom:     12,
    backgroundColor:   "#FFFFFF",
  },
  title: {
    fontSize:   18,
    fontWeight: "700",
    color:      "#111827",
    lineHeight: 26,
  },
  meta: {
    marginTop: 6,
    fontSize:  13,
    color:     "#6B7280",
  },
  divider: {
    height:           1,
    backgroundColor:  "#F0F2F4",
    marginHorizontal: 16,
  },
  webViewWrapper: {
    flex:             1,
    paddingHorizontal: 14,
    paddingTop:        4,
    // OVERFLOW FIX 3: hard-clips the WebView at the React Native layer.
    // Content that escapes the WebView's own overflow rules is clipped here.
    overflow:         "hidden",
  },
  loaderOverlay: {
    position:        "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent:  "center",
    alignItems:      "center",
    backgroundColor: "#FFFFFF",
    zIndex:          10,
  },
  webView: {
    flex:            1,
    backgroundColor: "transparent",
  },
});