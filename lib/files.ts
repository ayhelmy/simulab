import { UPLOAD_API_URL } from './constants';
import { authFetch } from './api';

export interface UploadedFile {
  url:      string;
  fileName: string;
  mimeType: string;
  size:     number;
}

export async function uploadLessonFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authFetch(`${UPLOAD_API_URL}/files/upload-file`, {
    method: 'POST',
    body:   formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ title: res.statusText, status: res.status }));
    throw err;
  }

  const data = await res.json();
  return data.data as UploadedFile;
}
