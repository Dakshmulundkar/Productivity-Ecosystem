import { Pressable, PressableProps, Text, View } from "react-native";
import { cn } from "@/lib/utils";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export interface PremiumButtonProps extends PressableProps {
  label: string;
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  disabled?: boolean;
  haptic?: boolean;
  className?: string;
  labelClassName?: string;
}

/**
 * Premium Button Component
 * Supports multiple variants with haptic feedback and smooth interactions
 */
export function PremiumButton({
  label,
  variant = "primary",
  size = "md",
  icon,
  disabled = false,
  haptic = true,
  className,
  labelClassName,
  onPress,
  ...props
}: PremiumButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-2 rounded-lg",
    md: "px-4 py-3 rounded-lg",
    lg: "px-6 py-4 rounded-xl",
  };

  const textSizeClasses = {
    sm: "text-sm font-semibold",
    md: "text-base font-semibold",
    lg: "text-lg font-bold",
  };

  const variantClasses = {
    primary: "bg-primary",
    secondary: "bg-surface border border-border",
    tertiary: "bg-transparent",
    danger: "bg-error",
  };

  const textColorClasses = {
    primary: "text-background",
    secondary: "text-foreground",
    tertiary: "text-primary",
    danger: "text-background",
  };

  const handlePress = async (e: any) => {
    if (disabled) return;
    
    if (haptic && Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err) {
        // Haptics not available on all platforms
      }
    }
    
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      {...props}
    >
      <View
        className={cn(
          "flex-row items-center justify-center gap-2",
          sizeClasses[size],
          variantClasses[variant],
          disabled && "opacity-50",
          className
        )}
      >
        {icon}
        <Text
          className={cn(
            textSizeClasses[size],
            textColorClasses[variant],
            labelClassName
          )}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
