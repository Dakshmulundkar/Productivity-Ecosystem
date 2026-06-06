# React Native / Hermes base
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo modules core — keep ALL internal interfaces and type providers
# These are referenced reflectively by expo-av and other modules
-keep class expo.modules.** { *; }
-keep interface expo.modules.** { *; }
-keep class expo.modules.core.** { *; }
-keep class expo.modules.kotlin.** { *; }
-keep class expo.modules.kotlin.types.** { *; }
-keep class expo.modules.core.interfaces.** { *; }
-keep class expo.modules.core.interfaces.services.** { *; }

# expo-av specific
-keep class expo.modules.av.** { *; }

# Third-party native modules
-keep class com.reactnativegooglesignin.** { *; }
-keep class com.swmansion.** { *; }
-keep class com.th3rdwave.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native module registration annotations
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Enums
-keepclassmembers enum * { *; }

# Parcelable
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Remove verbose Android logs in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
}
