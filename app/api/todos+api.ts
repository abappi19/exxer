import { create, getAll } from '@/src/api/store';

/** GET /api/todos — list all todos */
export async function GET(): Promise<Response> {
    return Response.json(getAll());
}

/** POST /api/todos — create a new todo */
export async function POST(request: Request): Promise<Response> {
    const body = await request.json();
    const record = create({
        title: body.title ?? '',
        body: body.body ?? '',
        is_done: body.is_done ?? false,
        image_local_uri: body.image_local_uri ?? null,
        image_remote_url: body.image_remote_url ?? null,
        image_upload_status: body.image_upload_status ?? 'none',
    });
    return Response.json(record, { status: 201 });
}
