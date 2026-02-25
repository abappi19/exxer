import { Q } from '@nozbe/watermelondb';
import { database } from '../db/database';
import { Todo } from '../db/models';

const API_BASE = typeof window !== 'undefined'
    ? `${window.location.origin}`
    : 'http://localhost:8081';

/**
 * REST-based manual sync service.
 * Handles push (mutations) and pull (full refresh) manually.
 */
export class ManualSyncService {
    /**
     * PUSH: Identify local changes and send them to the server.
     * Captures and persists errors to allow manual retries.
     */
    async push(): Promise<void> {
        const todosCollection = database.get<Todo>('todos');

        // 1. Handle Created
        const created = await todosCollection.query(Q.where('_status', 'created')).fetch();
        for (const todo of created) {
            try {
                const res = await fetch(`${API_BASE}/api/todos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(todo._raw),
                });
                if (res.ok) {
                    await database.write(async () => {
                        await todo.update(record => {
                            (record as any)._status = 'synced';
                            record.syncError = null;
                        });
                    });
                } else {
                    throw new Error(`Server responded with ${res.status}`);
                }
            } catch (e: any) {
                console.error('[ManualSync] Push Create error:', e);
                await database.write(async () => {
                    await todo.update(record => {
                        record.syncError = e.message || 'Unknown error';
                    });
                });
            }
        }

        // 2. Handle Updated
        const updated = await todosCollection.query(Q.where('_status', 'updated')).fetch();
        for (const todo of updated) {
            try {
                const res = await fetch(`${API_BASE}/api/todos`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(todo._raw),
                });
                if (res.ok) {
                    await database.write(async () => {
                        await todo.update(record => {
                            (record as any)._status = 'synced';
                            record.syncError = null;
                        });
                    });
                } else {
                    throw new Error(`Server responded with ${res.status}`);
                }
            } catch (e: any) {
                console.error('[ManualSync] Push Update error:', e);
                await database.write(async () => {
                    await todo.update(record => {
                        record.syncError = e.message || 'Unknown error';
                    });
                });
            }
        }

        // 3. Handle Deleted
        const deleted = await todosCollection.query(Q.where('_status', 'deleted')).fetch();
        for (const todo of deleted) {
            try {
                const res = await fetch(`${API_BASE}/api/todos?id=${todo.id}`, {
                    method: 'DELETE',
                });
                if (res.ok) {
                    await database.write(async () => {
                        await todo.destroyPermanently();
                    });
                } else {
                    throw new Error(`Server responded with ${res.status}`);
                }
            } catch (e: any) {
                console.error('[ManualSync] Push Delete error:', e);
                // Can't easily show error for deleted items in list, but we log it
            }
        }
    }

    /**
     * Retries sync for a specific record.
     */
    async retryTodo(todo: Todo): Promise<void> {
        // Clear error first to show "pending" state in UI
        await database.write(async () => {
            await todo.update(record => {
                record.syncError = null;
            });
        });
        await this.push();
    }

    /**
     * PULL: Fetch all todos from the server and merge them.
     */
    async pull(): Promise<void> {
        try {
            const res = await fetch(`${API_BASE}/api/todos`);
            if (!res.ok) throw new Error('Pull failed');
            const serverTodos = await res.json();

            await database.write(async () => {
                const todosCollection = database.get<Todo>('todos');

                for (const data of serverTodos) {
                    const localMatch = await todosCollection.find(data.id).catch(() => null);

                    if (localMatch) {
                        // Only update if not locally dirty
                        if (localMatch.syncStatus === 'synced') {
                            await localMatch.update(record => {
                                Object.assign(record._raw, data);
                            });
                        }
                    } else {
                        // Create new record as synced
                        await todosCollection.create(record => {
                            Object.assign(record._raw, data);
                            (record as any)._status = 'synced';
                        });
                    }
                }
            });
        } catch (e) {
            console.error('[ManualSync] Pull error:', e);
        }
    }

    /** Run a full sync cycle */
    async sync(): Promise<void> {
        await this.push();
        await this.pull();
    }
}

export const manualSyncService = new ManualSyncService();
