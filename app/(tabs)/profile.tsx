import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  Switch,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import {
  Sun,
  Bell,
  Globe,
  User,
  Lock,
  Link,
  Download,
  Cloud,
  Star,
  HelpCircle,
  Shield,
  ChevronRight,
  LogOut,
  X,
  Check,
} from "lucide-react-native";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { FontFamily } from "@/lib/_core/theme";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/dashboard-utils";
import { useTaskStore } from "@/store/useTaskStore";
import { useProfileStore } from "@/store/useProfileStore";

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

interface EditProfileModalProps {
  visible: boolean;
  currentName: string;
  currentEmail: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

const EditProfileModal = memo(function EditProfileModal({
  visible,
  currentName,
  currentEmail,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset state when modal opens
  const handleOpen = useCallback(() => {
    setName(currentName);
    setError("");
  }, [currentName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    try {
      setIsSaving(true);
      setError("");
      await onSave(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = getInitials(name.trim() || currentName);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <KeyboardAvoidingView
        style={modalStyles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={modalStyles.overlay} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />

          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Edit Profile</Text>
            <Pressable onPress={onClose} hitSlop={12} style={modalStyles.closeBtn}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          {/* Avatar preview */}
          <View style={modalStyles.avatarPreview}>
            <View style={modalStyles.avatar}>
              <Text style={modalStyles.avatarText}>{initials}</Text>
            </View>
            <Text style={modalStyles.avatarHint}>Avatar updates automatically</Text>
          </View>

          {/* Name field */}
          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={[modalStyles.input, error ? modalStyles.inputError : null]}
              value={name}
              onChangeText={(t) => { setName(t); setError(""); }}
              placeholder="Your full name"
              placeholderTextColor="#999"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSaving}
              maxLength={50}
            />
            {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}
          </View>

          {/* Email — read-only */}
          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>EMAIL</Text>
            <View style={modalStyles.readOnlyField}>
              <Text style={modalStyles.readOnlyText}>{currentEmail || "—"}</Text>
              <Text style={modalStyles.readOnlyHint}>Managed by your sign-in method</Text>
            </View>
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[modalStyles.saveBtn, isSaving && modalStyles.saveBtnDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <>
                <Check size={16} color="#1a1a1a" strokeWidth={2.5} />
                <Text style={modalStyles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ─── Settings sub-components ──────────────────────────────────────────────────

interface SettingsRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value?: string;
  isLast?: boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingsRow = memo(function SettingsRow({
  icon, iconBg, label, value, isLast, onPress, rightElement,
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingsRow, !isLast ? styles.settingsRowBorder : null]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={styles.settingsLabel}>{label}</Text>
      {rightElement ?? (
        <View style={styles.settingsRight}>
          {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
          <ChevronRight size={16} color="#ccc" />
        </View>
      )}
    </Pressable>
  );
});

const SettingsSection = memo(function SettingsSection({
  title, children,
}: {
  title: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrapper}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 64 + 12 + 24;
  const router = useRouter();

  const { user, logout } = useAuth();
  const setStoreName = useProfileStore((s) => s.setName);

  const tasks = useTaskStore((s) => s.tasks);
  const totalDone = tasks.filter((t) => t.done).length;
  const activeTasks = tasks.filter((t) => !t.done).length;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Prefer Firebase Auth displayName (always up-to-date after save)
  const displayName  = user?.name  ?? "Your Name";
  const displayEmail = user?.email ?? "";
  const initials = getInitials(displayName);

  // ── Save profile — updates Firebase Auth displayName + Firestore ──
  const handleSaveProfile = useCallback(async (newName: string) => {
    // 1. Update Firebase Auth displayName
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: newName });
    }
    // 2. Persist to Firestore via profile store
    await setStoreName(newName);
  }, [setStoreName]);

  const handleOpenEditProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEditProfile(true);
  }, []);

  const handleComingSoon = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Coming soon", "This feature is not yet available.");
  }, []);

  const handleToggleNotifications = useCallback(async (val: boolean) => {
    Haptics.selectionAsync();
    if (val) {
      // Request permission when enabling
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please enable notifications in your device settings to receive reminders.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }
    setNotificationsEnabled(val);
  }, []);

  const handleRateApp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Replace with your actual App Store / Play Store URL
    const url = Platform.OS === "ios"
      ? "https://apps.apple.com/app/id000000000" // replace with real App Store ID
      : "https://play.google.com/store/apps/details?id=com.dakshmulundkarsprojects.vero";
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else Alert.alert("Coming soon", "The app is not yet published on the store.");
    });
  }, []);

  const handleHelpSupport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const email = "support@vero.app";
    const subject = encodeURIComponent("Vero App Support");
    const body = encodeURIComponent(`Hi Vero team,\n\nI need help with:\n\n`);
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert("Email not available", `Please contact us at ${email}`);
    });
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/privacy-policy");
  }, [router]);

  const handleExportData = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Coming soon", "Data export will be available in a future update.");
  }, []);

  const handleLogout = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Log out",
      "You'll need internet to log back in. Your tasks and data stay on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login" as any);
          },
        },
      ],
    );
  }, [logout, router]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f0ec" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card — no Edit button, name fills the space */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text
              style={styles.headerName}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {displayEmail ? (
              <Text style={styles.headerEmail} numberOfLines={1}>{displayEmail}</Text>
            ) : (
              <Text style={styles.headerEmailMuted}>Signed in</Text>
            )}
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{totalDone}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{activeTasks}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </Animated.View>

        {/* Preferences */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <SettingsSection title="PREFERENCES">
            <SettingsRow
              icon={<Sun size={16} color="#92400e" />}
              iconBg="#fef3c7"
              label="Theme"
              value="Light"
              onPress={handleComingSoon}
            />
            <SettingsRow
              icon={<Bell size={16} color="#1e40af" />}
              iconBg="#dbeafe"
              label="Notifications"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: "#e0e0e0", true: "#b8a9f0" }}
                  thumbColor="#fff"
                />
              }
            />
            <SettingsRow
              icon={<Globe size={16} color="#166534" />}
              iconBg="#dcfce7"
              label="Language"
              value="English"
              isLast
              onPress={handleComingSoon}
            />
          </SettingsSection>
        </Animated.View>

        {/* Account */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <SettingsSection title="ACCOUNT">
            <SettingsRow
              icon={<User size={16} color="#5b21b6" />}
              iconBg="#ede9fe"
              label="Edit Profile"
              onPress={handleOpenEditProfile}
            />
            <SettingsRow
              icon={<Lock size={16} color="#991b1b" />}
              iconBg="#fee2e2"
              label="Password & Security"
              onPress={handleComingSoon}
            />
            <SettingsRow
              icon={<Link size={16} color="#9d174d" />}
              iconBg="#fce7f3"
              label="Connected Accounts"
              isLast
              onPress={handleComingSoon}
            />
          </SettingsSection>
        </Animated.View>

        {/* Data */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <SettingsSection title="DATA">
            <SettingsRow
              icon={<Download size={16} color="#92400e" />}
              iconBg="#fef3c7"
              label="Export Data"
              onPress={handleExportData}
            />
            <SettingsRow
              icon={<Cloud size={16} color="#1e40af" />}
              iconBg="#dbeafe"
              label="Backup & Sync"
              value="Firebase"
              isLast
              onPress={handleComingSoon}
            />
          </SettingsSection>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <SettingsSection title="ABOUT">
            <SettingsRow
              icon={<Star size={16} color="#92400e" />}
              iconBg="#fef3c7"
              label="Rate the App"
              onPress={handleRateApp}
            />
            <SettingsRow
              icon={<HelpCircle size={16} color="#166534" />}
              iconBg="#dcfce7"
              label="Help & Support"
              onPress={handleHelpSupport}
            />
            <SettingsRow
              icon={<Shield size={16} color="#5b21b6" />}
              iconBg="#ede9fe"
              label="Privacy Policy"
              isLast
              onPress={handlePrivacyPolicy}
            />
          </SettingsSection>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)}>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={16} color="#991b1b" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditProfile}
        currentName={displayName}
        currentEmail={displayEmail}
        onClose={() => setShowEditProfile(false)}
        onSave={handleSaveProfile}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f0ec" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },

  // Header card — no edit pill, info fills full width
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#b8a9f0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontFamily: FontFamily.poppins.bold, fontSize: 20, color: "#fff" },
  headerInfo: { flex: 1 },
  headerName: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 22,
    color: "#1a1a1a",
    lineHeight: 26,
  },
  headerEmail: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#888", marginTop: 3 },
  headerEmailMuted: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#b8a9f0", marginTop: 3 },

  statsCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center" },
  statCol: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontFamily: FontFamily.poppins.extraBold, fontSize: 22, color: "#1a1a1a", lineHeight: 26 },
  statLabel: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "#888" },
  statDivider: { width: 1, height: 36, backgroundColor: "#f0eeea" },

  sectionWrapper: { gap: 6 },
  sectionTitle: { fontFamily: FontFamily.inter.bold, fontSize: 11, color: "#aaa", letterSpacing: 0.6, textTransform: "uppercase", paddingHorizontal: 4 },
  sectionCard: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16 },

  settingsRow: { height: 52, flexDirection: "row", alignItems: "center", gap: 12 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0eeea" },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  settingsLabel: { fontFamily: FontFamily.inter.regular, fontSize: 14, color: "#1a1a1a", flex: 1 },
  settingsRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  settingsValue: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#888" },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fee2e2", borderRadius: 14, padding: 14, marginTop: 4 },
  logoutText: { fontFamily: FontFamily.inter.semiBold, fontSize: 14, color: "#991b1b" },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#e0dbd4",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 20,
    color: "#1a1a1a",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0eeea",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarPreview: {
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#b8a9f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 24,
    color: "#fff",
  },
  avatarHint: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: "#aaa",
  },

  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 11,
    color: "#aaa",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f7f5f2",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FontFamily.inter.regular,
    fontSize: 16,
    color: "#1a1a1a",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: "#ef4444",
  },

  readOnlyField: {
    backgroundColor: "#f7f5f2",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  readOnlyText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 15,
    color: "#555",
  },
  readOnlyHint: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: "#bbb",
  },

  saveBtn: {
    backgroundColor: "#b8a9f0",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 15,
    color: "#1a1a1a",
  },
});
