const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// ── APK size optimizations ────────────────────────────────────────────────────
// Enable minification for release builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: { toplevel: true },
    output: { ascii_only: true, quote_style: 3, wrap_iife: true },
    sourceMap: { includeSources: false },
    toplevel: false,
    compress: {
      reduce_funcs: false,
    },
  },
};

// Exclude unused asset extensions to reduce bundle scanning
config.resolver = {
  ...config.resolver,
  assetExts: (config.resolver.assetExts ?? []).filter(
    (ext) => !["psd", "ai", "sketch", "fig"].includes(ext)
  ),
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
