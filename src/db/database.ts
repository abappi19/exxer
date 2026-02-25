import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { migrations } from './migrations';
import { Todo } from './models';
import { schema } from './schema';

const adapter = new SQLiteAdapter({
    schema,
    migrations,
    jsi: true,
    onSetUpError: (error) => {
        console.error('[WatermelonDB] Setup error:', error);
    },
});

export const database = new Database({
    adapter,
    modelClasses: [Todo],
});
