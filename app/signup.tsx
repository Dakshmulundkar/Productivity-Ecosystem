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

export default function SignupScreen() {
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validateForm = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    try {
      setIsLoading(true);
      setError("");
      await signup(email, password, name);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message ?? "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      setError("");
      await loginWithGoogle();
      router.replace("/(tabs)");
    } catch (err: any) {
      if (err.message?.includes("cancelled")) {
        // User dismissed — no error needed
        return;
      }
      setError(err.message ?? "Google sign-up failed. Please try again.");
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
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us to get started</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Fields */}
        <PremiumInput
          label="Full Name"
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
          editable={!isLoading}
          icon={<MaterialIcons name="person" size={20} color={colors.muted} />}
        />
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
        <PremiumInput
          label="Password"
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
          icon={<MaterialIcons name="lock" size={20} color={colors.muted} />}
        />
        <PremiumInput
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!isLoading}
          icon={<MaterialIcons name="lock" size={20} color={colors.muted} />}
        />

        {/* Sign Up Button */}
        <View style={styles.buttonWrapper}>
          <PremiumButton
            label={isLoading ? "Creating Account..." : "Create Account"}
            variant="primary"
            size="lg"
            onPress={handleSignup}
            disabled={isLoading}
          />
        </View>

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
          onPress={handleGoogleSignup}
          disabled={isLoading}
          icon={<MaterialIcons name="login" size={20} color={colors.foreground} />}
        />

        {/* Login link */}
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account? </Text>
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
  header: { gap: 6, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: "700", color: "#1a1a1a" },
  subtitle: { fontSize: 15, color: "#888" },
  errorBox: { backgroundColor: "#fee2e2", borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: "#991b1b", fontWeight: "500" },
  buttonWrapper: { marginTop: 8 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0dbd4" },
  dividerText: { fontSize: 12, color: "#aaa" },
  linkRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  linkText: { fontSize: 13, color: "#888" },
  linkAction: { fontSize: 13, color: "#1a1a1a", fontWeight: "600" },
});
