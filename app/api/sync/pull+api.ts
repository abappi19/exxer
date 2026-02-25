import { getAll, getDeletedIds, type TodoRecord } from '@/src/api/store';

/**
 * POST /api/sync/pull
 *
 * WatermelonDB-compatible pull endpoint.
 * Body: { lastPulledAt: number | null }
 * Returns: { changes, timestamp }
 */
export async function POST(request: Request): Promise<Response> {
    const { lastPulledAt } = await request.json();
    const now = Date.now();
    const allTodos = getAll();

    let created: TodoRecord[] = [];
    let updated: TodoRecord[] = [];

    if (lastPulledAt == null) {
        // First sync ever — everything is "created"
        created = allTodos;
    } else {
        for (const todo of allTodos) {
            if (todo.created_at > lastPulledAt) {
                created.push(todo);
            } else if (todo.updated_at > lastPulledAt) {
                updated.push(todo);
            }
        }
    }

    const deleted = getDeletedIds();

    return Response.json({
        changes: {
            todos: { created, updated, deleted },
            users: { created: [], updated: [], deleted: [] },
        },
        timestamp: now,
    });
}
