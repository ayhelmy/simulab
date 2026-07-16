import { API_BASE_URL } from './constants';
import { getAccessToken } from './api';

export interface UploadedFile {
  url:      string;
  fileName: string;
  mimeType: string;
  size:     number;
}

export async function uploadLessonFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/files/upload-file`, {
    method:      'POST',
    headers,
    credentials: 'include',
    body:        formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ title: res.statusText, status: res.status }));
    throw err;
  }

  const data = await res.json();
  return data.data as UploadedFile;
}
