import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
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
import { useHabitStore } from "@/store/useHabitStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useCalendarStore } from "@/store/useCalendarStore";

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

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 8) + 12;

  return (
    <View style={[styles.tabBar, { bottom: bottomOffset }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const tab = TABS.find(t => t.name === route.name) || TABS[index] || TABS[0];
        const isFocused = state.index === index;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const activeColor = "#000000";
        const inactiveColor = "#b0b0b0";
        const color = isFocused ? activeColor : inactiveColor;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            hitSlop={8}
          >
            <View style={styles.iconContainer}>
              <tab.Icon 
                size={22} 
                color={color} 
                strokeWidth={isFocused ? 2.4 : 1.8} 
              />
              {isFocused && <View style={styles.activeIndicator} />}
            </View>
            <Text style={[
              styles.tabLabel, 
              { color, fontFamily: isFocused ? FontFamily.inter.bold : FontFamily.inter.medium }
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

import { useAuth } from "@/lib/auth-context";

export default function TabLayout() {
  const { user, isSignedIn, isLoading } = useAuth();
  const router = useRouter();

  const subHabits = useHabitStore((s) => s.subscribeToFirestore);
  const unsubHabits = useHabitStore((s) => s.unsubscribeFromFirestore);
  const subTasks = useTaskStore((s) => s.subscribeToFirestore);
  const unsubTasks = useTaskStore((s) => s.unsubscribeFromFirestore);
  const subCal = useCalendarStore((s) => s.subscribeToFirestore);

  // ── Route protection ──
  React.useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.replace("/login");
    }
  }, [isLoading, isSignedIn, router]);

  // ── Data Synchronization — Senior Dev Implementation ──
  // We subscribe centrally in the Layout so all tabs have fresh data immediately.
  React.useEffect(() => {
    if (isSignedIn && user?.id) {
      subHabits(user.id);
      subTasks(user.id);
      subCal(user.id);
      return () => {
        unsubHabits();
        unsubTasks();
      };
    }
  }, [isSignedIn, user?.id, subHabits, unsubHabits, subTasks, unsubTasks, subCal]);

  if (isLoading) return null; // or a loading spinner

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
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#000000",
  },
  tabLabel: {
    fontFamily: FontFamily.inter.medium,
    fontSize: 9,
  },
});
