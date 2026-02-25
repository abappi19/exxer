Core abstraction = Resource

Public API avoids implementation details (no “Offline” in consumer-facing naming)

WatermelonDB is an internal storage engine

SDK remains transport-agnostic

📘 Project Name (Working)

exxer

Internal reusable offline-first data layer for Expo-managed React Native apps.

📗 Core Architectural Terminology
Concept	Naming Convention	Purpose
Domain Data Definition	Resource	Represents syncable domain object
Hook	useResource()	Data access
Client	DataClient	Main orchestrator
Sync Engine	SyncEngine	Full snapshot sync
Mutation Queue	MutationQueue	Offline write system
Transport Layer	TransportAdapter	REST / GraphQL abstraction
Event System	EventBus	Model-level updates
Storage Adapter	StorageAdapter	Watermelon wrapper
📙 High-Level Goals

Offline-first architecture

Full snapshot sync on startup

Server-authoritative conflict model

Optimistic mutation queue

Network-aware retry

Cache strategy configuration (global + per request)

Hook-based reactive UI updates

Framework-agnostic transport layer

📕 Functional Requirements
1️⃣ Resource Definition System
1.1 Resource Definition API
defineResource<T>({
  name: "User",
  table: "users",
  endpoint: "/users",
  cache?: CacheConfig,
  sync?: SyncConfig
})
1.2 Resource Naming Rules

PascalCase for resource constant
UserResource

Singular name for entity

Table names plural lowercase

Endpoint plural lowercase

Example:

export const UserResource = defineResource<User>({
  name: "User",
  table: "users",
  endpoint: "/users"
})
2️⃣ Data Client
2.1 Initialization
createDataClient({
  baseURL,
  resources: [UserResource, PostResource],
  auth: {
    getToken,
    refreshToken
  },
  sync: {
    runOnStartup: true,
    background: true
  }
})
2.2 Responsibilities

Resource registry

Lifecycle control

Inject transport adapter

Inject storage adapter

Inject queue manager

Manage sync state

3️⃣ Data Access Layer
3.1 Primary Hook
const { data, loading, error } = useResource(UserResource)
3.2 Behavior

When mounted:

Query local storage

Include:

persisted records

pending mutations

failed mutations

Subscribe to resource-level event

Re-render on event emission

3.3 Type Safety

Type inference derives from Resource<T> definition.
No generics required at call site.

4️⃣ Sync Engine
4.1 Strategy

Full snapshot sync

Server authoritative

Overwrite local tables

Preserve mutation queue

4.2 Sync Flow

For each registered resource:

fetch snapshot from endpoint
begin transaction
    clear local table
    insert snapshot records
commit
emit RESOURCE_UPDATED
4.3 Events

SYNC_STARTED

SYNC_COMPLETED

RESOURCE_UPDATED

AUTH_REQUIRED

5️⃣ Mutation Queue System
5.1 Queue Schema

Table: mutation_queue

Fields:

id

resource_name

operation (create | update | delete)

payload

status (pending | failed | completed)

retry_count

created_at

last_attempt_at

5.2 Mutation API
dataClient.mutate(UserResource, "update", payload)
5.3 Mutation Flow

Optimistically update local storage

Insert queue item

Mark record:

_syncStatus: "pending"

Emit RESOURCE_UPDATED

Queue processor handles upload

5.4 Retry Policy

Fixed interval retry

Network-aware pause

Max retry count configurable

Marks failed after limit

Manual retry supported

6️⃣ Cache System
6.1 Global Configuration
cache: {
  strategy: "stale-while-revalidate",
  ttl: 60000
}
6.2 Per Request Override
dataClient.get(UserResource, {
  cache: {
    strategy: "network-first"
  }
})
6.3 Cache Strategies
Strategy	Behavior
network-first	Try API → fallback to local
cache-first	Return local if valid
stale-while-revalidate	Return local → fetch remote
no-cache	Always network
7️⃣ Network Awareness

Uses Expo-compatible NetInfo.

Behavior:

Pause queue when offline

Resume automatically when online

Emit NETWORK_STATUS_CHANGED

8️⃣ Authentication Handling

JWT-based.

8.1 Expired While Offline

Queue paused

On reconnect:

Attempt refresh

If fails → emit AUTH_REQUIRED

8.2 During Sync

If 401:

Attempt refresh

Retry once

If fails → stop sync

📗 Non-Functional Requirements
Performance

Optimized for <10k records

Indexed storage

Batched writes

Avoid full DB reload in UI

Reliability

Queue persistence guaranteed

Crash-safe writes

Idempotent sync

Extensibility

Pluggable TransportAdapter

Replaceable StorageAdapter

Future partial sync support

Optional background sync

📘 Internal Module Structure
/core
  DataClient.ts
  ResourceRegistry.ts
  config.ts

/resources
  defineResource.ts
  types.ts

/sync
  SyncEngine.ts

/mutation
  MutationQueue.ts
  QueueProcessor.ts

/cache
  CacheManager.ts

/network
  NetworkManager.ts

/auth
  AuthManager.ts

/events
  EventBus.ts

/storage
  WatermelonAdapter.ts

/hooks
  useResource.ts
📙 MVP Scope

Include:

Resource definition

Full startup sync

Mutation queue

Fixed retry

Network detection

Cache strategies

useResource hook

Event-driven reactivity

📕 Phase 2 (Advanced)

Background sync (Expo TaskManager)

Partial sync

Relationship sync

Multi-tenant DB separation

Encryption at rest

Debug/devtools dashboard

📘 Naming Conventions Summary
Component	Convention
Resource	UserResource
Hook	useResource()
Client	DataClient
Event	RESOURCE_UPDATED
Table	users
Endpoint	/users
Sync Status Field	_syncStatus
Queue Table	mutation_queue
Final Architectural Identity

You are building:

A deterministic, resource-driven offline data engine for Expo apps.

Clean naming.
No implementation leakage.
Extensible.
Production-ready.

If you want next step, we can now:

Design exact TypeScript interfaces

Define complete lifecycle state machine

Design queue processor algorithm formally

Define transport adapter abstraction

Design resource-level configuration contract

Which layer do you want to lock down next?