# react-native-offline-first-architecture

A production-ready starter project for building **offline-first React Native apps** with **Expo** and **WatermelonDB**.

## ✨ What's Included

- **WatermelonDB** — local SQLite database with reactive queries
- **Native two-phase sync** — pull/push using WatermelonDB's `synchronize()` protocol
- **In-app API server** — Expo Router API routes (`+api.ts`) with in-memory data store
- **Offline image upload queue** — pick images offline, auto-upload when online
- **Network-aware sync** — auto-syncs on reconnect, overlap guards
- **Auth scaffold** — JWT + Expo SecureStore (no-op for demo, ready for production)
- **Reactive UI** — `withObservables` for automatic re-renders on data changes

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Mobile Client            │  In-App API Server             │
│  WatermelonDB (SQLite)    │  app/api/todos+api.ts          │
│  query().observe()        │  app/api/sync/pull+api.ts      │
│  withObservables()        │  app/api/sync/push+api.ts      │
│  ─── HTTP sync ──────────►│  app/api/uploads+api.ts        │
└────────────────────────────────────────────────────────────┘
```

## 📂 Module Structure

```
src/
├── db/
│   ├── database.ts         # Database singleton (SQLiteAdapter + JSI)
│   ├── schema.ts           # appSchema: todos, users
│   ├── migrations.ts       # Schema version migrations
│   └── models/
│       ├── Todo.ts          # @field, @date decorators
│       └── index.ts
├── sync/
│   ├── SyncService.ts      # WatermelonDB synchronize() with pull/push
│   └── SyncOrchestrator.ts # Network-aware, non-overlapping sync trigger
├── network/
│   └── NetworkManager.ts   # NetInfo wrapper
├── auth/
│   └── AuthManager.ts      # JWT + SecureStore scaffold
├── image/
│   ├── ImageUploadService.ts # Offline upload queue processor
│   └── useImagePicker.ts    # expo-image-picker hook
├── hooks/
│   └── useSync.ts          # { isSyncing, lastSyncedAt, triggerSync }
├── components/
│   ├── TodoList.tsx         # withObservables reactive list
│   └── TodoItem.tsx         # withObservables single item
└── api/
    └── store.ts            # In-memory data store (server-side)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Xcode) or Android Emulator

### Install & Run
```bash
npm install

# WatermelonDB requires a native build
npx expo run:ios
# or
npx expo run:android
```

> **Note:** `expo start` alone won't work — WatermelonDB requires native modules linked via a full build.

## 🔄 Sync Flow

```
App starts → syncOrchestrator.triggerSync()
             ├── POST /api/sync/pull → get changes from server
             ├── WatermelonDB applies changes to local SQLite
             ├── POST /api/sync/push → send local mutations to server
             └── imageUploadService.processPendingUploads()
                 └── POST /api/uploads (FormData) for each pending image
```

## 📡 API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/todos` | GET | List all todos |
| `/api/todos` | POST | Create a todo |
| `/api/sync/pull` | POST | WatermelonDB pull (returns `{ changes, timestamp }`) |
| `/api/sync/push` | POST | WatermelonDB push (applies `{ changes }`) |
| `/api/uploads` | POST | Image upload (multipart FormData) |

## 🔌 Swapping to a Real Backend

Only two files need changes:
1. **`src/sync/SyncService.ts`** — point `pullChanges` and `pushChanges` URLs to your real API
2. **`src/image/ImageUploadService.ts`** — point upload URL to your storage endpoint

The WatermelonDB sync protocol contract stays the same.

## 📱 Screens

- **Todos list** — reactive list with sync status bar and FAB
- **Create todo** — text inputs + image picker with offline queue
- **Todo detail** — view, toggle done, delete, image with upload status

## 🛠 Tech Stack

| Library | Version | Purpose |
|---|---|---|
| Expo SDK | 54 | Framework |
| React Native | 0.81 | Runtime |
| WatermelonDB | 0.28 | Offline DB + Sync |
| NetInfo | 12.x | Network detection |
| SecureStore | 15.x | Secure token storage |
| ImagePicker | 16.x | Image selection |

## License

MIT
