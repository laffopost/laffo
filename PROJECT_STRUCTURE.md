# 📁 Project Structure Guide

## Overview

Refactored structure for better organization, scalability, and maintainability.

```
src/
├── components/
│   ├── layout/              # App shell (Header, Footer, Sidebar)
│   ├── common/              # Reusable UI (Button, Modal, Loader, Badge)
│   └── features/            # Feature-specific components
│       ├── post/            # Posting system
│       ├── games/           # Game components
│       ├── profile/         # User profiles
│       ├── chat/            # Chat features
│       ├── weather/         # Weather widgets
│       └── trading/         # Trading components
├── pages/                   # Page components (Home, Dashboard, etc)
├── services/                # Business logic & API
│   ├── firebase/            # Firestore, Auth operations
│   └── api/                 # External API calls
├── context/                 # React Context (Auth, Posts, Notifications)
├── hooks/                   # Custom React hooks
├── utils/                   # Utility functions
├── constants/               # App constants & config
├── types/                   # TypeScript type definitions
├── styles/                  # Global styles
└── firebase/                # Firebase config
```

## Migration Checklist

### Phase 1: Move layout components

- [ ] Move `Header.jsx` → `components/layout/Header.jsx`
- [ ] Move `Footer.jsx` → `components/layout/Footer.jsx`
- [ ] Move `Sidebar.jsx` → `components/layout/Sidebar.jsx` (if exists)

### Phase 2: Move common components

- [ ] Move `Loader.jsx` → `components/common/Loader.jsx`
- [ ] Move `Notification.jsx` → `components/common/Notification.jsx`
- [ ] Move `ErrorBoundary.jsx` → `components/common/ErrorBoundary.jsx`
- [ ] Move `AnimatedDotsBackground.jsx` → `components/common/AnimatedDotsBackground.jsx`

### Phase 3: Move feature components

- [ ] Move post components → `components/features/post/`
- [ ] Move games → `components/features/games/`
- [ ] Move profile → `components/features/profile/`
- [ ] Move chat (FirebaseChat, DirectMessages) → `components/features/chat/`
- [ ] Move weather (CompactWeather, WeatherWidget) → `components/features/weather/`
- [ ] Move trading (QuickTrade, StockTracker) → `components/features/trading/`

### Phase 4: Create services layer

- [ ] Extract Firebase operations into `services/firebase/`
- [ ] Extract API calls into `services/api/`
- [ ] Create service indexes for clean imports

### Phase 5: Type definitions (Optional for JS)

- [ ] Create `types/post.d.ts` for post types
- [ ] Create `types/user.d.ts` for user types
- [ ] Create `types/game.d.ts` for game types

## Benefits

✅ **Better organization** - Related code grouped together
✅ **Easier navigation** - Clear folder hierarchy
✅ **Scalability** - Easy to add new features
✅ **Maintainability** - Decoupled from main components
✅ **Team collaboration** - Clear conventions
✅ **Reduced clutter** - 23 loose components → organized
✅ **Services layer** - Centralized business logic
✅ **Type safety** - Dedicated types folder

## Import Examples

### Before

```javascript
import PostGallery from "../../../components/post/PostGallery";
import { someService } from "../utils/someService";
```

### After

```javascript
import PostGallery from "@features/post/PostGallery";
import { postService } from "@services/firebase";
```

## Next Steps

1. Run the migration incrementally (one phase at a time)
2. Update imports in affected components
3. Test thoroughly between phases
4. Commit each phase

## Notes

- **Gradual migration** - No need to rush, do it incrementally
- **Backwards compatible** - Old structure still works during transition
- **Path aliases** - Consider adding `jsconfig.json` aliases for cleaner imports
- **CSS consolidation** - After moving files, consider consolidating styles
