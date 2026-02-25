import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 1,
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
