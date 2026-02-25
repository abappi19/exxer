import { create, getAll, getById, remove, update } from '@/src/api/store';

/** GET /api/todos — list all todos or get one by ID */
export async function GET(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        const record = getById(id);
        if (!record) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json(record);
    }

    return Response.json(getAll());
}

/** POST /api/todos — create a new todo */
export async function POST(request: Request): Promise<Response> {
    try {
        const body = await request.json();
        const record = create({
            id: body.id,
            title: body.title ?? '',
            body: body.body ?? '',
            is_done: body.is_done ?? false,
            image_local_uri: body.image_local_uri ?? null,
            image_remote_url: body.image_remote_url ?? null,
            image_upload_status: body.image_upload_status ?? 'none',
            manual_sync_status: 'synced', // Server marks it as synced once created here
        });
        return Response.json(record, { status: 201 });
    } catch (error: any) {
        if (error.message.includes('Conflict')) {
            return Response.json({ error: error.message }, { status: 409 });
        }
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/** PUT /api/todos — full update */
export async function PUT(request: Request): Promise<Response> {
    const body = await request.json();
    if (!body.id) return Response.json({ error: 'ID required' }, { status: 400 });

    const record = update(body.id, body);
    if (!record) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(record);
}

/** PATCH /api/todos — partial update */
export async function PATCH(request: Request): Promise<Response> {
    const body = await request.json();
    if (!body.id) return Response.json({ error: 'ID required' }, { status: 400 });

    const record = update(body.id, body);
    if (!record) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(record);
}

/** DELETE /api/todos — delete a todo */
export async function DELETE(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });

    const success = remove(id);
    if (!success) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({ success: true });
}
