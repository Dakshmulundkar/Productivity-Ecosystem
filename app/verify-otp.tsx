import {
  View,
  Text,
  ScrollView,
  TextInput,
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
  const { verifyOTP } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      await verifyOTP(email || "", otp);
      router.replace("/(tabs)");
    } catch {
      setError("Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
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

        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to {email || "your email"}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.otpWrapper}>
          <Text style={styles.otpLabel}>Enter Code</Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            editable={!isLoading}
            style={[styles.otpInput, { color: colors.foreground }]}
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.buttonWrapper}>
          <PremiumButton
            label="Verify OTP"
            variant="primary"
            size="lg"
            onPress={handleVerify}
            disabled={isLoading}
          />
        </View>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Didn't receive code? </Text>
          <Pressable disabled={isLoading} hitSlop={8}>
            <Text style={styles.linkAction}>Resend</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f2f0ec" },
  content: { paddingHorizontal: 24, gap: 16 },
  backBtn: { marginBottom: 8 },
  header: { gap: 6, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a1a" },
  subtitle: { fontSize: 14, color: "#888", lineHeight: 20 },
  errorBox: { backgroundColor: "#fee2e2", borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: "#991b1b", fontWeight: "500" },
  otpWrapper: { gap: 8 },
  otpLabel: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  otpInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0dbd4",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 8,
  },
  buttonWrapper: { marginTop: 4 },
  linkRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  linkText: { fontSize: 13, color: "#888" },
  linkAction: { fontSize: 13, color: "#1a1a1a", fontWeight: "600" },
});
