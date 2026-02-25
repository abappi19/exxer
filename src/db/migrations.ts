import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                {
                    type: 'add_columns',
                    table: 'todos',
                    columns: [{ name: 'sync_error', type: 'string', isOptional: true }],
                },
            ],
        },
    ],
});
