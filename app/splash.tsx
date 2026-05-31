import { View, Text, Image } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function SplashScreen() {
  const router = useRouter();
  const { isSignedIn, isLoading } = useAuth();

  useEffect(() => {
    // Wait until auth state is resolved, then navigate after a short delay
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (isSignedIn) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoading, isSignedIn]);

  return (
    <ScreenContainer className="items-center justify-center">
      <View className="items-center gap-4">
        <Image
          source={require("@/assets/images/icon.png")}
          className="w-24 h-24 rounded-2xl"
        />
        <Text className="text-3xl font-bold text-foreground">Vero</Text>
        <Text className="text-sm text-muted">Your personal productivity hub</Text>
      </View>
    </ScreenContainer>
  );
}
