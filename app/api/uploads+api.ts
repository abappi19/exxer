import fs from 'fs';
import path from 'path';

/**
 * POST /api/uploads
 *
 * Accepts multipart form data with a "file" field.
 * Writes the file to the local `public/uploads` directory and returns the URL.
 * In production, you would swap this for S3/GCS.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const formData = await request.formData() as any;
        const file = formData.get?.('file') ?? null;

        if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        // Generate filename
        const filename = typeof file === 'string'
            ? `${Date.now()}_upload.jpg`
            : `${Date.now()}_${(file as any).name || 'upload.jpg'}`;

        // Define upload directory (Expo serves files from the `public` folder)
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Convert file to buffer and write to disk
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filePath = path.join(uploadDir, filename);

        await fs.promises.writeFile(filePath, buffer);

        // Determine the host from the request to construct the public URL
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        const publicUrl = `${baseUrl}/uploads/${filename}`;

        return Response.json({ url: publicUrl }, { status: 201 });
    } catch (error) {
        console.error('[uploads+api] Error:', error);
        return Response.json({ error: 'Upload failed' }, { status: 500 });
    }
}
