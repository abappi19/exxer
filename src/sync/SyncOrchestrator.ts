import { NetworkManager } from '../network/NetworkManager';
import { sync } from './SyncService';

/**
 * Orchestrates sync in a network-aware, non-overlapping manner.
 * - Guards against concurrent syncs
 * - Checks network before firing
 * - Auto-syncs on reconnect
 */
export class SyncOrchestrator {
    private _isSyncing = false;
    private _lastSyncedAt: Date | null = null;
    private _unsubscribe: (() => void) | null = null;

    get isSyncing(): boolean {
        return this._isSyncing;
    }

    get lastSyncedAt(): Date | null {
        return this._lastSyncedAt;
    }

    /** Trigger a sync if online and not already syncing. */
    async triggerSync(): Promise<void> {
        if (this._isSyncing) {
            console.log('[SyncOrchestrator] Sync already in progress, skipping');
            return;
        }

        const online = await NetworkManager.isOnline();
        if (!online) {
            console.log('[SyncOrchestrator] Offline, skipping sync');
            return;
        }

        this._isSyncing = true;
        try {
            await sync();
            this._lastSyncedAt = new Date();
            console.log('[SyncOrchestrator] Sync completed at', this._lastSyncedAt);
        } catch (error) {
            console.error('[SyncOrchestrator] Sync failed:', error);
        } finally {
            this._isSyncing = false;
        }
    }

    /** Start listening for network reconnection and auto-trigger sync. */
    startNetworkListener(): void {
        if (this._unsubscribe) return; // already listening

        this._unsubscribe = NetworkManager.subscribe((isOnline) => {
            if (isOnline) {
                console.log('[SyncOrchestrator] Network restored, triggering sync');
                this.triggerSync();
            }
        });
    }

    /** Stop listening for network changes. */
    stopNetworkListener(): void {
        this._unsubscribe?.();
        this._unsubscribe = null;
    }
}

export const syncOrchestrator = new SyncOrchestrator();
