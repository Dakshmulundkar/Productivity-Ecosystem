// Load environment variables
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID — read from env, never hardcoded
// On EAS Build, we fall back to a placeholder if the secret isn't set yet during the initial 'read config' phase
const rawBundleId = process.env.EXPO_PUBLIC_APP_BUNDLE_ID || "com.placeholder.app";

const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".");

// Deep link scheme derived from bundle ID last segment
const schemeSegment = bundleId.split(".").pop() ?? "app";
const schemeFromBundleId = `daksh${schemeSegment}`;

const isProduction = process.env.NODE_ENV === "production" || process.env.EAS_BUILD_PROFILE === "production" || process.env.EAS_BUILD_PROFILE === "preview";

if (isProduction && (!process.env.EXPO_PUBLIC_APP_BUNDLE_ID || process.env.EXPO_PUBLIC_APP_BUNDLE_ID === "com.placeholder.app")) {
  console.error("❌ ERROR: EXPO_PUBLIC_APP_BUNDLE_ID is not set in EAS Secrets or .env file.");
  console.error("Production builds require a valid unique bundle identifier.");
}

const env = {
  appName: "Vero",
  appSlug: "vero",
  logoUrl: "",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-av",
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#b8a9f0",
        sounds: [],
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        // iosUrlScheme must be "com.googleusercontent.apps.<reversed-client-id>"
        // The iOS client ID format is: <project-number>-<hash>.apps.googleusercontent.com
        // The reversed scheme strips the ".apps.googleusercontent.com" suffix
        iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
          ? `com.googleusercontent.apps.${
              process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
                .replace(".apps.googleusercontent.com", "")
            }`
          : "",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["arm64-v8a"],
          minSdkVersion: 24,
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          useLegacyPackaging: false,
          enableMinifyInReleaseBuilds: true,
          extractNativeLibs: false,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "9b1b1ca9-70c9-4fb3-9b9e-5b3e3c42a8e2",
    },
  },
};

export default config;
