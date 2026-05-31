/**
 * OAuth callback screen.
 *
 * With Firebase Auth, Google Sign-In is handled natively via the SDK —
 * no manual code exchange needed. This screen handles the case where
 * Firebase redirects back to the app after a web-based OAuth flow
 * (e.g. email magic link sign-in).
 */
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const OTP_EMAIL_KEY = "vero_otp_email";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ link?: string }>();
  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");

  useEffect(() => {
    const handle = async () => {
      try {
        // Check if this is a Firebase email sign-in link
        const link = params.link ?? (typeof window !== "undefined" ? window.location.href : "");
        if (link && isSignInWithEmailLink(auth, link)) {
          const email = await AsyncStorage.getItem(OTP_EMAIL_KEY);
          if (email) {
            await signInWithEmailLink(auth, email, link);
            await AsyncStorage.removeItem(OTP_EMAIL_KEY);
          }
        }
        setStatus("done");
        setTimeout(() => router.replace("/(tabs)"), 500);
      } catch (err) {
        console.error("[OAuthCallback] Error:", err);
        setStatus("error");
        setTimeout(() => router.replace("/login"), 1500);
      }
    };
    handle();
  }, []);

  return (
    <View style={styles.container}>
      {status === "processing" && (
        <>
          <ActivityIndicator size="large" color="#b8a9f0" />
          <Text style={styles.text}>Signing you in...</Text>
        </>
      )}
      {status === "error" && (
        <Text style={styles.errorText}>Sign-in failed. Redirecting...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f0ec", alignItems: "center", justifyContent: "center", gap: 16 },
  text:      { fontSize: 14, color: "#888" },
  errorText: { fontSize: 14, color: "#ef4444" },
});
