import fs from 'fs';
import path from 'path';

/**
 * In-memory data store for the demo API.
 * Persists to `public/data.json` for development stability.
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

const DATA_FILE = path.join(process.cwd(), 'public', 'data.json');
let todos: Map<string, TodoRecord> = new Map();
let nextId = 1;
let lastModified = Date.now();

// Ensure the directory exists
function ensureDir() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Load data from file
function load() {
    try {
        ensureDir();
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const list = JSON.parse(data) as TodoRecord[];
            todos = new Map(list.map(t => [t.id, t]));

            // Update nextId based on server_ IDs
            const serverIds = list
                .map(t => parseInt(t.id.replace('server_', '')))
                .filter(n => !isNaN(n));
            if (serverIds.length > 0) {
                nextId = Math.max(...serverIds) + 1;
            }
        } else {
            seed();
        }
    } catch (error) {
        console.error('[Store] Load error:', error);
        seed();
    }
}

// Save data to file
async function save() {
    try {
        ensureDir();
        const list = Array.from(todos.values());
        await fs.promises.writeFile(DATA_FILE, JSON.stringify(list, null, 2));
    } catch (error) {
        console.error('[Store] Save error:', error);
    }
}

function seed() {
    const items = [
        { title: 'Buy groceries', body: 'Milk, eggs, bread, and cheese' },
        { title: 'Read WatermelonDB docs', body: 'Sync protocol, models, decorators' },
        { title: 'Build offline-first app', body: 'Use this starter as a base!' },
    ];
    for (const item of items) {
        const id = `server_${nextId++}`;
        const now = Date.now();
        todos.set(id, {
            id,
            title: item.title,
            body: item.body,
            is_done: false,
            image_local_uri: null,
            image_remote_url: null,
            image_upload_status: 'none',
            created_at: now,
            updated_at: now,
        });
    }
    save();
}

// Initial load
load();

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
    save();
    return record;
}

/**
 * Update a record by ID.
 * If not found, it performs an upsert to handle demo server restarts.
 */
export function update(id: string, data: Partial<TodoRecord>): TodoRecord {
    const existing = todos.get(id);
    const now = Date.now();

    // Effectively an upsert logic
    const record: TodoRecord = existing
        ? { ...existing, ...data, updated_at: now }
        : {
            id,
            title: '',
            body: '',
            is_done: false,
            image_local_uri: null,
            image_remote_url: null,
            image_upload_status: 'none',
            created_at: now,
            ...data,
            updated_at: now
        } as TodoRecord;

    todos.set(id, record);
    lastModified = now;
    save();
    return record;
}

export function remove(id: string): boolean {
    const existed = todos.delete(id);
    if (existed) {
        lastModified = Date.now();
        save();
    }
    return existed;
}

export function upsert(record: TodoRecord): void {
    todos.set(record.id, record);
    lastModified = Date.now();
    save();
}
