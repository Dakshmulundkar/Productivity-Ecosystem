# Vero — Personal Productivity App

Vero is a mobile productivity app for tracking tasks, habits, focus sessions, and calendar events. Everything syncs to the cloud so your data is always available across devices and survives reinstalls.

---

## Features

**Tasks**
- Add tasks with Today, Everyday (recurring), or a custom date
- Everyday tasks appear on every day until marked complete
- Infinite scrollable date strip — scroll left to see past tasks, right for future
- Priority levels: Low, Medium, High
- Offline-first: all changes save locally and sync when back online

**Habits**
- Track daily habits with streaks, success rates, and heatmaps
- Multi-completion support (e.g. drink water 8×/day) with a segmented ring
- Long-press to delete
- Weekly and overall analytics views

**Focus Timer**
- Pomodoro (25 min), Short Break (5 min), Long Break (15 min)
- Background-safe timer using wall-clock timestamps
- Daily focus time tracked and synced to cloud
- Push notification when session ends

**Calendar**
- Day, Week, and Month views
- Event alarms: 30-min reminder + on-time notification
- Custom alarm sound picker
- All events synced to cloud

**Stats**
- Weekly bar chart comparing this week vs last week (ghost bars)
- Mini stat cards: focus time, tasks done, streak, habit rate
- Habit heatmaps for the past 8 weeks
- Today / Weekly / Monthly filter

**Auth**
- Email + password
- Google Sign-In
- Magic link (OTP via email)
- Password reset

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Dakshmulundkar/Productivity-Ecosystem.git
cd Productivity-Ecosystem
pnpm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_APP_BUNDLE_ID=
```

### 3. Run locally

```bash
pnpm dev
```

---

## Building APK

Preview build (APK for direct install):

```bash
eas build --platform android --profile preview
```

Production build (AAB for Play Store):

```bash
eas build --platform android --profile production
```

Make sure your EAS secrets match the variables in `.env`.

---

## Project Structure

```
app/              # Expo Router screens
  (tabs)/         # Bottom tab screens: Home, Tasks, Calendar, Stats, Profile
  login.tsx       # Auth screens
  signup.tsx
  ...
components/
  habits/         # Habit-related components
  dashboard/      # Home screen cards
  ui/             # Shared UI primitives
store/            # Zustand stores with Firestore sync
lib/              # Firebase, auth context, utilities
shared/           # Zod schemas and shared types
constants/        # Theme, constants
```

---

## Contact

For questions or support: bydaksh2806@gmail.com
