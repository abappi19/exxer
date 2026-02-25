import { Q } from '@nozbe/watermelondb';
import { database } from '../db/database';
import { Todo } from '../db/models';
import { NetworkManager } from '../network/NetworkManager';

const API_BASE = typeof window !== 'undefined'
    ? `${window.location.origin}`
    : 'http://localhost:8081';

/**
 * Processes all todos with `image_upload_status = "pending"`.
 * Uploads each image to /api/uploads, then updates the record.
 * Runs independently from WatermelonDB sync.
 */
export class ImageUploadService {
    /**
     * Process all pending image uploads.
     * Silently skips on failure — retried on next cycle.
     */
    async processPendingUploads(): Promise<void> {
        const online = await NetworkManager.isOnline();
        if (!online) {
            console.log('[ImageUpload] Offline, skipping');
            return;
        }

        const todosCollection = database.get<Todo>('todos');
        const pending = await todosCollection
            .query(Q.where('image_upload_status', 'pending'))
            .fetch();

        console.log(`[ImageUpload] Found ${pending.length} pending uploads`);

        for (const todo of pending) {
            try {
                const localUri = todo.imageLocalUri;
                if (!localUri) continue;

                // Build FormData with the local image file
                const formData = new FormData();
                const filename = localUri.split('/').pop() || 'image.jpg';
                formData.append('file', {
                    uri: localUri,
                    name: filename,
                    type: 'image/jpeg',
                } as any);

                const response = await fetch(`${API_BASE}/api/uploads`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    console.warn(`[ImageUpload] Upload failed for ${todo.id}: ${response.status}`);
                    continue;
                }

                const { url } = await response.json();

                // Update the WatermelonDB record
                await database.write(async () => {
                    await todo.update((record) => {
                        record.imageRemoteUrl = url;
                        record.imageUploadStatus = 'done';
                    });
                });

                console.log(`[ImageUpload] Uploaded ${todo.id} → ${url}`);
            } catch (error) {
                console.warn(`[ImageUpload] Error uploading ${todo.id}:`, error);
                // Skip and retry on next cycle
            }
        }
    }
}

export const imageUploadService = new ImageUploadService();
