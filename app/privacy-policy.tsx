import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";

const LAST_UPDATED = "May 31, 2026";
const APP_NAME = "Vero";
const CONTACT_EMAIL = "privacy@vero.app";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f0ec" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Introduction">
          {`Welcome to ${APP_NAME}. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your data when you use our mobile application.\n\nBy using ${APP_NAME}, you agree to the collection and use of information in accordance with this policy.`}
        </Section>

        <Section title="2. Information We Collect">
          {`We collect the following types of information:\n\n• Account Information: When you register, we collect your name and email address.\n\n• Usage Data: We collect data about how you interact with the app, including tasks you create, habits you track, and focus sessions you complete.\n\n• Device Information: We may collect information about your device type, operating system version, and unique device identifiers for crash reporting and performance monitoring.\n\n• Authentication Data: If you sign in with Google, we receive your name, email address, and profile picture from Google. We do not receive or store your Google password.`}
        </Section>

        <Section title="3. How We Use Your Information">
          {`We use the information we collect to:\n\n• Provide, operate, and maintain the ${APP_NAME} service\n• Sync your tasks, habits, and calendar events across your devices via Firebase\n• Personalize your experience (e.g., displaying your name in greetings)\n• Send you password reset emails when requested\n• Improve the app based on usage patterns\n• Respond to your support requests`}
        </Section>

        <Section title="4. Data Storage and Security">
          {`Your data is stored securely using Google Firebase (Firestore and Firebase Authentication). Firebase is a Google-operated platform that complies with industry-standard security practices including:\n\n• Data encryption in transit (TLS/SSL)\n• Data encryption at rest\n• Access controls and authentication\n\nWhile we implement strong security measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security but strive to protect your data using commercially acceptable means.`}
        </Section>

        <Section title="5. Data Sharing">
          {`We do not sell, trade, or rent your personal information to third parties. We may share data only in the following limited circumstances:\n\n• Service Providers: We use Google Firebase as our backend infrastructure. Google's privacy policy governs their handling of data.\n\n• Legal Requirements: We may disclose your information if required by law or in response to valid legal requests.\n\n• Business Transfers: If ${APP_NAME} is acquired or merged, your data may be transferred as part of that transaction.`}
        </Section>

        <Section title="6. Data Retention">
          {`We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us at ${CONTACT_EMAIL}.\n\nLocal data stored on your device (tasks, habits, focus sessions) remains on your device until you uninstall the app or clear app data.`}
        </Section>

        <Section title="7. Your Rights">
          {`Depending on your location, you may have the following rights regarding your personal data:\n\n• Access: Request a copy of the data we hold about you\n• Correction: Request correction of inaccurate data\n• Deletion: Request deletion of your personal data\n• Portability: Request your data in a portable format\n• Objection: Object to certain types of data processing\n\nTo exercise any of these rights, contact us at ${CONTACT_EMAIL}.`}
        </Section>

        <Section title="8. Children's Privacy">
          {`${APP_NAME} is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately and we will take steps to delete it.`}
        </Section>

        <Section title="9. Third-Party Services">
          {`${APP_NAME} uses the following third-party services, each governed by their own privacy policies:\n\n• Google Firebase (Authentication, Firestore): firebase.google.com/support/privacy\n• Google Sign-In: policies.google.com/privacy\n• Expo (app framework): expo.dev/privacy`}
        </Section>

        <Section title="10. Changes to This Policy">
          {`We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last updated" date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.`}
        </Section>

        <Section title="11. Contact Us">
          {`If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:\n\nEmail: ${CONTACT_EMAIL}\n\nWe will respond to your inquiry within 30 days.`}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f0ec" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#f2f0ec",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontFamily: FontFamily.poppins.bold,
    fontSize: 17,
    color: "#1a1a1a",
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24, paddingTop: 8 },
  updated: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 4,
  },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: FontFamily.inter.bold,
    fontSize: 15,
    color: "#1a1a1a",
  },
  sectionBody: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: "#444",
    lineHeight: 22,
  },
});
