import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PremiumButton } from "@/components/premium-button";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { loginWithOTP } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    if (!email) return;
    try {
      setIsResending(true);
      setError("");
      setResendSuccess(false);
      await loginWithOTP(email);
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to resend. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>

        {/* Icon */}
        <View style={styles.iconWrapper}>
          <MaterialIcons name="mark-email-unread" size={40} color="#6366f1" />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a sign-in link to{"\n"}
            <Text style={styles.emailHighlight}>{email || "your email"}</Text>
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {resendSuccess ? (
          <View style={styles.successBox}>
            <MaterialIcons name="check-circle" size={16} color="#166534" />
            <Text style={styles.successText}>New link sent! Check your inbox.</Text>
          </View>
        ) : null}

        {/* Instructions */}
        <View style={styles.stepsCard}>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>Open the email from Vero</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>Tap the "Sign in to Vero" link</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>You'll be signed in automatically</Text>
          </View>
        </View>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't get the email? </Text>
          <Pressable onPress={handleResend} disabled={isResending} hitSlop={8}>
            <Text style={[styles.resendAction, isResending && styles.resendDisabled]}>
              {isResending ? "Sending..." : "Resend link"}
            </Text>
          </Pressable>
        </View>

        {/* Back to login */}
        <View style={styles.buttonWrapper}>
          <PremiumButton
            label="Back to Login"
            variant="secondary"
            size="lg"
            onPress={() => router.replace("/login")}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f2f0ec" },
  content: { paddingHorizontal: 24, gap: 20 },
  backBtn: { marginBottom: 4 },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  header: { gap: 8, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#888", lineHeight: 22, textAlign: "center" },
  emailHighlight: { fontWeight: "600", color: "#1a1a1a" },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  errorText: { fontSize: 13, color: "#991b1b", fontWeight: "500", flex: 1 },
  successBox: {
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  successText: { fontSize: 13, color: "#166534", fontWeight: "500" },
  stepsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "#e0dbd4",
  },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontSize: 13, fontWeight: "700", color: "#6366f1" },
  stepText: { fontSize: 14, color: "#444", flex: 1 },
  resendRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  resendLabel: { fontSize: 13, color: "#888" },
  resendAction: { fontSize: 13, color: "#1a1a1a", fontWeight: "600" },
  resendDisabled: { color: "#aaa" },
  buttonWrapper: { marginTop: 4 },
});
