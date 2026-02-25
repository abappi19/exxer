import { Model } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export type TodoSyncStatus = 'synced' | 'created' | 'updated' | 'deleted';

/** A Todo item — the core domain model for this starter. */
export class Todo extends Model {
    static table = 'todos';

    @field('title') title!: string;
    @field('body') body!: string;
    @field('is_done') isDone!: boolean;
    @field('image_local_uri') imageLocalUri!: string | null;
    @field('image_remote_url') imageRemoteUrl!: string | null;
    @field('image_upload_status') imageUploadStatus!: 'none' | 'pending' | 'done';
    @date('created_at') createdAt!: Date;
    @date('updated_at') updatedAt!: Date;

    /** Expose WatermelonDB's internal sync status ('synced' | 'created' | 'updated' | 'deleted') */
    get syncStatus(): TodoSyncStatus {
        return (this as any)._status;
    }

    /** Resolved image URI — prefers remote URL, falls back to local. */
    get imageUri(): string | null {
        return this.imageRemoteUrl || this.imageLocalUri || null;
    }
}
