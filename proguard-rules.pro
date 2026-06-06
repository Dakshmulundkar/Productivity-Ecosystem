# Expo AV and Kotlin missing classes fixes
-keep class expo.modules.core.interfaces.services.KeepAwakeManager { *; }
-keep class expo.modules.kotlin.types.AnyTypeProvider { *; }
-keep class expo.modules.kotlin.types.LazyKType { *; }

# General Expo module protection
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# Firebase/Google Sign-in fixes
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Support for React Native
-keep class com.facebook.react.common.build.ReactBuildConfig { *; }
