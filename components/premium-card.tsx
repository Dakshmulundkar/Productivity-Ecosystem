import { View, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

export interface PremiumCardProps extends ViewProps {
  className?: string;
  variant?: "default" | "glass" | "neumorphic";
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Premium Card Component
 * Supports Bento-box layouts with glassmorphism and neumorphism variants
 */
export function PremiumCard({
  children,
  className,
  variant = "default",
  size = "md",
  ...props
}: PremiumCardProps) {
  const sizeClasses = {
    sm: "p-3 rounded-md",
    md: "p-4 rounded-lg",
    lg: "p-6 rounded-xl",
    xl: "p-8 rounded-2xl",
  };

  const variantClasses = {
    default: "bg-surface border border-border shadow-md",
    glass: "bg-surface/80 backdrop-blur-md border border-border/30 shadow-lg",
    neumorphic: "bg-surface shadow-lg shadow-black/10 border border-border/20",
  };

  return (
    <View
      className={cn(
        "flex-1",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}
