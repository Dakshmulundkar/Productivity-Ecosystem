import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Tabs, useRouter } from "expo-router";
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
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { name: "index",    label: "Home",     Icon: Home },
  { name: "tasks",    label: "Tasks",    Icon: CheckSquare },
  { name: "calendar", label: "Calendar", Icon: Calendar },
  { name: "stats",    label: "Stats",    Icon: BarChart2 },
  { name: "profile",  label: "Profile",  Icon: User },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 8) + 12;

  const handlePress = useCallback(
    (routeName: string, isFocused: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!isFocused) {
        navigation.navigate(routeName);
      }
    },
    [navigation],
  );

  return (
    <View style={[styles.tabBar, { bottom: bottomOffset }]}>
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
        const isFocused = state.index === routeIndex;
        const color = isFocused ? "#1a1a1a" : "#cccccc";

        return (
          <Pressable
            key={tab.name}
            onPress={() => handlePress(tab.name, isFocused)}
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
    // Shadow
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
