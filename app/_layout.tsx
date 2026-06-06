import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { AppState, Platform } from "react-native";
import { useFocusStore } from "@/store/useFocusStore";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";
import { initAppRuntime, subscribeToSafeAreaInsets } from "@/lib/_core/app-runtime";
import { requestNotificationPermissions } from "@/lib/notifications";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTaskStore } from "@/store/useTaskStore";
import { useHabitStore } from "@/store/useHabitStore";
import { useProfileStore } from "@/store/useProfileStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// Font loading
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from "@expo-google-fonts/poppins";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame  = initialWindowMetrics?.frame  ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame,  setFrame]  = useState<Rect>(initialFrame);

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    initAppRuntime();
    // Pre-emptively request notification permissions
    requestNotificationPermissions().catch(() => {});
  }, []);

  // Wire Firestore subscriptions when auth state changes
  // IMPORTANT: We delay the subscriptions slightly to let the Firebase auth
  // token propagate to Firestore. Without this, the initial onSnapshot query
  // can throw a permission-denied error and crash the app.
  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Clear any pending subscription timer from a previous auth event
      if (delayTimer) { clearTimeout(delayTimer); delayTimer = null; }

      if (user) {
        // Small delay to let the auth token propagate to Firestore
        delayTimer = setTimeout(() => {
          try {
            useTaskStore.getState().subscribeToFirestore(user.uid);
          } catch (e) {
            console.warn("[Layout] Task subscription failed:", e);
          }
          try {
            useHabitStore.getState().subscribeToFirestore(user.uid);
          } catch (e) {
            console.warn("[Layout] Habit subscription failed:", e);
          }
          try {
            useProfileStore.getState().syncFromFirestore();
          } catch (e) {
            console.warn("[Layout] Profile sync failed:", e);
          }
        }, 500);
      } else {
        // Clear everything on logout to prevent crashes and stale data
        try { useTaskStore.getState().unsubscribeFromFirestore(); } catch (_) {}
        try { useHabitStore.getState().unsubscribeFromFirestore(); } catch (_) {}
        try { useProfileStore.getState().clearStore(); } catch (_) {}
      }
    });

    return () => {
      unsubAuth();
      if (delayTimer) clearTimeout(delayTimer);
      try { useTaskStore.getState().unsubscribeFromFirestore(); } catch (_) {}
      try { useHabitStore.getState().unsubscribeFromFirestore(); } catch (_) {}
      try { useProfileStore.getState().unsubscribeFromFirestore(); } catch (_) {}
    };
  }, []);

  // ── Global Focus Timer Sync ──
  useEffect(() => {
    const sync = useFocusStore.getState().syncTimer;
    
    // Initial sync
    sync();

    let intervalId: any = null;
    if (useFocusStore.getState().isRunning) {
      intervalId = setInterval(() => useFocusStore.getState().syncTimer(), 1000);
    }

    // Subscribe to store changes to start/stop the interval
    const unsubStore = useFocusStore.subscribe(
      (state) => {
        const isRunning = state.isRunning;
        if (isRunning && !intervalId) {
          intervalId = setInterval(() => useFocusStore.getState().syncTimer(), 1000);
        } else if (!isRunning && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    );

    // AppState listener for foreground sync
    const unsubAppState = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        useFocusStore.getState().syncTimer();
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      unsubStore();
      unsubAppState.remove();
    };
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeToSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top:    Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  if (!fontsLoaded && !fontError) return null;

  const content = (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="splash"           options={{ animation: "none" }} />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
            <Stack.Screen name="privacy-policy" />
          </Stack>
        </ErrorBoundary>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </AuthProvider>
  );

  if (Platform.OS === "web") {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
