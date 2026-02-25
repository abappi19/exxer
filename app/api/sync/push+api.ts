import { remove, trackDeletion, upsert, type TodoRecord } from '@/src/api/store';

/**
 * POST /api/sync/push
 *
 * WatermelonDB-compatible push endpoint.
 * Body: { changes: { todos: { created, updated, deleted } }, lastPulledAt }
 * Returns: 200 OK
 */
export async function POST(request: Request): Promise<Response> {
    const { changes } = await request.json();

    const todosChanges = changes?.todos;
    if (todosChanges) {
        // Apply created
        for (const record of todosChanges.created ?? []) {
            upsert(record as TodoRecord);
        }

        // Apply updated
        for (const record of todosChanges.updated ?? []) {
            upsert(record as TodoRecord);
        }

        // Apply deleted
        for (const id of todosChanges.deleted ?? []) {
            remove(id);
            trackDeletion(id);
        }
    }

    return Response.json({ ok: true });
}
