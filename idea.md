# 📱 react-native-offline-first-architecture

> A production-ready **starter project** for Expo-managed React Native apps built on WatermelonDB's native sync protocol — not a wrapper, not an SDK. Raw WatermelonDB, used correctly and completely.

---

## 🧠 Philosophy

WatermelonDB already solves offline-first data. It has:
- Built-in **two-phase sync** (pull + push) with a well-defined protocol
- **Per-column conflict resolution** (client-wins on changed columns, server-wins on untouched)
- Native **reactive observables** (`observe()`, `observeCount()`)
- Native **relations** (`@relation`, `@children`, `@immutableRelation`)
- **Migration** system for schema evolution
- **Replacement Sync** for full-snapshot use cases (v0.25+)

This project does **not** wrap WatermelonDB. It uses it at its highest level and builds a clean, idiomatic starter architecture around it.

---

## 📘 Project Identity

**Name:** `react-native-offline-first-architecture`

A starter template and reference architecture for Expo apps that need:
- Offline-first data persistence
- Two-way server sync
- Reactive UI with WatermelonDB observables
- JWT authentication with token refresh
- Background sync scheduling

---

## 📗 What WatermelonDB Gives Us Natively

| Capability | WatermelonDB Native API |
|---|---|
| Local SQLite storage | `Database` + `LokiJSAdapter` / `SQLiteAdapter` |
| Schema definition | `appSchema` + `tableSchema` + `column()` |
| Model definition | `Model` class + `@field`, `@text`, `@date`, `@json`, `@relation`, `@children` |
| Reactive queries | `query.observe()`, `query.observeCount()` |
| Component binding | `withObservables` HOC |
| Two-phase sync | `synchronize({ pullChanges, pushChanges })` |
| Conflict resolution | Per-column, client-wins on changed fields |
| Sync status tracking | `_status`, `_changed` built-in fields |
| Incremental sync | `lastPulledAt` timestamp passed to server |
| Full replacement sync | `synchronize({ ... replacer })` |
| Schema migrations | `schemaMigrations` + `addColumns` / `createTable` |
| Batch writes | `database.write(() => { ... })` |
| Associations | `static associations` on Model |

---

## 📙 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Expo App                        │
│                                                  │
│  screens/ ──► components/ ──► withObservables    │
│                                   │              │
│                              WatermelonDB        │
│                              query.observe()     │
│                                   │              │
│                             SyncService          │
│                         synchronize(pull, push)  │
│                                   │              │
│                          REST / GraphQL API       │
└─────────────────────────────────────────────────┘
```

---

## 📕 Core Building Blocks

### 1️⃣ Database Setup

```ts
// src/db/database.ts
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from './schema'
import { migrations } from './migrations'
import { User, Post, Comment } from './models'

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,           // JSI mode for best performance
  onSetUpError: (error) => { /* crash reporter */ }
})

export const database = new Database({
  adapter,
  modelClasses: [User, Post, Comment]
})
```

---

### 2️⃣ Schema Definition

WatermelonDB schema is the single source of truth for table/column layout.
Every table automatically gets `id`, `_status`, and `_changed`.

```ts
// src/db/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name',       type: 'string' },
        { name: 'email',      type: 'string', isIndexed: true },
        { name: 'is_active',  type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'posts',
      columns: [
        { name: 'title',      type: 'string' },
        { name: 'body',       type: 'string' },
        { name: 'user_id',    type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'comments',
      columns: [
        { name: 'body',       type: 'string' },
        { name: 'post_id',    type: 'string', isIndexed: true },
        { name: 'user_id',    type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
})
```

---

### 3️⃣ Model Definitions

Models use decorators to map fields and declare relationships.

```ts
// src/db/models/User.ts
import { Model }            from '@nozbe/watermelondb'
import { field, date, children } from '@nozbe/watermelondb/decorators'

export class User extends Model {
  static table = 'users'
  static associations = {
    posts: { type: 'has_many', foreignKey: 'user_id' }
  } as const

  @field('name')      name!: string
  @field('email')     email!: string
  @field('is_active') isActive!: boolean
  @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date

  @children('posts')  posts!: any
}
```

```ts
// src/db/models/Post.ts
import { Model }                        from '@nozbe/watermelondb'
import { field, date, relation, children } from '@nozbe/watermelondb/decorators'

export class Post extends Model {
  static table = 'posts'
  static associations = {
    users:    { type: 'belongs_to', key: 'user_id' },
    comments: { type: 'has_many',   foreignKey: 'post_id' }
  } as const

  @field('title')      title!: string
  @field('body')       body!: string
  @relation('users', 'user_id') author!: User
  @date('created_at')  createdAt!: Date
  @date('updated_at')  updatedAt!: Date

  @children('comments') comments!: any
}
```

---

### 4️⃣ WatermelonDB Sync — Native Two-Phase Protocol

WatermelonDB's `synchronize()` does the heavy lifting:
- **Pull phase**: fetch changes from server since `lastPulledAt`
- **Push phase**: send local `created / updated / deleted` changes to server
- **Conflict resolution**: per-column client-wins (server base, client changes on top)

```ts
// src/sync/SyncService.ts
import { synchronize }    from '@nozbe/watermelondb/sync'
import { database }       from '../db/database'
import { authManager }    from '../auth/AuthManager'

export async function sync(): Promise<void> {
  await synchronize({
    database,

    // --- PULL ---
    async pullChanges({ lastPulledAt, schemaVersion, migration }) {
      const token = await authManager.getToken()
      const response = await fetch(`${BASE_URL}/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ lastPulledAt, schemaVersion, migration })
      })
      if (!response.ok) throw new Error(`Pull failed: ${response.status}`)
      const { changes, timestamp } = await response.json()
      return { changes, timestamp }
    },

    // --- PUSH ---
    async pushChanges({ changes, lastPulledAt }) {
      const token = await authManager.getToken()
      const response = await fetch(`${BASE_URL}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ changes, lastPulledAt })
      })
      if (!response.ok) throw new Error(`Push failed: ${response.status}`)
    },

    // Retry push once on conflict
    migrationsEnabledAtVersion: 1,
    sendCreatedAsUpdated: false,
    log: __DEV__ ? console.log : undefined,
  })
}
```

**Expected server API contract:**

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/sync/pull` | POST | `{ lastPulledAt, schemaVersion, migration }` | `{ changes, timestamp }` |
| `/sync/push` | POST | `{ changes, lastPulledAt }` | `200 OK` or error |

`changes` structure:
```json
{
  "users":    { "created": [...], "updated": [...], "deleted": ["id1", "id2"] },
  "posts":    { "created": [...], "updated": [...], "deleted": [] },
  "comments": { "created": [...], "updated": [...], "deleted": [] }
}
```

---

### 5️⃣ Reactive UI — `withObservables`

WatermelonDB is reactive via RxJS observables. The recommended pattern is `withObservables` HOC.

```ts
// src/components/PostList.tsx
import React from 'react'
import { FlatList, Text } from 'react-native'
import withObservables from '@nozbe/with-observables'
import { database } from '../db/database'
import { Post } from '../db/models/Post'

// Pure component
const PostList = ({ posts }: { posts: Post[] }) => (
  <FlatList
    data={posts}
    keyExtractor={(p) => p.id}
    renderItem={({ item }) => <Text>{item.title}</Text>}
  />
)

// Connected: re-renders automatically on any post change
export default withObservables([], () => ({
  posts: database.get<Post>('posts').query().observe()
}))(PostList)
```

---

### 6️⃣ Network Awareness

```ts
// src/network/NetworkManager.ts
import NetInfo from '@react-native-community/netinfo'

export class NetworkManager {
  static async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch()
    return state.isConnected === true && state.isInternetReachable === true
  }

  static subscribe(callback: (isOnline: boolean) => void) {
    return NetInfo.addEventListener((state) => {
      callback(state.isConnected === true && state.isInternetReachable === true)
    })
  }
}
```

---

### 7️⃣ Sync Orchestration (Network-aware)

```ts
// src/sync/SyncOrchestrator.ts
import { sync }           from './SyncService'
import { NetworkManager } from '../network/NetworkManager'

export class SyncOrchestrator {
  private isSyncing = false

  async triggerSync(): Promise<void> {
    if (this.isSyncing) return
    if (!(await NetworkManager.isOnline())) return

    this.isSyncing = true
    try {
      await sync()
    } finally {
      this.isSyncing = false
    }
  }

  /** Listen for reconnect → auto kick off sync */
  startNetworkListener() {
    NetworkManager.subscribe((isOnline) => {
      if (isOnline) this.triggerSync()
    })
  }
}

export const syncOrchestrator = new SyncOrchestrator()
```

---

### 8️⃣ Authentication

```ts
// src/auth/AuthManager.ts
import * as SecureStore from 'expo-secure-store'

export class AuthManager {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync('access_token')
  }

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('access_token', token)
  }

  async refreshToken(): Promise<string | null> {
    const refresh = await SecureStore.getItemAsync('refresh_token')
    if (!refresh) return null
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh })
    })
    if (!res.ok) return null
    const { access_token } = await res.json()
    await this.setToken(access_token)
    return access_token
  }
}

export const authManager = new AuthManager()
```

---

### 9️⃣ Schema Migrations

Schema changes are handled via WatermelonDB's migration system.

```ts
// src/db/migrations.ts
import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations'

export const migrations = schemaMigrations({
  migrations: [
    // v1 → v2: add `avatar_url` to users
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'users',
          columns: [{ name: 'avatar_url', type: 'string', isOptional: true }]
        })
      ]
    },
    // v2 → v3: new `tags` table
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'tags',
          columns: [
            { name: 'name',       type: 'string' },
            { name: 'post_id',    type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
          ]
        })
      ]
    }
  ]
})
```

---

## 📗 Non-Functional Requirements

### Performance
- JSI mode enabled for SQLite adapter (fastest RN database access)
- `isIndexed: true` on all foreign keys and frequently queried columns
- `observeCount()` instead of `observe()` when only a count is needed
- `database.write()` for all mutations (batched in a single transaction)

### Reliability
- WatermelonDB sync is **idempotent** — re-running after failure is safe
- Pull is always done before push (prevents lost-write conflicts)
- Sync retried automatically on next reconnect via `SyncOrchestrator`
- Local writes always succeed offline — flushed on next successful sync

### Conflict Resolution
- WatermelonDB uses **per-column client-wins**:
  - Server response is the base
  - Local columns that changed since `lastPulledAt` are applied on top
  - Untouched local columns take the server value
- Server can enforce hard rejections via 4xx → client should re-pull

### Extensibility
- `pullChanges` and `pushChanges` are plain `async` functions — swap transport freely
- Authentication layer is injectable
- Replacement Sync available for tables that need full-snapshot refresh

---

## 📘 Module Structure

```
src/
├── db/
│   ├── database.ts          # Database singleton
│   ├── schema.ts            # appSchema: all tables + columns
│   ├── migrations.ts        # Schema version migrations
│   └── models/
│       ├── User.ts
│       ├── Post.ts
│       └── Comment.ts
│
├── sync/
│   ├── SyncService.ts       # synchronize() with pull/push
│   └── SyncOrchestrator.ts  # Network-aware trigger logic
│
├── network/
│   └── NetworkManager.ts    # NetInfo wrapper
│
├── auth/
│   └── AuthManager.ts       # JWT + SecureStore
│
├── components/
│   └── PostList.tsx         # withObservables example
│
└── screens/
    ├── HomeScreen.tsx
    └── PostDetailScreen.tsx
```

---

## 📙 MVP Scope (What This Starter Ships)

- [x] WatermelonDB `Database` setup with SQLiteAdapter + JSI
- [x] Example schema: `users`, `posts`, `comments`
- [x] Model classes with decorators and associations
- [x] `SyncService` implementing WatermelonDB two-phase sync protocol
- [x] `SyncOrchestrator` for network-aware, non-overlapping sync triggers
- [x] `NetworkManager` using Expo NetInfo
- [x] `AuthManager` using Expo SecureStore for JWT storage + refresh
- [x] `withObservables` reactive component example
- [x] Migration system scaffold

---

## 📕 Phase 2 (Extensions)

| Feature | Mechanism |
|---|---|
| Background sync | Expo `TaskManager` + `BackgroundFetch` |
| Full replacement sync | WatermelonDB `Replacement Sync` feature |
| Multi-tenant isolation | Separate `Database` instances per tenant |
| Encryption at rest | SQLCipher via `@nozbe/watermelondb/adapters/sqlite` |
| Dev inspector | WatermelonDB built-in `__DEV__` logging + custom debug screen |
| Partial sync | Server-side filtered `pullChanges` by user scope |
| Push notifications → sync | FCM/APNs trigger `syncOrchestrator.triggerSync()` |

---

## 📘 Naming Conventions

| Concept | Convention |
|---|---|
| Table | `users`, `posts` (plural snake_case) |
| Column | `user_id`, `is_active`, `created_at` (snake_case) |
| Model class | `User`, `Post`, `Comment` (PascalCase) |
| Model field | `isActive`, `createdAt` (camelCase via decorator) |
| Sync status | `_status` (built into WatermelonDB) |
| Changed columns | `_changed` (built into WatermelonDB) |
| Sync timestamp | `lastPulledAt` (WatermelonDB sync API) |

---

## ✅ Final Identity

> This project is a **WatermelonDB starter**, not a wrapper.
>
> It demonstrates how to build a complete, production-grade offline-first Expo app using WatermelonDB's native sync protocol, observable model system, and migration engine — with clean separation of concerns for auth, network, and sync orchestration.
>
> **No custom sync engine. No custom queue. No custom storage abstraction.**
> WatermelonDB already built those. We use them.