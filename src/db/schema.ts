import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 3,
    tables: [
        tableSchema({
            name: 'todos',
            columns: [
                { name: 'title', type: 'string' },
                { name: 'body', type: 'string' },
                { name: 'is_done', type: 'boolean' },
                { name: 'image_local_uri', type: 'string', isOptional: true },
                { name: 'image_remote_url', type: 'string', isOptional: true },
                { name: 'image_upload_status', type: 'string' }, // 'none' | 'pending' | 'done'
                { name: 'sync_error', type: 'string', isOptional: true },
                { name: 'manual_sync_status', type: 'string' }, // 'synced' | 'pending' | 'error'
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'users',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'email', type: 'string' },
            ],
        }),
    ],
});
