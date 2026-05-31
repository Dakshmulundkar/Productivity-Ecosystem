# Vero — Personal Productivity App

> A premium all-in-one productivity app built with React Native & Expo. Tasks, habits, calendar, focus timer, and analytics — all in one clean, fast interface.

---

## What is Vero?

Vero is a mobile-first personal productivity app that brings together everything you need to stay on top of your work and life. No subscriptions, no bloat, no distractions. Your data lives in Firebase and syncs across devices automatically.

---

## Features

### 🏠 Home Dashboard
- Live productivity score (composite of tasks, focus time, and habit rate)
- Today / Tomorrow / All task filter with real-time updates
- Stat cards — focus time, tasks done, streak, habit rate
- Floating focus bar that hides on scroll and reappears after 5 seconds of idle
- Greeting adapts to time of day (Good morning / afternoon / evening / night)
- Name auto-shrinks to fit without truncation

### ✅ Task Manager
- Create tasks with title, description, priority (Low / Medium / High), and due date
- Horizontal date strip to browse tasks by day
- Inline calendar picker for custom dates
- Toggle done / pending, swipe to delete
- Synced to Firebase Firestore in real time

### 📅 Calendar
- Day, Week, and Month views
- Add events with title, time (scroll-wheel picker), location, category, and alarm
- Events sorted chronologically by time (earliest first, All Day at top)
- 30-minute reminder notification + on-time alarm notification per event
- Pick a custom alarm sound from your device (Android)
- Color-coded event cards per category (Work / Personal / Health / Social / Focus)

### 📊 Stats & Analytics
- Weekly task completion bar chart (animated)
- Productivity score with Today / Weekly / Monthly filter
- Focus time, tasks done, streak, and habit rate breakdown
- Full habit heatmap (8-week overview per habit)

### 🔁 Habits
- Create habits with custom icon, color, and category
- Today view — toggle completion with streak counter
- Weekly view — Mon–Sun grid per habit
- Overall view — 8-week heatmap per habit
- Synced to Firebase Firestore

### 👤 Profile
- Edit display name (saves to Firebase Auth + Firestore)
- Task stats (done / active / total)
- Notifications toggle (requests OS permission)
- Rate the App, Help & Support (opens email), Privacy Policy
- Secure logout

### 🔐 Authentication
- Email + password login and signup
- Forgot password (Firebase email reset)
- Magic link / OTP login (Firebase email link)
- Google Sign-In (requires native build — not available in Expo Go)
- All auth handled by Firebase Authentication

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router 6 (file-based) |
| Styling | NativeWind 4 + StyleSheet |
| Animations | React Native Reanimated 4 |
| State | Zustand + AsyncStorage (offline-first) |
| Backend | Firebase (Auth + Firestore) |
| Notifications | expo-notifications |
| Audio | expo-av + expo-document-picker |
| Language | TypeScript 5.9 |
| Build | EAS Build |

---

## Project Structure

```
app/
  _layout.tsx              Root layout — fonts, providers, Firestore subscriptions
  splash.tsx               Splash screen with auth redirect
  onboarding.tsx           Feature walkthrough (4 screens)
  login.tsx                Email/password + Google + OTP login
  signup.tsx               Email/password + Google signup
  forgot-password.tsx      Firebase password reset
  verify-otp.tsx           Magic link instructions screen
  privacy-policy.tsx       In-app privacy policy
  oauth/callback.tsx       Firebase email link deep-link handler
  (tabs)/
    _layout.tsx            Custom floating tab bar
    index.tsx              Home dashboard
    tasks.tsx              Task manager
    calendar.tsx           Calendar (day / week / month)
    stats.tsx              Stats & analytics
    profile.tsx            User profile & settings

components/
  dashboard/               Home dashboard cards (focus CTA, stat card, tasks card, ring)
  habits/                  Habit components (row, heatmap, day squares, new sheet, etc.)
  ui/                      Reusable primitives (filter pills, section header, tag badge, progress bar)
  premium-button.tsx       Haptic-enabled button
  premium-input.tsx        Themed text input
  screen-container.tsx     Safe-area wrapper

store/
  useTaskStore.ts          Tasks — Zustand + Firestore sync
  useHabitStore.ts         Habits + logs — Zustand + Firestore sync
  useFocusStore.ts         Pomodoro timer — wall-clock based, survives background
  useProfileStore.ts       User profile — Zustand + Firestore sync
  useCalendarStore.ts      Calendar events — Zustand + AsyncStorage + notifications

lib/
  auth-context.tsx         Firebase Auth context (login, signup, Google, OTP, reset)
  firebase.ts              Firebase app initialization
  dashboard-utils.ts       Greeting, name split, initials helpers
  theme-provider.tsx       Light/dark theme provider
  utils.ts                 cn() utility (clsx + tailwind-merge)
  _core/
    theme.ts               Font family constants + color tokens
    app-runtime.ts         Web iframe communication (preview environments)
    auth.ts                Firebase token helpers

constants/
  theme.ts                 Color palette (light/dark)
  oauth.ts                 App scheme + session key constants

shared/
  habitTypes.ts            Habit, HabitLog, NewHabitInput types
  types.ts                 AppUser type
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+ — `npm install -g pnpm`
- A [Firebase](https://firebase.google.com/) project with **Authentication** and **Firestore** enabled

### 1. Clone

```bash
git clone https://github.com/Dakshmulundkar/Productivity-Ecosystem.git
cd Productivity-Ecosystem
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your Firebase credentials (from Firebase Console → Project Settings):

```env
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=yourapp.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=yourapp
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=yourapp.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Google Sign-In (from Firebase Console → Authentication → Sign-in method → Google)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com

# App identity
EXPO_PUBLIC_APP_BUNDLE_ID=com.yourcompany.yourapp
```

### 4. Firebase setup

In the Firebase Console:

1. **Authentication** → Enable Email/Password, Google, and Email Link sign-in methods
2. **Firestore** → Create a database in production mode, then add security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Run in development

```bash
pnpm dev
```

> **Note:** Google Sign-In requires a native build and will not work in Expo Go. All other features work in Expo Go.

---

## Building the APK

### EAS Build (recommended)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Your APK download link appears in the terminal when the build completes.

### Local build

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Important Notes

### Google Sign-In
Google Sign-In uses `@react-native-google-signin/google-signin` which is a native module. It requires a custom dev build (EAS Build or `expo prebuild`). It will crash in Expo Go — this is handled gracefully with a fallback error message.

### Notifications & Alarms
Calendar event notifications use `expo-notifications`. On iOS, custom alarm sounds must be bundled with the app — runtime-picked audio files work on Android only. The 30-minute reminder and on-time alarm are scheduled automatically when you add an event.

### Offline Support
Tasks, habits, and calendar events are stored locally via Zustand + AsyncStorage and sync to Firestore when online. The app is fully functional offline.

### Focus Timer
The Pomodoro timer uses wall-clock timestamps (`Date.now()`) instead of tick counting, so it keeps running accurately even when the app is backgrounded or the device sleeps.

---

## License

MIT License — Copyright (c) 2025 Daksh Mulundkar

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

Built with ❤️ by [Daksh Mulundkar](https://github.com/Dakshmulundkar)
