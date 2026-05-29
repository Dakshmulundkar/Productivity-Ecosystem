import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PremiumButton } from "@/components/premium-button";
import { useRouter } from "expo-router";
import { useState } from "react";

const ONBOARDING_SCREENS = [
  {
    title: "Organize Your Life",
    description: "Create tasks, set goals, and track your progress all in one place",
    icon: "📋",
  },
  {
    title: "Build Better Habits",
    description: "Track daily habits and build streaks to stay motivated",
    icon: "✨",
  },
  {
    title: "Stay Focused",
    description: "Use Pomodoro timer and focus mode to maximize productivity",
    icon: "🎯",
  },
  {
    title: "Collaborate with Others",
    description: "Share tasks and work together with your team in real-time",
    icon: "👥",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SCREENS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace("/login");
    }
  };

  const handleSkip = () => {
    router.replace("/login");
  };

  const screen = ONBOARDING_SCREENS[currentIndex];

  return (
    <ScreenContainer className="justify-between">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="items-center gap-8 px-6 py-12">
          {/* Icon */}
          <Text className="text-8xl">{screen.icon}</Text>

          {/* Title */}
          <Text className="text-4xl font-bold text-foreground text-center">
            {screen.title}
          </Text>

          {/* Description */}
          <Text className="text-lg text-muted text-center leading-relaxed">
            {screen.description}
          </Text>

          {/* Progress Dots */}
          <View className="flex-row gap-2">
            {ONBOARDING_SCREENS.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full ${
                  index === currentIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-border"
                }`}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View className="gap-3 px-6 pb-8">
        <PremiumButton
          label={currentIndex === ONBOARDING_SCREENS.length - 1 ? "Get Started" : "Next"}
          variant="primary"
          size="lg"
          onPress={handleNext}
        />
        <PremiumButton
          label="Skip"
          variant="secondary"
          size="lg"
          onPress={handleSkip}
        />
      </View>
    </ScreenContainer>
  );
}
