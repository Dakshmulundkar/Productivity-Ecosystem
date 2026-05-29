# Productivity Ecosystem

> A premium all-in-one productivity app built with React Native & Expo — designed to help you focus, track tasks, build habits, and own your day.

---

## What is this?

Productivity Ecosystem is a mobile-first personal productivity app that brings together everything you need to stay on top of your work and life — in one clean, fast, and beautiful interface. No subscriptions, no bloat, no distractions.

Whether you're a student juggling deadlines, a developer managing sprints, or someone who just wants to build better habits — this app gives you the tools to do it.

---

## How it makes your life easier

- **Stop context-switching.** Tasks, calendar, habits, and focus timer all live in one place. No more jumping between five different apps.
- **See your day at a glance.** The home dashboard shows your productivity score, today's tasks, habit streaks, and focus time — all updated in real time.
- **Stay in flow.** The built-in Pomodoro focus timer keeps you locked in, tracks your daily focus minutes, and lets you pause/resume without losing progress.
- **Never miss a deadline.** The calendar supports day, week, and month views. Tap any date to add an event instantly.
- **Build habits that stick.** Visual habit tracking with streaks and a heatmap shows your consistency over time — the kind of feedback that actually motivates.
- **Know your priorities.** Every task has a priority level (Low / Medium / High) and a due date. Filter by Today, Tomorrow, or All so you always know what matters right now.

---

## Features

### 🏠 Home Dashboard
- Live productivity score with trend indicator
- Today / Tomorrow / All task filter
- Real-time focus time tracker
- Habit streaks and activity heatmap
- Pastel stat cards (focus time, tasks done, streak, habit rate)

### ✅ Task Manager
- Create tasks with title, description, priority, and due date
- Date strip to browse tasks by day
- Custom date picker (calendar UI) for future tasks
- Toggle done / pending, delete tasks
- Persistent storage via Zustand + AsyncStorage

### 📅 Calendar
- Day, Week, and Month views
- Add events with title, time, location, and category (Work / Personal / Health / Social / Focus)
- Tap any day in week or month view to add an event for that date
- Color-coded event cards per category

### 📊 Stats
- Weekly productivity chart
- Focus time, tasks completed, habit rate breakdown
- Animated bar charts

### 👤 Profile
- User info display
- Stats summary (tasks, streak, focus hours)
- Settings and logout

### 🔐 Auth
- Email + password login
- OTP (magic link) login
- Google Sign-In (Firebase ready)
- Forgot password flow

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router 6 (file-based) |
| Styling | NativeWind 4 (Tailwind CSS) |
| Animations | React Native Reanimated 4 |
| State | Zustand + AsyncStorage |
| Backend | Express + tRPC |
| Database | MySQL + Drizzle ORM |
| Language | TypeScript 5.9 |

---

## Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+ — `npm install -g pnpm`
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- [Android Studio](https://developer.android.com/studio) (for Android builds) or [Xcode](https://developer.apple.com/xcode/) (for iOS)
- [EAS CLI](https://docs.expo.dev/build/setup/) — `npm install -g eas-cli`

---

### 1. Clone the repository

```bash
git clone https://github.com/dakshmulundkars-projects/productivity-ecosystem.git
cd productivity-ecosystem
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Minimum required variables:

```env
DATABASE_URL=mysql://user:password@host:4000/dbname
JWT_SECRET=your_jwt_secret_here
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

For Firebase Google Sign-In (optional for now):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=yourapp.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=yourapp
EXPO_PUBLIC_FIREBASE_APP_ID=1:xxx:web:xxx
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
```

### 4. Set up the database

```bash
pnpm db:push
```

### 5. Run in development

Start both the API server and the Expo dev server:

```bash
pnpm dev
```

Or run them separately:

```bash
# API server only
pnpm dev:server

# Expo Metro bundler only
pnpm dev:metro
```

Scan the QR code with the **Expo Go** app on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## Building the APK (Android)

### Option A — EAS Build (recommended, cloud build)

```bash
# Login to your Expo account
eas login

# Configure the project (first time only)
eas build:configure

# Build a release APK
eas build --platform android --profile production
```

Your APK will be available to download from the EAS dashboard once the build completes.

### Option B — Local build

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK
cd android && ./gradlew assembleRelease
```

The release APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

> **Note:** For a release build you'll need a keystore. See [Expo signing docs](https://docs.expo.dev/app-signing/local-credentials/).

---

## Project Structure

```
app/
  _layout.tsx          ← Root layout with providers
  (tabs)/
    index.tsx          ← Home dashboard
    tasks.tsx          ← Task manager
    calendar.tsx       ← Calendar
    stats.tsx          ← Stats & analytics
    profile.tsx        ← User profile
  login.tsx            ← Login screen
  signup.tsx           ← Sign up screen
  onboarding.tsx       ← Onboarding flow
  splash.tsx           ← Splash screen
components/
  dashboard/           ← Dashboard-specific cards
  ui/                  ← Reusable UI primitives
  premium-button.tsx   ← Button component
  premium-input.tsx    ← Input component
store/
  useTaskStore.ts      ← Task state (Zustand)
  useFocusStore.ts     ← Focus timer state
  useProfileStore.ts   ← Profile state
server/
  routers.ts           ← tRPC API routes
  db.ts                ← Database queries
  storage.ts           ← File storage helpers
  _core/               ← Server infrastructure
drizzle/
  schema.ts            ← Database schema
constants/
  theme.ts             ← Theme tokens
theme.config.js        ← Color palette config
```

---

## License

MIT License

Copyright (c) 2025 Daksh Mulundkar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

Built with ❤️ by [Daksh Mulundkar](https://github.com/dakshmulundkars-projects)
