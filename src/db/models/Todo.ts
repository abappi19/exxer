import { Model } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export type TodoSyncState = 'synced' | 'pending' | 'error' | 'deleted';

/** A Todo item — the core domain model for this starter. */
export class Todo extends Model {
    static table = 'todos';

    @field('title') title!: string;
    @field('body') body!: string;
    @field('is_done') isDone!: boolean;
    @field('image_local_uri') imageLocalUri!: string | null;
    @field('image_remote_url') imageRemoteUrl!: string | null;
    @field('image_upload_status') imageUploadStatus!: 'none' | 'pending' | 'done';
    @field('sync_error') syncError!: string | null;
    @field('manual_sync_status') manualSyncStatus!: TodoSyncState;
    @date('created_at') createdAt!: Date;
    @date('updated_at') updatedAt!: Date;

    /** 
     * Custom sync state for UI indicators.
     * Renamed from syncStatus to avoid conflict with Base Model.
     */
    get syncState(): TodoSyncState {
        if ((this as any)._status === 'deleted') return 'deleted';
        // handle migrations/initial states where it might be null
        return this.manualSyncStatus || 'pending';
    }

    /** Resolved image URI — prefers remote URL, falls back to local. */
    get imageUri(): string | null {
        return this.imageRemoteUrl || this.imageLocalUri || null;
    }
}
