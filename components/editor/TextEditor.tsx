'use client';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import CustomEditor from 'ckeditor5-custom-build/build/ckeditor';

import styles from './TextEditor.module.css';

interface TextEditorProps {
  body: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export default function TextEditor({
  body,
  readOnly = false,
  onChange,
}: TextEditorProps) {
  return (
    <div
      className={`${styles.editorWrapper} ${
        readOnly ? styles.readOnly : ''
      }`}
    >
      <CKEditor
        editor={CustomEditor}
        data={body ?? ''}
        disableWatchdog
        onReady={(editor) => {
          const instance = editor as any;

          // Compatible with old custom CKEditor builds.
          if (readOnly) {
            if (typeof instance.enableReadOnlyMode === 'function') {
              instance.enableReadOnlyMode('content-viewer');
            } else {
              instance.isReadOnly = true;
            }
          }
        }}
        onChange={(_, editor) => {
          if (!readOnly) {
            onChange?.(editor.getData());
          }
        }}
        onError={(error, details) => {
          console.error('CKEditor error:', error, details);
        }}
      />
    </div>
  );
}