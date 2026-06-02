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

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, loginWithOTP } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [useOTP, setUseOTP] = useState(false);

  const handleLogin = async () => {
    if (!email || (!useOTP && !password)) {
      setError("Please fill in all fields");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      await login(email, password);
      // Wait for onAuthStateChanged in _layout to fire and subscribe stores
      // before navigating to the dashboard. Without this delay, the dashboard
      // mounts before Firestore subscriptions are ready and crashes.
      setTimeout(() => router.replace("/(tabs)"), 800);
    } catch (err: any) {
      setError(err.message ?? "Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError("");
      await loginWithGoogle();
      setTimeout(() => router.replace("/(tabs)"), 800);
    } catch (err: any) {
      if (err.message?.includes("cancelled")) {
        // User dismissed — no error needed
        setIsLoading(false);
        return;
      }
      setError(err.message ?? "Google login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleOTPRequest = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      await loginWithOTP(email);
      router.push({ pathname: "/verify-otp", params: { email } });
    } catch (err: any) {
      setError(err.message ?? "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Email */}
        <PremiumInput
          label="Email"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
          icon={<MaterialIcons name="email" size={20} color={colors.muted} />}
        />

        {/* Password */}
        {!useOTP && (
          <PremiumInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
            icon={<MaterialIcons name="lock" size={20} color={colors.muted} />}
          />
        )}

        {/* Forgot password */}
        {!useOTP && (
          <Pressable onPress={() => router.push("/forgot-password")} hitSlop={8} style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>
        )}

        {/* Primary button */}
        <View style={styles.buttonWrapper}>
          <PremiumButton
            label={isLoading ? "Please wait..." : useOTP ? "Send OTP" : "Sign In"}
            variant="primary"
            size="lg"
            onPress={useOTP ? handleOTPRequest : handleLogin}
            disabled={isLoading}
          />
        </View>

        {/* Toggle OTP */}
        <Pressable onPress={() => setUseOTP(!useOTP)} hitSlop={8} style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {useOTP ? "Use password instead" : "Use OTP instead"}
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google */}
        <PremiumButton
          label="Continue with Google"
          variant="secondary"
          size="lg"
          onPress={handleGoogleLogin}
          disabled={isLoading}
          icon={<MaterialIcons name="login" size={20} color={colors.foreground} />}
        />

        {/* Sign up link */}
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push("/signup")} hitSlop={8}>
            <Text style={styles.linkAction}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f2f0ec" },
  content: { paddingHorizontal: 24, gap: 16 },
  header: { gap: 6, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: "700", color: "#1a1a1a" },
  subtitle: { fontSize: 15, color: "#888" },
  errorBox: { backgroundColor: "#fee2e2", borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: "#991b1b", fontWeight: "500" },
  forgotRow: { alignSelf: "flex-end" },
  forgotText: { fontSize: 13, color: "#888", fontWeight: "600" },
  buttonWrapper: { marginTop: 4 },
  toggleRow: { alignItems: "center" },
  toggleText: { fontSize: 13, color: "#888" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0dbd4" },
  dividerText: { fontSize: 12, color: "#aaa" },
  linkRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  linkText: { fontSize: 13, color: "#888" },
  linkAction: { fontSize: 13, color: "#1a1a1a", fontWeight: "600" },
});
