import React, { useState, useCallback, memo, useEffect } from "react";
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
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Sun,
  Bell,
  User,
  ChevronRight,
  LogOut,
  X,
  Camera,
} from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/dashboard-utils";
import { useTaskStore } from "@/store/useTaskStore";

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

interface EditProfileModalProps {
  visible: boolean;
  currentName: string;
  currentEmail: string;
  currentAvatar: string | undefined;
  onClose: () => void;
  onSave: (name: string, avatar: string | undefined) => Promise<void>;
}

const EditProfileModal = memo(function EditProfileModal({
  visible,
  currentName,
  currentEmail,
  currentAvatar: initialAvatar,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setAvatar(initialAvatar);
      setError("");
    }
  }, [visible, currentName, initialAvatar]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    try {
      setIsSaving(true);
      await onSave(trimmed, avatar);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = getInitials(name || currentName);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={modalStyles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={modalStyles.overlay} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Edit Profile</Text>
            <Pressable onPress={onClose} hitSlop={12} style={modalStyles.closeBtn}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          <View style={modalStyles.avatarPreview}>
            <Pressable 
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert("Permission required", "Gallery access is needed to change photos.");
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  allowsEditing: true, aspect: [1, 1], quality: 0.6,
                });
                if (!result.canceled) {
                  setAvatar(result.assets[0].uri);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={modalStyles.avatarWrapper}
            >
              <View style={modalStyles.avatar}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={modalStyles.avatarImg} />
                ) : (
                  <Text style={modalStyles.avatarText}>{initials}</Text>
                )}
                <View style={modalStyles.editPill}>
                  <Camera size={12} color="#fff" strokeWidth={2.5} />
                </View>
              </View>
            </Pressable>
            <Text style={modalStyles.avatarHint}>Tap to change photo</Text>
          </View>

          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={[modalStyles.input, error ? modalStyles.inputError : null]}
              value={name}
              onChangeText={(t) => { setName(t); setError(""); }}
              autoCapitalize="words"
              editable={!isSaving}
            />
            {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}
          </View>

          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>EMAIL</Text>
            <View style={modalStyles.readOnlyField}>
              <Text style={modalStyles.readOnlyText}>{currentEmail || "—"}</Text>
            </View>
          </View>

          <Pressable onPress={handleSave} disabled={isSaving} style={[modalStyles.saveBtn, isSaving && modalStyles.saveBtnDisabled]}>
            {isSaving ? <ActivityIndicator color="#1a1a1a" /> : <Text style={modalStyles.saveBtnText}>Save Changes</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ─── Settings Row ─────────────────────────────────────────────────────────────

const SettingsRow = memo(function SettingsRow({ icon, iconBg, label, value, isLast, onPress, rightElement }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.settingsRow, !isLast && styles.settingsRowBorder]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={styles.settingsLabel}>{label}</Text>
      {rightElement || (
        <View style={styles.settingsRight}>
          {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
          <ChevronRight size={16} color="#ccc" />
        </View>
      )}
    </Pressable>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUserName, updateUserAvatar } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const tasks = useTaskStore((s) => s.tasks);

  const displayName = user?.name || "Your Name";
  const displayEmail = user?.email || "";
  const displayAvatar = user?.avatar;
  const initials = getInitials(displayName);

  const handleSaveProfile = useCallback(async (newName: string, newAvatar: string | undefined) => {
    if (newName !== user?.name) await updateUserName(newName);
    if (newAvatar !== user?.avatar && newAvatar) await updateUserAvatar(newAvatar);
  }, [user, updateUserName, updateUserAvatar]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}>
        <Animated.View entering={FadeInDown} style={styles.headerCard}>
          <View style={styles.avatar}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{displayName}</Text>
            <Text style={styles.headerEmail}>{displayEmail}</Text>
          </View>
        </Animated.View>

        <View style={styles.statsCard}>
          <View style={styles.statCol}><Text style={styles.statValue}>{tasks.filter(t=>t.done).length}</Text><Text style={styles.statLabel}>Done</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}><Text style={styles.statValue}>{tasks.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        </View>

        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <View style={styles.sectionCard}>
            <SettingsRow icon={<Sun size={16} color="#92400e" />} iconBg="#fef3c7" label="Theme" value="Light" />
            <SettingsRow 
              icon={<Bell size={16} color="#1e40af" />} 
              iconBg="#dbeafe" 
              label="Notifications" 
              isLast 
              rightElement={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ true: "#b8a9f0" }} />} 
            />
          </View>
        </View>

        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <SettingsRow 
              icon={<User size={16} color="#5b21b6" />} 
              iconBg="#ede9fe" 
              label="Edit Profile" 
              isLast 
              onPress={() => setShowEditProfile(true)} 
            />
          </View>
        </View>

        <Pressable onPress={async () => { await logout(); router.replace("/login"); }} style={styles.logoutBtn}>
          <LogOut size={16} color="#991b1b" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

      <EditProfileModal
        visible={showEditProfile}
        currentName={displayName}
        currentEmail={displayEmail}
        currentAvatar={displayAvatar}
        onClose={() => setShowEditProfile(false)}
        onSave={handleSaveProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f0ec" },
  headerCard: { backgroundColor: "#fff", borderRadius: 22, padding: 20, marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#b8a9f0", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontFamily: FontFamily.poppins.bold, fontSize: 20, color: "#fff" },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: FontFamily.poppins.bold, fontSize: 20, color: "#1a1a1a" },
  headerEmail: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#888" },
  statsCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, margin: 16, flexDirection: "row" },
  statCol: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: FontFamily.poppins.extraBold, fontSize: 22, color: "#1a1a1a" },
  statLabel: { fontFamily: FontFamily.inter.regular, fontSize: 11, color: "#888" },
  statDivider: { width: 1, height: 36, backgroundColor: "#f0eeea" },
  sectionWrapper: { marginHorizontal: 16, marginTop: 20, gap: 8 },
  sectionTitle: { fontFamily: FontFamily.inter.bold, fontSize: 11, color: "#aaa", letterSpacing: 0.6 },
  sectionCard: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16 },
  settingsRow: { height: 52, flexDirection: "row", alignItems: "center", gap: 12 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0eeea" },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsLabel: { fontFamily: FontFamily.inter.regular, fontSize: 14, flex: 1 },
  settingsRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  settingsValue: { fontFamily: FontFamily.inter.regular, fontSize: 13, color: "#888" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fee2e2", borderRadius: 14, margin: 16, padding: 14 },
  logoutText: { fontFamily: FontFamily.inter.semiBold, fontSize: 14, color: "#991b1b" },
});

const modalStyles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 20 },
  handle: { width: 40, height: 4, backgroundColor: "#eee", borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: FontFamily.poppins.bold, fontSize: 20 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f2f0ec", alignItems: "center", justifyContent: "center" },
  avatarPreview: { alignItems: "center", gap: 10 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#b8a9f0", alignItems: "center", justifyContent: "center", overflow: 'hidden' },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontFamily: FontFamily.poppins.bold, fontSize: 28, color: "#fff" },
  editPill: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#1a1a1a", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  avatarHint: { fontFamily: FontFamily.inter.regular, fontSize: 12, color: "#aaa" },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: FontFamily.inter.bold, fontSize: 11, color: "#aaa", letterSpacing: 0.6 },
  input: { backgroundColor: "#f7f5f2", borderRadius: 12, padding: 14, fontSize: 16, fontFamily: FontFamily.inter.regular },
  inputError: { borderColor: "red", borderWidth: 1 },
  readOnlyField: { backgroundColor: "#f7f5f2", borderRadius: 12, padding: 14 },
  readOnlyText: { color: "#888" },
  errorText: { color: "red", fontSize: 12 },
  saveBtn: { backgroundColor: "#b8a9f0", borderRadius: 14, padding: 16, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: FontFamily.poppins.bold, fontSize: 16 },
});
