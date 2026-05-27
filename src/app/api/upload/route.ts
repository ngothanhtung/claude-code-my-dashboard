import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers.get('X-Access-Token');

    if (!accessToken) {
      return NextResponse.json({ error: 'Chưa có quyền truy cập Drive. Vui lòng đăng nhập lại.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Không có file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000',
    );

    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const parentFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        mimeType: file.type,
        ...(parentFolder && { parents: [parentFolder] }),
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, name, webViewLink',
    });

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      link: response.data.webViewLink,
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    if (error.code === 401 || error.message?.includes('invalid_credentials')) {
      return NextResponse.json({ error: 'Phiên Drive đã hết hạn. Vui lòng đăng nhập lại.' }, { status: 401 });
    }

    return NextResponse.json({ error: error.message || 'Upload thất bại' }, { status: 500 });
  }
}

export const config = {
  api: { bodyParser: false },
};
