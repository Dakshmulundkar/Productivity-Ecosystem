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
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
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
} from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/dashboard-utils";
import { useTaskStore } from "@/store/useTaskStore";

// ─── Sub-components ───────────────────────────────────────────────────────────

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

  // Auth — used for name display and logout
  const { user, logout } = useAuth();

  // Task stats from store
  const tasks = useTaskStore((s) => s.tasks);
  const totalDone = tasks.filter((t) => t.done).length;
  const activeTasks = tasks.filter((t) => !t.done).length;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const displayName  = user?.name  ?? "Your Name";
  const displayEmail = user?.email ?? "";
  const initials = getInitials(displayName);

  const handleComingSoon = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Coming soon", "This feature is not yet available.");
  }, []);

  const handleToggleNotifications = useCallback((val: boolean) => {
    Haptics.selectionAsync();
    setNotificationsEnabled(val);
  }, []);

  // Logout: clears auth session, navigates back to login
  // All app data (tasks, focus time) stays on device — it's stored locally
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
        {/* Header card */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{displayName}</Text>
            {displayEmail ? (
              <Text style={styles.headerEmail}>{displayEmail}</Text>
            ) : (
              <Text style={styles.headerEmailMuted}>Data stored on device</Text>
            )}
          </View>
          <Pressable onPress={handleComingSoon} style={styles.editPill}>
            <Text style={styles.editPillText}>Edit</Text>
          </Pressable>
        </Animated.View>

        {/* Stats row — live from task store */}
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
              onPress={handleComingSoon}
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
              onPress={handleComingSoon}
            />
            <SettingsRow
              icon={<Cloud size={16} color="#1e40af" />}
              iconBg="#dbeafe"
              label="Backup & Sync"
              value="Local"
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
              onPress={handleComingSoon}
            />
            <SettingsRow
              icon={<HelpCircle size={16} color="#166534" />}
              iconBg="#dcfce7"
              label="Help & Support"
              onPress={handleComingSoon}
            />
            <SettingsRow
              icon={<Shield size={16} color="#5b21b6" />}
              iconBg="#ede9fe"
              label="Privacy Policy"
              isLast
              onPress={handleComingSoon}
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f0ec" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },

  headerCard: { backgroundColor: "#fff", borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#b8a9f0", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontFamily: FontFamily.poppins.bold, fontSize: 20, color: "#fff" },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: FontFamily.poppins.bold, fontSize: 20, color: "#1a1a1a", lineHeight: 24 },
  headerEmail: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#888", marginTop: 2 },
  headerEmailMuted: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#b8a9f0", marginTop: 2 },
  editPill: { backgroundColor: "#eceae5", borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14, alignSelf: "flex-start" },
  editPillText: { fontFamily: FontFamily.inter.semiBold, fontSize: 12, color: "#1a1a1a" },

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
