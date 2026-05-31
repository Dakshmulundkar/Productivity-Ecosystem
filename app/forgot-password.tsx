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
import { PremiumInput } from "@/components/premium-input";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSendReset = async () => {
    if (!email) { setError("Please enter your email"); return; }
    if (!email.includes("@")) { setError("Please enter a valid email"); return; }
    try {
      setIsLoading(true);
      setError("");
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.flex, styles.successCenter]}>
        <View style={styles.successIcon}>
          <MaterialIcons name="check" size={32} color="#166534" />
        </View>
        <Text style={styles.successTitle}>Check Your Email</Text>
        <Text style={styles.successSub}>
          We've sent password reset instructions to {email}
        </Text>
        <View style={styles.buttonWrapper}>
          <PremiumButton
            label="Back to Login"
            variant="primary"
            size="lg"
            onPress={() => router.push("/login")}
          />
        </View>
      </View>
    );
  }

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
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset link
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <PremiumInput
          label="Email Address"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
          icon={<MaterialIcons name="email" size={20} color={colors.muted} />}
        />

        <View style={styles.buttonWrapper}>
          <PremiumButton
            label="Send Reset Link"
            variant="primary"
            size="lg"
            onPress={handleSendReset}
            disabled={isLoading}
          />
        </View>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Remember your password? </Text>
          <Pressable onPress={() => router.push("/login")} hitSlop={8}>
            <Text style={styles.linkAction}>Sign In</Text>
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
  buttonWrapper: { marginTop: 4 },
  linkRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  linkText: { fontSize: 13, color: "#888" },
  linkAction: { fontSize: 13, color: "#1a1a1a", fontWeight: "600" },
  successCenter: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
  successSub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20 },
});
