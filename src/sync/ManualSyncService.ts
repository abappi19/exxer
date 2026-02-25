import { Q } from '@nozbe/watermelondb';
import { Platform } from 'react-native';
import { database } from '../db/database';
import { Todo } from '../db/models';

/**
 * Handle Android emulator localhost mapping (10.0.2.2) 
 * vs iOS/Web (localhost)
 */
const API_BASE = Platform.OS === 'android'
    ? 'http://10.0.2.2:8081'
    : typeof window !== 'undefined'
        ? `${window.location.origin}`
        : 'http://localhost:8081';

/**
 * REST-based manual sync service.
 */
export class ManualSyncService {
    /**
     * PUSH: Identify local changes and send them to the server.
     */
    async push(): Promise<void> {
        const todosCollection = database.get<Todo>('todos');

        // Query for anything not synced or with errors
        const pending = await todosCollection.query(
            Q.where('manual_sync_status', Q.notEq('synced'))
        ).fetch();

        for (const todo of pending) {
            // Determine method based on WatermelonDB internal status
            const status = (todo as any)._status;

            if (status === 'deleted') {
                await this.handleDelete(todo);
                continue;
            }

            const method = status === 'created' ? 'POST' : 'PATCH';
            const body = {
                ...todo._raw,
                manual_sync_status: 'synced', // Tell server it should be synced once saved
            };

            try {
                const res = await fetch(`${API_BASE}/api/todos`, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (res.ok || res.status === 409) {
                    // Success or item already exists on server (Conflict)
                    if (res.status === 409) {
                        console.log(`[ManualSync] Item ${todo.id} already exists on server (409). Marking as synced locally.`);
                    }
                    await database.write(async () => {
                        await todo.update(record => {
                            record.manualSyncStatus = 'synced';
                            record.syncError = null;
                        });
                    });
                } else if (res.status === 404 && method === 'PATCH') {
                    // Item was deleted from server, so we should delete it locally too
                    console.log(`[ManualSync] Item ${todo.id} missing from server during PATCH. Deleting locally.`);
                    await database.write(async () => {
                        await todo.destroyPermanently();
                    });
                } else {
                    throw new Error(`Server responded with ${res.status}`);
                }
            } catch (e: any) {
                console.error(`[ManualSync] Push ${method} error:`, e);
                await database.write(async () => {
                    await todo.update(record => {
                        record.manualSyncStatus = 'error';
                        record.syncError = e.message || 'Unknown error';
                    });
                });
            }
        }
    }

    private async handleDelete(todo: Todo): Promise<void> {
        try {
            const res = await fetch(`${API_BASE}/api/todos?id=${todo.id}`, {
                method: 'DELETE',
            });
            if (res.ok || res.status === 404) {
                // If it's already gone from server (404), that's fine too
                await database.write(async () => {
                    await todo.destroyPermanently();
                });
            } else {
                throw new Error(`Server delete failed: ${res.status}`);
            }
        } catch (e: any) {
            console.error('[ManualSync] Push Delete error:', e);
            await database.write(async () => {
                await todo.update(record => {
                    record.manualSyncStatus = 'error';
                    record.syncError = e.message || 'Delete failed';
                });
            });
        }
    }

    /**
     * Retries sync for a specific record.
     */
    async retryTodo(todo: Todo): Promise<void> {
        await database.write(async () => {
            await todo.update(record => {
                record.manualSyncStatus = 'pending';
                record.syncError = null;
            });
        });
        await this.push();
    }

    /**
     * PULL: Fetch all todos from the server and merge them.
     * Also handles server-side deletions by removing local synced records missing from the server.
     */
    async pull(): Promise<void> {
        try {
            const res = await fetch(`${API_BASE}/api/todos`);
            if (!res.ok) throw new Error('Pull failed');
            const serverTodos = await res.json();

            // 1. Merge/Update from server
            await this.mergeServerData(serverTodos);

            // 2. Identify and handle server-side deletions
            await this.cleanupOrphanedRecords(serverTodos);
        } catch (e) {
            console.error('[ManualSync] Pull error:', e);
        }
    }

    /**
     * On-Demand Pull: Fetch a single todo and merge it.
     */
    async syncOne(id: string): Promise<void> {
        try {
            const res = await fetch(`${API_BASE}/api/todos?id=${id}`);
            if (!res.ok) {
                if (res.status === 404) {
                    // Record missing from server, clean up locally
                    console.log(`[ManualSync] Item ${id} missing from server during SyncOne. Cleanup.`);
                    const todosCollection = database.get<Todo>('todos');
                    const localItem = await todosCollection.find(id).catch(() => null);
                    if (localItem && localItem.syncState === 'synced') {
                        await database.write(async () => {
                            await localItem.destroyPermanently();
                        });
                    }
                    return;
                }
                throw new Error('Fetch one failed');
            }
            const serverTodo = await res.json();
            await this.mergeServerData([serverTodo]);
        } catch (e) {
            console.error(`[ManualSync] SyncOne (${id}) error:`, e);
        }
    }

    private async mergeServerData(serverTodos: any[]): Promise<void> {
        await database.write(async () => {
            const todosCollection = database.get<Todo>('todos');

            for (const data of serverTodos) {
                const localMatch = await todosCollection.find(data.id).catch(() => null);

                if (localMatch) {
                    // Only update if not locally dirty
                    if (localMatch.manualSyncStatus === 'synced') {
                        await localMatch.update(record => {
                            Object.assign(record._raw, data);
                            record.manualSyncStatus = 'synced';
                        });
                    }
                } else {
                    // Create new record as synced
                    await todosCollection.create(record => {
                        Object.assign(record._raw, data);
                        record.manualSyncStatus = 'synced';
                    });
                }
            }
        });
    }

    /**
     * Removes local records that are marked as 'synced' but are no longer on the server.
     */
    private async cleanupOrphanedRecords(serverTodos: any[]): Promise<void> {
        const todosCollection = database.get<Todo>('todos');
        const serverIds = new Set(serverTodos.map(t => t.id));

        // Get all items currently marked as synced locally
        const syncedLocalItems = await todosCollection.query(
            Q.where('manual_sync_status', 'synced')
        ).fetch();

        const itemsToRemove = syncedLocalItems.filter(item => !serverIds.has(item.id));

        if (itemsToRemove.length > 0) {
            console.log(`[ManualSync] Cleaning up ${itemsToRemove.length} orphaned records.`);
            await database.write(async () => {
                for (const item of itemsToRemove) {
                    await item.destroyPermanently();
                }
            });
        }
    }

    /** Run a full sync cycle */
    async sync(): Promise<void> {
        await this.push();
        await this.pull();
    }
}

export const manualSyncService = new ManualSyncService();
