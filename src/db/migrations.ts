import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
    migrations: [
        // Example: add a column in a future version
        // {
        //   toVersion: 2,
        //   steps: [
        //     addColumns({
        //       table: 'todos',
        //       columns: [{ name: 'priority', type: 'number', isOptional: true }],
        //     }),
        //   ],
        // },
    ],
});
