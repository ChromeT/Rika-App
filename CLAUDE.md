# Rika App - Project Documentation

## Overview
Aplikasi pengelola keuangan pasangan (couple finance tracker) berbasis React Native dengan Expo.

## Tech Stack
- **Framework**: Expo ~54.0.33
- **Runtime**: React Native 0.81.5, React 19.1.0
- **Navigation**: @react-navigation/native v7, bottom-tabs v7
- **Backend**: Firebase (Firestore, Storage)
- **State Management**: React Context (ThemeContext, AuthContext, DataContext)
- **UI**: expo-blur, expo-av, expo-image, react-native-chart-kit
- **Storage**: @react-native-async-storage/async-storage

## Project Structure
```
rika-app/
├── src/
│   ├── context/      # ThemeContext, AuthContext, DataContext
│   ├── screens/      # Dashboard, Goals, Settings, dll
│   ├── navigation/   # AppNavigator (Tab + Stack)
│   ├── config/       # firebase.js, cloudinary.js
│   └── utils/        # Upload helpers, image compress
├── assets/
│   ├── icons/        # Tab bar icons (PNG)
│   └── *.png         # App icons, splash
└── App.js            # Root component
```

## Fixed Bugs (2026-05-05)
- [x] **DataContext.js**: Added missing `deleteDoc` import from firebase/firestore
- [x] **ThemeContext.js**: Added `themeLoaded` gate to prevent render before theme loads
- [x] **ThemeContext.js**: Fixed accent color logic for light/dark mode with proper opacity
- [x] **ThemeContext.js**: Fixed hex color codes (6-digit validation)
- [x] **ThemeContext.js**: Fixed missing comma in Provider value prop
- [x] **AppNavigator.js**: Added `borderRadius` and `overflow: 'hidden'` to BlurView tab bar
- [x] **SettingsScreen.js**: Updated color palette to darker pastel colors
- [x] **ThemeContext.js**: Updated light theme with warmer, eye-friendly colors

## Known Issues
- [ ] Expo Go Android: Tab bar icons sometimes don't load (use vector icons as fallback?)
- [ ] Reports section (PDF/XLS buttons) not implemented yet
- [ ] Font selection UI exists but not functional (Coming Soon)
- [ ] Image/Video upload to Firebase Storage not fully tested
- [ ] Notification system needs testing

## Features Status
### Auth
- [x] Create household (room)
- [x] Join household with code
- [x] Re-login existing user
- [x] Avatar selection (icon or custom image)
- [x] Last read notification tracking

### Goals
- [x] Create goal with media (image/video)
- [x] Edit goal
- [x] Delete goal
- [x] Achieve goal with memory
- [x] Active/achieved tabs
- [ ] Progress auto-calculation from transactions (manual update only)

### Transactions
- [x] Add transaction
- [x] Transaction history
- [ ] Categories management UI
- [ ] Export to PDF/XLS

### Settings
- [x] Dark/light mode toggle
- [x] Accent color picker (6 darker pastel colors)
- [x] Avatar change
- [x] Logout
- [ ] Font selection (UI only)

## Firebase Collections
- `households/{code}` - users[], avatars{}, lastReadNotif{}
- `households/{code}/transactions` - date, type, myContrib, partnerContrib, owner
- `households/{code}/goals` - name, targetAmount, currentAmount, media[], status
- `households/{code}/bills` - (planned)
- `households/{code}/notifications` - createdAt, message

## Development
```bash
cd C:\Users\ChromeT\.gemini\antigravity\scratch\rika-app
npx expo start          # Start development server
npx expo start --web    # Open in browser
npx expo start --clear  # Clear cache
```

## Notes
- App uses "Kita" (we) terminology for couple finance
- Transaction owners: "Kita", user.name, or partnerName
- Firebase config is hardcoded (consider using environment variables for production)
