# Expo / React Native base rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native modules — JSI and TurboModules
-keep class expo.modules.** { *; }
-keep class com.reactnativegooglesignin.** { *; }
-keep class com.swmansion.** { *; }
-keep class com.th3rdwave.** { *; }

# Keep all classes referenced by JS
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Prevent stripping enums
-keepclassmembers enum * { *; }

# Keep Parcelable classes
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Remove debug logs in release to save space
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
