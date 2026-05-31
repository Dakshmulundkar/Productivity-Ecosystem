import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Tabs, useRouter, usePathname } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Home,
  CheckSquare,
  Calendar,
  BarChart2,
  User,
  LucideIcon,
} from "lucide-react-native";
import { FontFamily } from "@/lib/_core/theme";

interface TabDef {
  name: string;
  label: string;
  href: string;
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { name: "index",    label: "Home",     href: "/(tabs)",          Icon: Home },
  { name: "tasks",    label: "Tasks",    href: "/(tabs)/tasks",    Icon: CheckSquare },
  { name: "calendar", label: "Calendar", href: "/(tabs)/calendar", Icon: Calendar },
  { name: "stats",    label: "Stats",    href: "/(tabs)/stats",    Icon: BarChart2 },
  { name: "profile",  label: "Profile",  href: "/(tabs)/profile",  Icon: User },
];

function CustomTabBar({ state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const bottomOffset = Math.max(insets.bottom, 8) + 12;

  const handlePress = useCallback(
    (tab: TabDef) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(tab.href as any);
    },
    [router],
  );

  return (
    <View style={[styles.tabBar, { bottom: bottomOffset }]}>
      {TABS.map((tab) => {
        // Determine active state from pathname
        const isFocused =
          tab.name === "index"
            ? pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/index"
            : pathname.includes(`/(tabs)/${tab.name}`);
        const color = isFocused ? "#1a1a1a" : "#cccccc";

        return (
          <Pressable
            key={tab.name}
            onPress={() => handlePress(tab)}
            style={styles.tabItem}
            hitSlop={4}
          >
            <tab.Icon size={22} color={color} strokeWidth={isFocused ? 2.2 : 1.8} />
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
            {isFocused && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 64,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 8,
  },
  tabLabel: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 9,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#1a1a1a",
  },
});
