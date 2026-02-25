import { useCallback, useEffect, useRef, useState } from 'react';
import { imageUploadService } from '../image/ImageUploadService';
import { syncOrchestrator } from '../sync/SyncOrchestrator';

interface UseSyncResult {
    /** Whether a sync is currently running. */
    isSyncing: boolean;
    /** Last successful sync timestamp, or null. */
    lastSyncedAt: Date | null;
    /** Manually trigger a full sync cycle. */
    triggerSync: () => Promise<void>;
    /** Manually trigger a localized sync for one record. */
    triggerSyncOne: (id: string) => Promise<void>;
}

/**
 * Hook to trigger sync + expose sync status.
 * Also processes pending image uploads after each sync.
 */
export function useSync(): UseSyncResult {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const triggerSync = useCallback(async () => {
        setIsSyncing(true);
        try {
            await syncOrchestrator.triggerSync();
            // After sync, process any pending image uploads
            await imageUploadService.processPendingUploads();
            if (mounted.current) {
                setLastSyncedAt(syncOrchestrator.lastSyncedAt);
            }
        } finally {
            if (mounted.current) {
                setIsSyncing(false);
            }
        }
    }, []);

    const triggerSyncOne = useCallback(async (id: string) => {
        await syncOrchestrator.triggerSyncOne(id);
    }, []);

    return { isSyncing, lastSyncedAt, triggerSync, triggerSyncOne };
}
