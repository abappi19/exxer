/**
 * POST /api/uploads
 *
 * Accepts multipart form data with a "file" field.
 * In a real app this would write to cloud storage (S3, GCS, etc).
 * For this demo, we return a fake URL to simulate a successful upload.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        // Parse the form data from the request
        const formData = await request.formData() as any;
        const file = formData.get?.('file') ?? null;

        if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        // In production: upload to S3/GCS and return the real URL.
        // Here we simulate a successful upload with a predictable URL.
        const filename = typeof file === 'string'
            ? 'upload.jpg'
            : (file as any).name || 'upload.jpg';
        const fakeUrl = `https://storage.example.com/uploads/${Date.now()}_${filename}`;

        return Response.json({ url: fakeUrl }, { status: 201 });
    } catch (error) {
        console.error('[uploads+api] Error:', error);
        return Response.json({ error: 'Upload failed' }, { status: 500 });
    }
}
