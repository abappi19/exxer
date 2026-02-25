import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../db/database';

/** Base URL of the in-app API. Adjust for production. */
const API_BASE = typeof window !== 'undefined'
    ? `${window.location.origin}`
    : 'http://localhost:8081';

/**
 * Run a full WatermelonDB sync against the in-app API.
 * Uses WatermelonDB's native two-phase protocol:
 *   1. Pull: POST /api/sync/pull → { changes, timestamp }
 *   2. Push: POST /api/sync/push ← { changes, lastPulledAt }
 */
export async function sync(): Promise<void> {
    await synchronize({
        database,

        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
            console.log('[SyncService] Pulling changes since', lastPulledAt);

            const response = await fetch(`${API_BASE}/api/sync/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lastPulledAt, schemaVersion, migration }),
            });

            if (!response.ok) {
                throw new Error(`Pull failed: ${response.status} ${response.statusText}`);
            }

            const { changes, timestamp } = await response.json();
            console.log('[SyncService] Pull complete. Timestamp:', timestamp);
            return { changes, timestamp };
        },

        pushChanges: async ({ changes, lastPulledAt }) => {
            console.log('[SyncService] Pushing local changes');

            const response = await fetch(`${API_BASE}/api/sync/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changes, lastPulledAt }),
            });

            if (!response.ok) {
                throw new Error(`Push failed: ${response.status} ${response.statusText}`);
            }

            console.log('[SyncService] Push complete');
        },

        migrationsEnabledAtVersion: 1,
    });
}
