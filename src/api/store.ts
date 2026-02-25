/**
 * In-memory data store for the demo API.
 * Persists for the lifetime of the dev server process.
 */

export interface TodoRecord {
    id: string;
    title: string;
    body: string;
    is_done: boolean;
    image_local_uri: string | null;
    image_remote_url: string | null;
    image_upload_status: string;
    created_at: number;
    updated_at: number;
}

let nextId = 1;
const todos: Map<string, TodoRecord> = new Map();

// Seed some initial data
function seed() {
    const items = [
        { title: 'Buy groceries', body: 'Milk, eggs, bread, and cheese' },
        { title: 'Read WatermelonDB docs', body: 'Sync protocol, models, decorators' },
        { title: 'Build offline-first app', body: 'Use this starter as a base!' },
        { title: 'Go for a walk', body: 'At least 30 minutes outside' },
        { title: 'Write unit tests', body: 'Cover sync and upload logic' },
    ];
    for (const item of items) {
        const id = `todo_${nextId++}`;
        todos.set(id, {
            id,
            title: item.title,
            body: item.body,
            is_done: false,
            image_local_uri: null,
            image_remote_url: null,
            image_upload_status: 'none',
            created_at: Date.now(),
            updated_at: Date.now(),
        });
    }
}

seed();

/** Track last modification time for sync (epoch ms) */
let lastModified = Date.now();

export function getAll(): TodoRecord[] {
    return Array.from(todos.values());
}

export function getById(id: string): TodoRecord | undefined {
    return todos.get(id);
}

export function create(data: Partial<TodoRecord> & { title: string }): TodoRecord {
    const id = data.id ?? `server_${nextId++}`;
    const now = Date.now();
    const record: TodoRecord = {
        id,
        title: data.title,
        body: data.body ?? '',
        is_done: data.is_done ?? false,
        image_local_uri: data.image_local_uri ?? null,
        image_remote_url: data.image_remote_url ?? null,
        image_upload_status: data.image_upload_status ?? 'none',
        created_at: now,
        updated_at: now,
    };
    todos.set(id, record);
    lastModified = now;
    return record;
}

export function update(id: string, data: Partial<TodoRecord>): TodoRecord | null {
    const existing = todos.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updated_at: Date.now() };
    todos.set(id, updated);
    lastModified = updated.updated_at;
    return updated;
}

export function remove(id: string): boolean {
    const existed = todos.delete(id);
    if (existed) lastModified = Date.now();
    return existed;
}

const deletedIds: string[] = [];

export function getDeletedIds(): string[] {
    return [...deletedIds];
}

export function trackDeletion(id: string) {
    deletedIds.push(id);
    lastModified = Date.now();
}

export function getLastModified(): number {
    return lastModified;
}

export function upsert(record: TodoRecord): void {
    todos.set(record.id, record);
    lastModified = Date.now();
}
