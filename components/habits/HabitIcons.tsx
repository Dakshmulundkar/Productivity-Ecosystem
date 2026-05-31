import React from "react";
import {
  Droplets,
  Dumbbell,
  BookOpen,
  Moon,
  Heart,
  Zap,
  Briefcase,
  Brain,
  Apple,
  Coffee,
  Bike,
  Music,
  Sun,
  Star,
  Flame,
  Leaf,
  Camera,
  ShoppingBag,
  Wallet,
  Phone,
  Target,
  Clock,
  Pencil,
  Activity,
  Pill,
  Footprints,
  GraduationCap,
  PersonStanding,
  Trophy,
  Smile,
  Utensils,
  Wind,
  Headphones,
  Laptop,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

export const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  Droplets,
  BookOpen,
  Dumbbell,
  Footprints,
  Moon,
  Briefcase,
  Brain,
  Heart,
  Apple,
  Coffee,
  Bike,
  Music,
  Sun,
  Star,
  Pill,
  Clock,
  Target,
  Flame,
  Leaf,
  Camera,
  ShoppingBag,
  Wallet,
  Phone,
  GraduationCap,
  PersonStanding,
  Pencil,
  Zap,
  Trophy,
  Smile,
  Utensils,
  Wind,
  Headphones,
  Laptop,
};

export const HABIT_ICON_KEYS = Object.keys(HABIT_ICON_MAP);

interface HabitIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function HabitIcon({ name, size = 20, color = "#1a1a1a", strokeWidth = 2 }: HabitIconProps) {
  const Icon = HABIT_ICON_MAP[name] ?? Activity;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
