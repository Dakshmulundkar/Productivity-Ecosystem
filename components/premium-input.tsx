import { TextInput, TextInputProps, View, Text } from "react-native";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export interface PremiumInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  variant?: "default" | "filled";
  size?: "sm" | "md" | "lg";
  containerClassName?: string;
}

/**
 * Premium Input Component
 * Supports labels, error states, and multiple variants
 */
export function PremiumInput({
  label,
  error,
  icon,
  variant = "default",
  size = "md",
  containerClassName,
  onFocus,
  onBlur,
  ...props
}: PremiumInputProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-4 py-4 text-lg",
  };

  const variantClasses = {
    default: `border border-border rounded-lg ${
      isFocused ? "border-primary" : "border-border"
    }`,
    filled: `bg-surface rounded-lg border border-transparent ${
      isFocused ? "border-primary" : "border-transparent"
    }`,
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View className={cn("gap-2", containerClassName)}>
      {label && (
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
      )}
      
      <View
        className={cn(
          "flex-row items-center gap-2",
          sizeClasses[size],
          variantClasses[variant],
          error && "border-error"
        )}
      >
        {icon}
        <TextInput
          className={cn(
            "flex-1",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-lg"
          )}
          style={{ color: colors.foreground, flex: 1 }}
          placeholderTextColor={colors.muted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </View>

      {error && (
        <Text className="text-xs font-medium text-error">{error}</Text>
      )}
    </View>
  );
}
